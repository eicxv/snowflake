import { mat4, vec3 } from "gl-matrix";
import { showError } from "./modal";
import { generateOverwrites } from "./snowflake/color-generator";
import { features } from "./snowflake/features";
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
import { random } from "./snowflake/utils";
import { ExtensionUnavailableError, WebglCreationError } from "./webgl/errors";

const position = [0, 0, 600] as vec3;
const target = [0, 0, 0] as vec3;
const up = [0, 1, 0] as vec3;
const viewMatrix = mat4.lookAt(mat4.create(), position, target, up);

const animationConfig: SnowflakeAnimationConfig = {
  growthPerFrame: 100,
  drawInterval: 200,
  samplesPerFrame: 5,
  samplesPerInterval: 20,
  blendReset: 10,
};

const simLatticeRadius = 600;
const sc = fernlikeSimConfig;
sc.latticeLongRadius = simLatticeRadius;
const simConfig = generateParameters(simLatticeRadius);

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

features.setFeature(
  "Environment",
  generatorConfig.dynamicEnvironment ? "Dynamic" : "Static"
);
features.registerFeatures();

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
      showError(err);
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

  if (window.isFxpreview) {
    controller.runHeadless();
  } else {
    document.addEventListener("keydown", createKeyHandler(controller));
    controller.run();
  }
}

main();
