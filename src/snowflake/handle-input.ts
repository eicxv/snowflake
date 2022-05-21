import { showModal } from "../modal";
import { features } from "./features";
import { SnowflakeController } from "./snowflake-controller";
import { SnowflakeRenderer } from "./snowflake-renderer";
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
    const sf = controller.driver.snowflake;
    switch (e.key) {
      case "r":
        setResolution(controller);
        if (!controller.animating) {
          controller.draw(sf.visConfig.samples);
        }
        break;
      case "q":
        controller.draw(sf.visConfig.samples);
        break;
      case "s":
        saveImage(controller);
        break;
      case "f":
        controller.toggleVis();
        break;
      case "a":
        showStats(sf);
        break;
      case "h":
        showHelp();
        break;
      default:
        break;
    }
  }
  return handleKey;
}

function showStats(sf: SnowflakeRenderer): void {
  const { mass, time } = sf.stats();
  const feats = features.getFeatures();
  feats[
    "Colors"
  ] = `${feats["Primary Color"]}, ${feats["Secondary Color"]}, ${feats["Tertiary Color"]}`;
  delete feats["Primary Color"];
  delete feats["Secondary Color"];
  delete feats["Tertiary Color"];

  const featsString = Object.entries(feats)
    .map(([name, value]) => `${name}: ${value}`)
    .join("<br>");

  const res = sf.visConfig.resolution[0];

  const message = {
    header: "About",
    content: `Resolution: ${res}px<br>
    Render Iterations: ${sf.renderStep}<br>
    Mass: ${Math.round(mass)}<br>
    Growth Iterations: ${time}<br>
    ${featsString}`,
  };

  showModal(message, { confirm: true });
}

function showHelp(): void {
  const message = {
    header: "Instructions",
    content: `R: Change resolution<br>
    Q: Increase quality (run additional render iterations)<br>
    S: Save image as PNG<br>
    F: Toggle simple visualization during growth (faster growth)<br>
    A: Show information about the snowflake<br>
    H: Show help`,
  };

  showModal(message, { confirm: true });
}
