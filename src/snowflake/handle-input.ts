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
  const fileName = `snowflake-${res}px.png`;
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
          controller.queueDraw(300);
          controller.startAnimation();
        }
        break;
      case "q":
        controller.queueDraw(300);
        controller.startAnimation();
        break;
      case "s":
        saveImage(controller);
        break;
      case "f":
        controller.animateGrowth = !controller.animateGrowth;
        break;
      case "v":
        controller.driver.snowflake.visualize();
      default:
        break;
    }
  }
  return handleKey;
}
