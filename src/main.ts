import { displayError } from "./display-error";
import { generateOverwrites } from "./snowflake/color-generator";
import { createKeyHandler, setCanvasSize } from "./snowflake/handle-input";
import {
  SnowflakeControlConfig,
  SnowflakeVisConfig,
} from "./snowflake/snowflake-config";
import {
  generateParameters,
  SnowflakeAnimationConfig,
  SnowflakeController,
  SnowflakeGeneratorConfig,
} from "./snowflake/snowflake-controller";
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
  samples: 300,
  cameraSettings,
  overwrites: { pathTrace: generateOverwrites() },
};

const controlConfig: SnowflakeControlConfig = {
  growSteps: 20000,
  growStepPerCycle: 10,
  renderStepsPerCycle: 50,
  renderBlendReset: 50,
};

const animationConfig: SnowflakeAnimationConfig = {
  growthPerFrame: 100,
  drawInterval: 200,
  samplesPerFrame: 10,
  samplesPerGrowthCycles: 20,
  blendReset: 10,
};

const simConfig = generateParameters();

const generatorConfig: SnowflakeGeneratorConfig = {
  maxGrowthCycles: 60000,
  preferredMinSnowflakePercentage: 0.3,
  maxSnowflakePercentage: 0.7,
  envChangeChance: 0.2,
  latticeLongRadius: simConfig.latticeLongRadius,
  environmentTransitionStepInterval: 200,
  environmentTransitionSteps: 100,
};

function main(): void {
  const res = Math.min(
    document.documentElement.clientWidth,
    document.documentElement.clientHeight
  );
  visConfig.resolution = [res, res];
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  setCanvasSize(canvas, res);
  let driver: SnowflakeDriver;
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
  const controller = new SnowflakeController(
    driver,
    generatorConfig,
    animationConfig,
    visConfig
  );

  document.addEventListener("keydown", createKeyHandler(controller));

  controller.startAnimation();
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
