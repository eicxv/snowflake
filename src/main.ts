import { displayError } from "./display-error";
import { generateOverwrites } from "./snowflake/color-generator";
import {
  fernlikeSimConfig,
  SnowflakeControlConfig,
  SnowflakeVisConfig,
} from "./snowflake/snowflake-config";
import { SnowflakeDriver } from "./snowflake/snowflake-driver";
import { CameraSettings } from "./webgl/camera/camera";
import { ExtensionUnavailableError, WebglCreationError } from "./webgl/errors";

const cameraSettings: CameraSettings = {
  position: [1, 0, 0],
  target: [0, 0, 0],
  fov: Math.PI / 2,
  near: 0.01,
  far: 100,
  up: [0, 1, 0],
};

const visConfig: SnowflakeVisConfig = {
  resolution: [1000, 1000],
  cameraSettings,
  overwrites: { pathTrace: generateOverwrites() },
};

const controlConfig: SnowflakeControlConfig = {
  growSteps: 2000,
  growStepPerCycle: 10,
  renderStepsPerCycle: 50,
  renderBlendReset: 50,
};

const simConfig = fernlikeSimConfig;

function main(): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  let driver;
  try {
    driver = new SnowflakeDriver(canvas, controlConfig, simConfig, visConfig);
  } catch (err) {
    if (
      err instanceof WebglCreationError ||
      err instanceof ExtensionUnavailableError
    ) {
      displayError(err);
    } else {
      throw err;
    }
    return;
  }

  rndr(driver);
}

function rndr(driver: SnowflakeDriver): void {
  const sf = driver.snowflake;
  sf.grow(10000);
  sf.interpolate();
  sf.pathTrace(300);
  sf.display();
  // sf.visualize();
}

main();
