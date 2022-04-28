import {
  SnowflakeAnimationConfig,
  SnowflakeGeneratorConfig,
  SnowflakeSimConfig,
  SnowflakeUniforms,
  SnowflakeVisConfig,
} from "./snowflake-config";
import { SnowflakeDriver } from "./snowflake-driver";

interface Event {
  time: number;
  run: () => void;
  active: boolean;
}

function geometricInterp(a: number, b: number, t: number): number {
  return a * Math.pow(b / a, t);
}

function linearInterp(a: number, b: number, t: number): number {
  return a * (1 - t) + t * b;
}

class DrawEvent implements Event {
  controller: SnowflakeController;
  time: number;
  active = true;
  aniConfig: SnowflakeAnimationConfig;

  constructor(
    controller: SnowflakeController,
    aniConfig: SnowflakeAnimationConfig
  ) {
    this.controller = controller;
    this.time = 0;
    this.aniConfig = aniConfig;
  }

  run(): void {
    this.time += this.aniConfig.drawInterval;
    if (!this.controller.animateGrowth) {
      return;
    }
    const sf = this.controller.driver.snowflake;
    sf.renderStep = Math.min(this.aniConfig.blendReset, sf.renderStep);
    this.controller.queueDraw(this.aniConfig.samplesPerGrowthCycles);
  }
}

class GrowthEvent implements Event {
  controller: SnowflakeController;
  time: number;
  interval: number;
  active = true;

  constructor(controller: SnowflakeController, interval: number) {
    this.controller = controller;
    this.time = 0;
    this.interval = interval;
  }

  run(): void {
    this.time += this.interval;
    const radius = this.controller.driver.getRadius();
    const time = this.controller.driver.growthCount;
    console.log(radius);
    if (radius > this.controller.maxRadius || time >= this.controller.maxTime) {
      this.controller.finalRender();
      this.active = false;
    }
  }
}

class EnvironmentChangeEvent implements Event {
  controller: SnowflakeController;
  time: number;
  interval: number;
  stepInterval: number;
  active = true;
  mu: number;
  private step = 0;
  private transisitionSteps;
  private targetConfig: SnowflakeSimConfig | null = null;

  constructor(
    controller: SnowflakeController,
    genConfig: SnowflakeGeneratorConfig
  ) {
    this.controller = controller;
    this.interval = 10000;
    this.time = this.interval;
    this.stepInterval = genConfig.environmentTransitionStepInterval;
    this.transisitionSteps = genConfig.environmentTransitionSteps;
    this.mu = Math.pow(1.7, 1 / this.transisitionSteps);
  }

  run(): void {
    this.time += this.stepInterval;
    if (this.targetConfig === null) {
      this.targetConfig = generateParameters();
      this.removeZeros(this.targetConfig, this.controller.driver.uniforms);
      this.step = this.transisitionSteps;
    }
    this.interpolateUniforms(
      this.targetConfig,
      this.controller.driver.uniforms,
      this.step,
      this.transisitionSteps
    );
    // this.controller.driver.uniforms.u_mu = this.mu;
    // this.controller.driver.snowflake.environmentChange();

    this.step -= 1;
    if (this.step === 0) {
      this.targetConfig = null;
      this.time += this.interval;
    }
  }

  private removeZeros(
    params: SnowflakeSimConfig,
    uniforms: SnowflakeUniforms
  ): void {
    params.alpha = Math.max(params.alpha, 0.0001);
    params.theta = Math.max(params.theta, 0.0001);
    params.kappa = Math.max(params.kappa, 0.0001);
    params.mu = Math.max(params.mu, 0.0001);
    params.gamma = Math.max(params.gamma, 0.0001);
    uniforms.u_alpha = Math.max(uniforms.u_alpha, 0.0001);
    uniforms.u_theta = Math.max(uniforms.u_theta, 0.0001);
    uniforms.u_kappa = Math.max(uniforms.u_kappa, 0.0001);
    uniforms.u_mu = Math.max(uniforms.u_mu, 0.0001);
    uniforms.u_gamma = Math.max(uniforms.u_gamma, 0.0001);
  }

  private interpolateUniforms(
    params: SnowflakeSimConfig,
    uniforms: SnowflakeUniforms,
    step: number,
    totalSteps: number
  ): void {
    const t = step / totalSteps;
    uniforms.u_rho = linearInterp(params.rho, uniforms.u_rho, t);
    uniforms.u_beta = linearInterp(params.beta, uniforms.u_beta, t);
    uniforms.u_alpha = geometricInterp(params.alpha, uniforms.u_alpha, t);
    uniforms.u_theta = geometricInterp(params.theta, uniforms.u_theta, t);
    uniforms.u_kappa = geometricInterp(params.kappa, uniforms.u_kappa, t);
    uniforms.u_mu = geometricInterp(params.mu, uniforms.u_mu, t);
    uniforms.u_gamma = geometricInterp(params.gamma, uniforms.u_gamma, t);
  }
}

