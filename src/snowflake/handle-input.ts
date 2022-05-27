import { showCrop, showModal } from "../modal";
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
  if (controller.terminate) {
    controller.draw(controller.driver.snowflake.visConfig.samples);
  }
}

async function setCrop(controller: SnowflakeController): Promise<void> {
  const sf = controller.driver.snowflake;
  const [success, transform] = await showCrop({
    x: sf.uniforms.u_translate[0],
    y: sf.uniforms.u_translate[1],
    scale: sf.uniforms.u_scale,
  });
  if (success !== true) {
    return;
  }
  sf.uniforms.u_translate = [transform.x, transform.y];
  sf.uniforms.u_scale = transform.scale;
  controller.interpolated = false;
  controller.driver.snowflake.renderStep = 0;
  if (controller.terminate) {
    controller.draw(controller.driver.snowflake.visConfig.samples);
  }
}

function saveImage(controller: SnowflakeController): void {
  controller.driver.snowflake.display();
  const canvas = controller.driver.gl.canvas;
  const res = controller.driver.snowflake.visConfig.resolution[0];
  const fileName = `snoflinga-${window.fxhash}-${res}px.png`;
  captureCanvas(canvas, fileName);
}

export function createKeyHandler(
  controller: SnowflakeController
): (e: KeyboardEvent) => void {
  function handleKey(e: KeyboardEvent): void {
    const sf = controller.driver.snowflake;
    if (document.getElementsByClassName("modal").item(0)) {
      return;
    }
    switch (e.key) {
      case "r":
        setResolution(controller);
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
      case "z":
        setCrop(controller);
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

  const res = sf.visConfig.resolution[0];

  const message = {
    header: "About",
    content: createTable({
      Resolution: `${res}px`,
      "Render Iterations": sf.renderStep,
      Mass: Math.round(mass),
      "Growth Iterations": time,
      ...feats,
    }),
  };

  showModal(message, { confirm: true });
}

function showHelp(): void {
  const message = {
    header: "Instructions",
    content: createTable({
      R: "Change resolution",
      Q: "Increase quality (run additional render iterations)",
      Z: "Zoom in on part of snowflake",
      S: "Save image as PNG",
      F: "Toggle simple visualization during growth (faster growth)",
      A: "Show information about the snowflake",
      H: "Show help",
    }),
  };

  showModal(message, { confirm: true });
}

function createTable(values: Record<string, unknown>): string {
  const table = Object.entries(values)
    .map(([name, value]) => `<tr><td>${name}:</td><td>${value}</td></tr>`)
    .join("");
  return `<table>${table}</table>`;
}
