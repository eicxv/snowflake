import { mat4, vec3 } from "gl-matrix";
import { CameraSettings } from "../webgl/camera/camera";
import { UniformCollection } from "../webgl/program";

export interface SnowflakeVisConfig {
  resolution: [number, number];
  cameraSettings: CameraSettings;
  internalSteps: number;
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
  latticeLongRadius: number; // size of hexagonal lattice
  steps: number; // number of simulation iterations
}

export interface SnowflakeUniformCollection extends UniformCollection {
  u_alpha: number;
  u_beta: number;
  u_theta: number;
  u_gamma: number;
  u_mu: number;
  u_kappa: number;
  u_rho: number;
  u_sigma: number;
  u_latticeTexture: WebGLTexture;
  u_step: number;
  u_viewProjectionMatrix: mat4;
  u_cameraPosition: vec3;
}

export const simConfig1: SnowflakeSimConfig = {
  alpha: 0.6,
  beta: 0.6,
  theta: 0.6,
  gamma: 0.5,
  mu: 0.5,
  kappa: 0.6,
  rho: 1.1,
  sigma: 0,
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
  latticeLongRadius: 501,
  steps: 3000,
};
