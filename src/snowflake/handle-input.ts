import { SnowflakeController } from "./snowflake-controller";
import { captureCanvas } from "./utils";

export function setCanvasSize(canvas: HTMLElement, resolution: number): void {
  canvas.style.width = `${resolution}px`;
  canvas.style.height = `${resolution}px`;
}

function setResolution(controller: SnowflakeController): void {
  const oldRes = controller.driver.snowflake.visConfig.resolution[0];
  const res = Math.round(Number(prompt("Enter resolution", oldRes.toString())));
  if (!isFinite(res) || res <= 0) {
    alert("Invalid resolution");
    return;
  }
  setCanvasSize(controller.driver.gl.canvas, res);
  controller.driver.snowflake.changeResolution(res);
  controller.interpolated = false;
  controller.driver.snowflake.renderStep = 0;
}

function saveImage(controller: SnowflakeController): void {
  controller.driver.snowflake.display();
  const canvas = controller.driver.gl.canvas;
  const res = controller.driver.snowflake.visConfig.resolution[0];
  const fileName = `snowflake-${window.fxhash}-${res}px.png`;
  captureCanvas(canvas, fileName);
}

export function createKeyHandler(
  controller: SnowflakeController
): (e: KeyboardEvent) => void {
  function handleKey(e: KeyboardEvent): void {
    switch (e.key) {
      case "r":
        setResolution(controller);
        if (!controller.animating) {
          controller.draw(2);
        }
        break;
      case "q":
        controller.draw(controller.driver.snowflake.visConfig.samples);
        break;
      case "w":
        controller.draw(1);
        break;
      case "s":
        saveImage(controller);
        break;
      case "f":
        controller.toggleVis();
        break;
      case "v":
        controller.driver.snowflake.visualize();
        break;
      case "d":
        controller.finish();
        break;
      case "n":
        controller.driver.snowflake.displayTest();
        break;
      default:
        break;
    }
  }
  return handleKey;
}
