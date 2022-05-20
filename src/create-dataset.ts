import { mat4, vec3 } from "gl-matrix";
import { generateOverwrites } from "./snowflake/color-generator";
import { generateParameters } from "./snowflake/generate-parameters";
import {
  SnowflakeAnimationConfig,
  SnowflakeGeneratorConfig,
  SnowflakeSimConfig,
  SnowflakeVisConfig,
} from "./snowflake/snowflake-config";
import { SnowflakeController } from "./snowflake/snowflake-controller";
import { SnowflakeDriver } from "./snowflake/snowflake-driver";
import { SnowflakeSimulator } from "./snowflake/snowflake-simulator";
import { random } from "./snowflake/utils";

interface Dataset {
  features: number[][];
  labels: boolean[];
}

export function createDataset(driver: SnowflakeDriver, n: number): void {
  const dataset: Dataset = { features: [], labels: [] };
  addDataSet(dataset, driver, 0, n);
}

function addDataSet(
  dataset: Dataset,
  driver: SnowflakeDriver,
  i: number,
  n: number
): void {
  console.log("iteration", i, n);
  const simLatticeRadius = 700;
  const simConfig = generateParameters(simLatticeRadius, false);
  dataset.features.push([
    simConfig.alpha,
    simConfig.beta,
    simConfig.theta,
    simConfig.gamma,
    simConfig.mu,
    simConfig.kappa,
    simConfig.rho,
  ]);
  const isHex = testConfig(simConfig, driver);
  dataset.labels.push(isHex);
  i++;
  if (i < n) {
    setTimeout(() => {
      addDataSet(dataset, driver, i, n);
    }, 300);
  } else {
    saveDataset(dataset, "dataset.json");
    location.reload();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveDataset(data: any, fileName: string): void {
  const a = document.createElement("a");
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

function testConfig(
  simConfig: SnowflakeSimConfig,
  driver: SnowflakeDriver
): boolean {
  const sf = driver.snowflake;
  sf.uniforms.u_alpha = simConfig.alpha;
  sf.uniforms.u_beta = simConfig.beta;
  sf.uniforms.u_theta = simConfig.theta;
  sf.uniforms.u_gamma = simConfig.gamma;
  sf.uniforms.u_mu = simConfig.mu;
  sf.uniforms.u_kappa = simConfig.kappa;
  sf.uniforms.u_rho = simConfig.rho;
  sf.resetLattice();
  sf.grow(10000);

  const isHex = isHexagon(sf);
  return isHex;
}

export function isHexagon(snowflake: SnowflakeSimulator): boolean {
  const sf = snowflake;
  const radius = sf.getSnowflakeRadius();
  const buffer = getColumn(sf, Math.floor(radius * 0.96));
  for (let i = 0; i < buffer.length; i += 4) {
    if (buffer[i] < 0.5) {
      return false;
    }
  }
  return true;
}

function getColumn(
  snowflake: SnowflakeSimulator,
  radius: number
): Float32Array {
  const sf = snowflake;
  const gl = sf.gl;
  const framebuffer = sf.variables.lattice.getFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const buffer = new Float32Array(4 * Math.ceil(radius / 2));
  gl.readPixels(radius, 0, 1, Math.ceil(radius / 2), gl.RGBA, gl.FLOAT, buffer);
  return buffer;
}

type Data = {
  mass: number;
  radius: number;
  time: number;
  area: number;
  boundary: number;
};
type Stats = { data: Array<Data> };

const animationConfig: SnowflakeAnimationConfig = {
  growthPerFrame: 100,
  drawInterval: 200,
  samplesPerFrame: 5,
  samplesPerInterval: 20,
  blendReset: 10,
};

const simLatticeRadius = 600;
const simConfig = generateParameters(simLatticeRadius);

const position = [0, 0, 600] as vec3;
const target = [0, 0, 0] as vec3;
const up = [0, 1, 0] as vec3;
const viewMatrix = mat4.lookAt(mat4.create(), position, target, up);

const visConfig: SnowflakeVisConfig = {
  resolution: [1000, 1000],
  samples: 300,
  viewMatrix,
  cameraPosition: position,
  overwrites: { pathTrace: generateOverwrites() },
};

const dynamicEnvironmentChance = 0.1;

const generatorConfig: SnowflakeGeneratorConfig = {
  maxGrowthCycles: 80000,
  environmentChangePercentage: 0.7,
  maxPercentage: 0.7,
  dynamicEnvironment: random() < dynamicEnvironmentChance,
  latticeLongRadius: simConfig.latticeLongRadius,
  environmentTransitionStepInterval: 100,
  environmentTransitionSteps: 100,
};

export function createStats(driver: SnowflakeDriver, n: number): void {
  const dataset: Stats = { data: [] };
  addStats(dataset, driver, 0, n);
}

function addStats(
  stats: Stats,
  driver: SnowflakeDriver,
  i: number,
  n: number
): void {
  console.log("iteration", i, n);
  const data = getStats(driver);
  stats.data.push(data);
  i++;
  if (i < n) {
    setTimeout(() => {
      addStats(stats, driver, i, n);
    }, 300);
  } else {
    saveDataset(stats, "stats.json");
    location.reload();
  }
}

function getStats(driver: SnowflakeDriver): Data {
  const sf = driver.snowflake;
  const simConfig = generateParameters(simLatticeRadius);
  sf.uniforms.u_alpha = simConfig.alpha;
  sf.uniforms.u_beta = simConfig.beta;
  sf.uniforms.u_theta = simConfig.theta;
  sf.uniforms.u_gamma = simConfig.gamma;
  sf.uniforms.u_mu = simConfig.mu;
  sf.uniforms.u_kappa = simConfig.kappa;
  sf.uniforms.u_rho = simConfig.rho;
  sf.resetLattice();
  sf.growthCount = 0;
  generatorConfig.dynamicEnvironment = random() < dynamicEnvironmentChance;
  const controller = new SnowflakeController(
    driver,
    generatorConfig,
    animationConfig,
    visConfig
  );
  controller.runHeadless();
  const { boundaryLength, area, mass, radius, time } = sf.stats();
  const data = {
    mass: Math.round(mass),
    area,
    radius,
    time,
    boundary: boundaryLength,
  };
  console.log(data);
  driver.snowflake.visualize();
  return data;
}
