import { showModal } from "../modal";
import { SnowflakeController } from "./snowflake-controller";
import { captureCanvas } from "./utils";

export function setCanvasSize(canvas: HTMLElement, resolution: number): void {
  canvas.style.width = `${resolution}px`;
  canvas.style.height = `${resolution}px`;
}

async function setResolution(controller: SnowflakeController): Promise<void> {
  const oldRes = controller.driver.snowflake.visConfig.resolution[0];
  const [success, resStr] = await showModal(
    {
      header: "Set resolution",
      content: `Enter new resolution. Current resolution is ${oldRes}px.`,
    },
    { confirm: true, cancel: true, input: true }
  );
  if (success !== true) {
    return;
  }
  const res = Math.round(Number(resStr));
  if (!isFinite(res) || res <= 0) {
    showModal(
      { header: "Resolution Error", content: "Invalid resolution." },
      { confirm: true },
      ["error"]
    );
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
          controller.draw(controller.driver.snowflake.visConfig.samples);
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
      default:
        break;
    }
  }
  return handleKey;
}
