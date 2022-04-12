import {
  fernlikeSimConfig,
  SnowflakeControlConfig,
  SnowflakeVisConfig,
} from "./snowflake/snowflake-config";
import { SnowflakeDriver } from "./snowflake/snowflake-driver";
import { CameraSettings } from "./webgl/camera/camera";

const cameraSettings: CameraSettings = {
  position: [1, 0, 0],
  target: [0, 0, 0],
  fov: Math.PI / 2,
  near: 0.01,
  far: 100,
  up: [0, 1, 0],
};

const visConfig: SnowflakeVisConfig = {
  resolution: [300, 300],
  cameraSettings,
};

const controlConfig: SnowflakeControlConfig = {
  growSteps: 3000,
  growStepPerCycle: 5,
  renderStepsPerCycle: 50,
  renderBlendReset: 0,
};

const simConfig = fernlikeSimConfig;

function main(): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const driver = new SnowflakeDriver(
    canvas,
    controlConfig,
    simConfig,
    visConfig
  );

  driver.startAnimation();
}

main();
