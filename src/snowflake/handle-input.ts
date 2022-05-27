import TinyGesture from "tinygesture";
import { showCrop, showMenu, showModal } from "../modal";
import { features } from "./features";
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
  const fileName = `snowflake-${window.fxhash}-${res}px.png`;
  captureCanvas(canvas, fileName);
}

const menuItems = [
  ["Set Resolution", setResolution],
  ["Decrease Noise", increaseQuality],
  ["Zoom and Crop", setCrop],
  ["Fast Growth", fastForward],
  ["Save Image", saveImage],
  ["About Snowflake", showStats],
  ["Keyboard Shortcuts", showHelp],
] as [string, () => void][];

function createKeyHandler(
  controller: SnowflakeController
): (e: KeyboardEvent) => void {
  function handleKey(e: KeyboardEvent): void {
    if (document.getElementsByClassName("modal").item(0)) {
      return;
    }
    switch (e.key) {
      case "r":
        setResolution(controller);
        break;
      case "q":
        increaseQuality(controller);
        break;
      case "s":
        saveImage(controller);
        break;
      case "f":
        fastForward(controller);
        break;
      case "a":
        showStats(controller);
        break;
      case "h":
        showHelp();
        break;
      case "z":
        setCrop(controller);
        break;
      case "m":
        showMenu(menuItems, [controller]);
        break;
      default:
        break;
    }
  }
  return handleKey;
}

function increaseQuality(controller: SnowflakeController): void {
  controller.draw(controller.driver.snowflake.visConfig.samples);
}

function fastForward(controller: SnowflakeController): void {
  controller.toggleVis();
}

function showStats(controller: SnowflakeController): void {
  const sf = controller.driver.snowflake;
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
      Q: "Decrease noise (run additional render iterations)",
      Z: "Zoom and crop",
      S: "Save image as PNG",
      F: "Toggle faster growth (simplified visualization)",
      A: "Show information about the snowflake",
      H: "Show keyboard shortcuts",
      M: "Show menu (double tap on mobile)",
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

export function registerListeners(controller: SnowflakeController): void {
  document.addEventListener("keyup", createKeyHandler(controller));

  const canvas = controller.driver.gl.canvas;
  const gesture = new TinyGesture(canvas);
  gesture.on("doubletap", () =>
    setTimeout(() => showMenu(menuItems, [controller]), 100)
  );
}
