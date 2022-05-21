import { generateParameters } from "./generate-parameters";
import {
  SnowflakeAnimationConfig,
  SnowflakeGeneratorConfig,
  SnowflakeSimConfig,
  SnowflakeUniforms,
  SnowflakeVisConfig,
} from "./snowflake-config";
import { SnowflakeDriver } from "./snowflake-driver";

interface QueueItem {
  priority: number;
}

class Queue<T extends QueueItem> {
  // Naive implementation, faster for short queues compared to advanced structures
  items: Array<T>;

  constructor() {
    this.items = [];
  }

  enqueue(item: T): void {
    const index = this.items.findIndex((e) => e.priority < item.priority);
    if (index === -1) {
      this.items.push(item);
    } else {
      this.items.splice(index, 0, item);
    }
  }

  dequeue(): T | undefined {
    return this.items.pop();
  }
}

abstract class Event implements QueueItem {
  controller: SnowflakeController;
  priority: number;

  constructor(controller: SnowflakeController, time = 0) {
    this.controller = controller;
    this.priority = time;
  }

  abstract run(): void;
}

class GrowthControlEvent extends Event {
  maxInterval = 5000;
  constructor(controller: SnowflakeController) {
    super(controller);
  }

  run(): void {
    const { radius, time, growthRate } = this.controller.updateGrowth();
    if (this.checkEndGrowth(radius, time)) {
      return;
    }
    this.schedule(radius, time, growthRate);
  }

  private checkEndGrowth(radius: number, time: number): boolean {
    if (
      radius >= this.controller.maxRadius ||
      time >= this.controller.maxTime
    ) {
      this.controller.finish();
      return true;
    }
    return false;
  }

  schedule(radius: number, time: number, growthRate: number): void {
    const dist = this.controller.maxRadius - radius;
    const remainingTime = this.controller.maxTime - time;
    if (!isFinite(growthRate)) {
      this.priority += Math.min(dist * 5 + 20, this.maxInterval, remainingTime);
      return;
    }
    let estTime = Math.ceil(dist / growthRate);
    if (this.controller.dynamicEnv) {
      estTime = Math.min(dist * 5 + 20, estTime);
    }
    const nextInterval = Math.max(dist, estTime);
    this.priority += Math.min(nextInterval, this.maxInterval, remainingTime);
  }
}

class EnvironmentChangeEvent extends Event {
  stepInterval: number;
  private step = 0;
  private transisitionSteps;
  private targetConfig: SnowflakeSimConfig | null = null;

  constructor(
    controller: SnowflakeController,
    genConfig: SnowflakeGeneratorConfig
  ) {
    super(controller);
    this.stepInterval = genConfig.environmentTransitionStepInterval;
    this.transisitionSteps = genConfig.environmentTransitionSteps;
  }

  schedule(growthRate: number): void {
    if (isFinite(growthRate)) {
      this.priority += Math.max(
        Math.min(Math.ceil(1 / growthRate), this.stepInterval),
        20
      );
    } else {
      this.priority += Math.round(this.stepInterval / 2);
    }
  }

  private initChange(): void {
    this.targetConfig = generateParameters();
    removeZeros(this.targetConfig, this.controller.driver.uniforms);
    this.step = this.transisitionSteps;
  }

  private changeEnvironment(): void {
    incrementalUniformInterp(
      this.targetConfig!,
      this.controller.driver.uniforms,
      this.step,
      this.transisitionSteps
    );

    this.step -= 1;
  }

  private endChange(): void {
    this.targetConfig = null;
  }

  run(): void {
    if (this.targetConfig === null) {
      this.initChange();
    }

    this.changeEnvironment();

    if (this.step === 0) {
      this.endChange();
    }

    const growthRate = this.controller.growth.growthRate;
    this.schedule(growthRate);
  }
}

export class SnowflakeController {
  driver: SnowflakeDriver;
  maxTime: number;
  maxRadius: number;
  envChangeRadius: number;
  interpolated = false;
  terminate = false;
  finalRenderSamples: number;
  actions: { grow: number; draw: number; event: Event | null };
  queue: Queue<Event>;
  aniConfig: SnowflakeAnimationConfig;
  animating = false;
  animateGrowth = true;
  drawCount: number;
  growth: { time: number; radius: number; growthRate: number };
  simpleVis = false;
  dynamicEnv: boolean;
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
    this.drawCount = aniConfig.drawInterval;
    this.maxTime = config.maxGrowthCycles;
    this.aniConfig = aniConfig;
    this.finalRenderSamples = visConfig.samples;
    this.maxRadius = Math.floor(
      config.maxPercentage * config.latticeLongRadius
    );
    this.envChangeRadius = Math.ceil(
      config.environmentChangePercentage * config.latticeLongRadius
    );
    this.queue = new Queue();
    this.queue.enqueue(new GrowthControlEvent(this));
    this.dynamicEnv = config.dynamicEnvironment;

