import { displayError } from "./display-error";
import { generateOverwrites } from "./snowflake/color-generator";
import { generateParameters } from "./snowflake/generate-parameters";
import { createKeyHandler, setCanvasSize } from "./snowflake/handle-input";
import {
  fernlikeSimConfig,
  SnowflakeAnimationConfig,
  SnowflakeGeneratorConfig,
  SnowflakeVisConfig,
} from "./snowflake/snowflake-config";
import { SnowflakeController } from "./snowflake/snowflake-controller";
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

const animationConfig: SnowflakeAnimationConfig = {
  growthPerFrame: 100,
  drawInterval: 200,
  samplesPerFrame: 5,
  samplesPerGrowthCycles: 20,
  blendReset: 10,
};

const simLatticeRadius = 600;
const sc = fernlikeSimConfig;
sc.latticeLongRadius = simLatticeRadius;
const simConfig = generateParameters(simLatticeRadius);

const visConfig: SnowflakeVisConfig = {
  resolution: [1000, 1000],
  samples: 300,
  cameraSettings,
  overwrites: { pathTrace: generateOverwrites() },
};

// const simConfig = sc;

const generatorConfig: SnowflakeGeneratorConfig = {
  maxGrowthCycles: 80000,
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
    driver = new SnowflakeDriver(canvas, simConfig, visConfig);
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
  // createDataset(driver, 500);
  // testColors();
  controller.startAnimation();
}

main();
