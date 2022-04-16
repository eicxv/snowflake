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
    displayError(err);
    return;
  }

  driver.startAnimation();
}

function displayError(err: unknown): void {
  let message;
  if (err instanceof WebglCreationError) {
    message =
      "Failed to create Webgl2 context. Ensure Webgl2 is supported on this device and browser.";
  } else if (err instanceof ExtensionUnavailableError) {
    message = `Required Webgl extension "${err.extensionName}" is unavailable.`;
  } else {
    throw err;
  }
  const div = document.createElement("div");
  div.classList.add("error");
  const h = document.createElement("h1");
  const p = document.createElement("p");
  h.textContent = "Webgl Error";
  p.textContent = message;
  div.appendChild(h);
  div.appendChild(p);
  document.body.append(div);
}

main();