export class SnowflakeController {
  driver: SnowflakeDriver;
  maxTime: number;
  maxRadius: number;
  minRadius: number;
  events: Event[];
  interpolated = false;
  terminate = false;
  finalRenderSamples: number;
  queue: { grow: number; draw: number; event: Event | null };
  aniConfig: SnowflakeAnimationConfig;
  animating = false;
  animateGrowth = true;
  private prevRadius = [
    { t: 0, r: 0 },
    { t: 0, r: 0 },
  ];

  constructor(
    driver: SnowflakeDriver,
    config: SnowflakeGeneratorConfig,
    aniConfig: SnowflakeAnimationConfig,
    visConfig: SnowflakeVisConfig
  ) {
    this.driver = driver;
    this.maxTime = config.maxGrowthCycles;
    this.aniConfig = aniConfig;
    this.finalRenderSamples = visConfig.samples;
    this.maxRadius = Math.floor(
      config.maxSnowflakePercentage * config.latticeLongRadius
    );
    this.minRadius = Math.ceil(
      config.preferredMinSnowflakePercentage * config.latticeLongRadius
    );
    this.events = [
      new DrawEvent(this, this.aniConfig),
      new GrowthEvent(this, 5000),
      new EnvironmentChangeEvent(this, config),
    ];
    this.queue = { grow: 0, draw: 0, event: null };
    this.animate = this.animate.bind(this);
  }

  removeEvent(event: Event): void {
    const index = this.events.indexOf(event);
    this.events.splice(index, 1);
  }

  addEvent(event: Event): void {
    this.events.push(event);
  }

  finalRender(): void {
    const sf = this.driver.snowflake;
    sf.renderStep = 0;
    this.queueDraw(this.finalRenderSamples);
    this.terminate = true;
  }

  private getRadius(): { r: number; t: number } {
    const r = this.driver.getRadius();
    const t = this.driver.growthCount;
    const entry = { r, t };
    this.prevRadius.pop();
    this.prevRadius.unshift(entry);
    return entry;
  }

  private getGrowthRate(): number {
    const [e1, e0] = this.prevRadius;
    const dr = (e1.r - e0.r) / (e1.t - e0.t);
    return dr;
  }

  queueGrowth(cycles: number): void {
    this.queue.grow += cycles;
  }

  queueDraw(cycles: number): void {
    this.queue.draw += cycles;
  }

  queueEvent(event: Event): void {
    this.queue.event = event;
  }

  private getNextEvent(events: Event[]): Event {
    const nextEvent = events.reduce(
      (prev, curr) => (curr.active && prev.time > curr.time ? curr : prev),
      { time: Infinity, run: () => false, active: false }
    );
    return nextEvent;
  }

  render(): void {
    this.driver.snowflake.interpolate();
    this.driver.snowflake.renderStep = 10;
    this.driver.snowflake.pathTrace(1000);
    this.driver.snowflake.display();
  }

  runNextEvent(): void {
    const time = this.driver.growthCount;
    const nextEvent = this.getNextEvent(this.events);
    if (!nextEvent.active) {
      return;
    }
    this.queueGrowth(nextEvent.time - time);
    this.queueEvent(nextEvent);
  }

  startAnimation(): void {
    if (this.animating) {
      return;
    }
    this.animating = true;
    this.animate();
  }

  animate(): void {
    if (this.queue.grow > 0) {
      const cycles = Math.min(this.queue.grow, this.aniConfig.growthPerFrame);
      this.queue.grow -= cycles;
      this.driver.snowflake.grow(cycles);
      this.interpolated = false;
      requestAnimationFrame(this.animate);
      return;
    }
    if (this.queue.draw > 0) {
      const cycles = Math.min(this.queue.draw, this.aniConfig.samplesPerFrame);
      this.queue.draw -= cycles;
      if (!this.interpolated) {
        this.driver.snowflake.interpolate();
        this.interpolated = true;
      }
      this.driver.snowflake.pathTrace(cycles);
      this.driver.snowflake.display();
      requestAnimationFrame(this.animate);
      return;
    }
    if (this.queue.event) {
      this.queue.event.run();
      this.queue.event = null;
      requestAnimationFrame(this.animate);
      return;
    }
    if (!this.terminate) {
      this.runNextEvent();
      requestAnimationFrame(this.animate);
    }
    this.animating = false;
  }

  currentGrowth(): { radius: number; time: number; growthRate: number } {
    const { r, t } = this.getRadius();
    const dr = this.getGrowthRate();
    return { radius: r, time: t, growthRate: dr };
  }
}

function uniform(a = 0, b = 1): () => number {
  return () => Math.random() * (b - a) + a;
}

function expone(a: number, b: number): () => number {
  return () => a * Math.exp(-b * Math.random());
}

const gRho = uniform(0.45, 0.8);
const gBeta = uniform(1.06, 3.2);
const gAlpha = expone(0.6, 2);
const gTheta = expone(0.12, 4);
const gKappa = expone(0.15, 4);
const gMu = expone(0.15, 4);
const gGamma = expone(0.1, 4);

export function generateParameters(
  latticeLongRadius = 500
): SnowflakeSimConfig {
  return {
    rho: gRho(),
    beta: gBeta(),
    alpha: gAlpha(),
    theta: gTheta(),
    kappa: gKappa(),
    mu: gMu(),
    gamma: gGamma(),
    sigma: 0,
    nu: 1,
    latticeLongRadius,
  };
}
