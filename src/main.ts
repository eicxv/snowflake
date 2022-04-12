import {
  fernlikeSimConfig,
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

const simConfig = fernlikeSimConfig;

function main(): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const driver = new SnowflakeDriver(canvas, simConfig, visConfig);

  const [width, height] = visConfig.resolution;
  const gl = driver.gl;
  gl.canvas.width = width;
  gl.canvas.height = height;

  const sf = driver.snowflake;
  sf.grow(3000);
  sf.interpolate();
  sf.pathTrace(100);
  sf.display();
}

main();