    if (this.dynamicEnv) {
      this.queue.enqueue(new EnvironmentChangeEvent(this, config));
    }

    this.actions = { grow: 0, draw: 0, event: null };
    this.growth = { time: 0, radius: 0, growthRate: 0 };
  }

  toggleVis(): void {
    this.simpleVis = !this.simpleVis;
  }

  async finish(): Promise<void> {
    this.terminate = true;
    const sf = this.driver.snowflake;
    sf.renderStep = 0;
    sf.updateNormalBlend();
    await this.draw(this.finalRenderSamples);
    if (window.isFxpreview) {
      window.fxpreview();
    }
  }

  private getRadius(): { r: number; t: number } {
    const r = this.driver.getRadius();
    const t = this.driver.growthCount;
    const entry = { r, t };
    this.prevRadius.pop();
    this.prevRadius.unshift(entry);
    return entry;
  }

  runHeadless(): void {
    let time = this.driver.growthCount;
    const sf = this.driver.snowflake;
    while (!this.terminate && sf.growthCount < this.maxTime) {
      const e = this.queue.dequeue();
      if (e == null) {
        break;
      }
      this.queue.enqueue(e);
      time = sf.growthCount;
      const nextTime = e.priority;
      sf.grow(nextTime - time);
      e.run();
    }
  }

  async run(): Promise<void> {
    let time = this.driver.growthCount;
    while (!this.terminate && this.driver.growthCount < this.maxTime) {
      const e = this.queue.dequeue();
      if (e == null) {
        break;
      }
      this.queue.enqueue(e);
      time = this.driver.growthCount;
      const nextTime = e.priority;
      await this.growAndDraw(nextTime - time);
      e.run();
    }
  }

  latticeChaged(): void {
    this.interpolated = false;
  }

  async growAndDraw(n: number): Promise<void> {
    const samplesPerInterval = this.aniConfig.samplesPerInterval;
    const drawInterval = this.aniConfig.drawInterval;
    let drawCount = this.drawCount;

    while (n > 0) {
      const cycles = Math.min(n, drawCount);
      n -= cycles;
      await this.grow(cycles);
      drawCount -= cycles;
      if (drawCount == 0) {
        drawCount = drawInterval;
        if (this.simpleVis) {
          this.visualize();
        } else {
          await this.draw(samplesPerInterval, true);
        }
      }
    }
    this.drawCount = drawCount;
  }

  async grow(n: number): Promise<void> {
    const growthPerFrame = this.aniConfig.growthPerFrame;

    while (n > 0) {
      const cycles = Math.min(n, growthPerFrame);
      n -= cycles;
      this.driver.snowflake.grow(cycles);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    this.latticeChaged();
  }

  visualize(): void {
    this.driver.snowflake.visualize();
  }

  async draw(n: number, resetBlend = false): Promise<void> {
    const sf = this.driver.snowflake;
    if (resetBlend) {
      sf.renderStep = Math.min(this.aniConfig.blendReset, sf.renderStep);
    }
    if (!this.interpolated) {
      sf.interpolate();
      this.interpolated = true;
    }
    const samplesPerFrame = this.aniConfig.samplesPerFrame;
    while (n > 0) {
      const cycles = Math.min(n, samplesPerFrame);
      n -= cycles;
      sf.pathTrace(cycles);
      sf.display();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  private getGrowthRate(): number {
    const [e1, e0] = this.prevRadius;
    const dr = (e1.r - e0.r) / (e1.t - e0.t);
    return dr;
  }

  updateGrowth(): { radius: number; time: number; growthRate: number } {
    const { r, t } = this.getRadius();
    const dr = this.getGrowthRate();
    this.growth = { radius: r, time: t, growthRate: dr };
    return this.growth;
  }
}

function geometricInterp(a: number, b: number, t: number): number {
  return a * Math.pow(b / a, t);
}

function linearInterp(a: number, b: number, t: number): number {
  return a * (1 - t) + t * b;
}

function removeZeros(
  params: SnowflakeSimConfig,
  uniforms: SnowflakeUniforms
): void {
  params.alpha = Math.max(params.alpha, 0.000001);
  params.theta = Math.max(params.theta, 0.000001);
  params.kappa = Math.max(params.kappa, 0.000001);
  params.mu = Math.max(params.mu, 0.000001);
  params.gamma = Math.max(params.gamma, 0.000001);
  uniforms.u_alpha = Math.max(uniforms.u_alpha, 0.000001);
  uniforms.u_theta = Math.max(uniforms.u_theta, 0.000001);
  uniforms.u_kappa = Math.max(uniforms.u_kappa, 0.000001);
  uniforms.u_mu = Math.max(uniforms.u_mu, 0.000001);
  uniforms.u_gamma = Math.max(uniforms.u_gamma, 0.000001);
}

function incrementalUniformInterp(
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
