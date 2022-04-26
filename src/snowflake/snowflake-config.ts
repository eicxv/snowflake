import { mat4, vec3 } from "gl-matrix";
import { CameraSettings } from "../webgl/camera/camera";
import { Uniforms } from "../webgl/program";

export interface SnowflakeControlConfig {
  growSteps: number;
  growStepPerCycle: number;
  renderStepsPerCycle: number;
  renderBlendReset: number | null;
}

interface Overwrite {
  [key: string]: string;
}

export interface PathTraceOverwrite extends Overwrite {
  GROUND_COL: string;
  GROUND_ACCENT_COL: string;
  HORIZON_COL: string;
  SKY_COL: string;
  LIGHT_1_COL: string;
  LIGHT_2_COL: string;
  LIGHT_3_COL: string;
  LIGHT_1_DIR: string;
  LIGHT_2_DIR: string;
  LIGHT_3_DIR: string;
}

export interface SnowflakeVisConfig {
  resolution: [number, number];
  cameraSettings: CameraSettings;
  overwrites?: {
    pathTrace?: Overwrite;
  };
}

export interface SnowflakeSimConfig {
  alpha: number; // attachment phase;
  beta: number; // attachment phase;
  theta: number; // attachment phase;
  gamma: number; // melting phase; amount of ice that transforms into vapor
  mu: number; // melting phase; amount of water that transforms into vapor
  kappa: number; // freezing phase; amount of vapor which freezes
  rho: number; // initial vapor density
  sigma: number; // noise phase; size of perturbation in vapor density
  nu: number; // environment change; vapor multiplier d' = d * nu
  latticeLongRadius: number; // size of hexagonal lattice
  steps: number; // number of simulation iterations
}

export interface SnowflakeSimulationUniforms extends Uniforms {
  u_alpha: number;
  u_beta: number;
  u_theta: number;
  u_gamma: number;
  u_mu: number;
  u_kappa: number;
  u_rho: number;
  u_sigma: number;
  u_nu: number;
  u_latticeTexture: WebGLTexture;
}

export interface SnowflakeRenderUniforms extends Uniforms {
  u_normalTexture: WebGLTexture;
  u_renderTexture: WebGLTexture;
  u_blend: number;
  u_seed: number;
  u_viewProjectionMatrix: mat4;
  u_cameraPosition: vec3;
}

export interface SnowflakeUniforms
  extends SnowflakeSimulationUniforms,
    SnowflakeRenderUniforms {}

export const simConfigTest: SnowflakeSimConfig = {
  alpha: 0.6,
  beta: 0.6,
  theta: 0.6,
  gamma: 0.5,
  mu: 0.5,
  kappa: 0.6,
  rho: 1.1,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 500,
};

export const fig9aSimConfig: SnowflakeSimConfig = {
  alpha: 0.08,
  beta: 1.3,
  theta: 0.025,
  gamma: 0.00005,
  mu: 0.07,
  kappa: 0.003,
  rho: 0.4,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 1000,
};

export const fig9fSimConfig: SnowflakeSimConfig = {
  alpha: 0.08,
  beta: 1.3,
  theta: 0.025,
  gamma: 0.00005,
  mu: 0.07,
  kappa: 0.003,
  rho: 0.5,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 200,
};

export const fig13rSimConfig: SnowflakeSimConfig = {
  rho: 0.38,
  beta: 1.06,
  alpha: 0.35,
  theta: 0.112,
  kappa: 0.001,
  mu: 0.14,
  gamma: 0.0006,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 2000,
};

export const fig12eSimConfig: SnowflakeSimConfig = {
  rho: 0.5,
  beta: 1.4,
  alpha: 0.1,
  theta: 0.005,
  kappa: 0.001,
  mu: 0.08,
  gamma: 0.001,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 2000,
};

export const fig12bSimConfig: SnowflakeSimConfig = {
  rho: 0.5,
  beta: 1.4,
  alpha: 0.1,
  theta: 0.005,
  kappa: 0.001,
  mu: 0.05,
  gamma: 0.001,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 2000,
};

export const stellarDendriteSimConfig: SnowflakeSimConfig = {
  alpha: 0.004,
  beta: 2.6,
  theta: 0.001,
  gamma: 0.0001,
  mu: 0.015,
  kappa: 0.05,
  rho: 0.8,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 701,
  steps: 6000,
};

export const fernlikeSimConfig: SnowflakeSimConfig = {
  rho: 0.635,
  beta: 1.6,
  alpha: 0.4,
  theta: 0.025,
  kappa: 0.005,
  mu: 0.015,
  gamma: 0.0005,
  sigma: 0,
  nu: 1,
  latticeLongRadius: 500,
  steps: 3000,
};

export const simConfig1: SnowflakeSimConfig = {
  rho: 0.5934344539732039,
  beta: 2.915609902656133,
  alpha: 0.11532603293734048,
  theta: 0.00583162496033111,
  kappa: 0.007113783429047876,
  mu: 0.004333346218203709,
  gamma: 0.023478737095792998,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};

export const simConfig2: SnowflakeSimConfig = {
  rho: 0.4213644487748788,
  beta: 1.2656859866034518,
  alpha: 0.29432878020626185,
  theta: 0.0226881384355826,
  kappa: 0.00872056377254199,
  mu: 0.011523017975750192,
  gamma: 0.05689121117213143,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};
export const simConfig3: SnowflakeSimConfig = {
  rho: 0.36071620723433573,
  beta: 1.2205710964072565,
  alpha: 0.21079138721996946,
  theta: 0.004691318527594396,
  kappa: 0.03875121287944539,
  mu: 0.008136751756115952,
  gamma: 0.004327283329103165,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};
export const simConfig4: SnowflakeSimConfig = {
  rho: 0.7491571008236687,
  beta: 1.0861494664211249,
  alpha: 0.1895179069622896,
  theta: 0.008870506957686642,
  kappa: 0.01703591651457782,
  mu: 0.005984436185237061,
  gamma: 0.015600386596224114,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};
export const simConfig5: SnowflakeSimConfig = {
  rho: 0.6736232574188961,
  beta: 1.2111203504541375,
  alpha: 0.18620504466225213,
  theta: 0.0049700532318310495,
  kappa: 0.04236552407097272,
  mu: 0.020961369207758228,
  gamma: 0.040810599314806184,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};
export const simConfig6: SnowflakeSimConfig = {
  rho: 0.5469315950426725,
  beta: 1.190897874342057,
  alpha: 0.09075499130757532,
  theta: 0.003285116129558605,
  kappa: 0.047474920322680296,
  mu: 0.07895006512907925,
  gamma: 0.002619350913804444,
  sigma: 0,
  nu: 1,
  steps: 4000,
  latticeLongRadius: 600,
};
