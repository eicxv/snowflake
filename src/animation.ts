import { SnowflakeDriver } from "./snowflake/snowflake-driver";

function simpleHash(): string {
  const str = String(Math.random() * 3455);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}

export function createAnimation(driver: SnowflakeDriver): void {
  const sf = driver.snowflake;
  const id = simpleHash();
  let i = 70;
  const step = 470;
  sf.grow(step * i);

  driver.uniforms.u_normalBlend = 0.841381593894987;

  function nextFrame(): void {
    console.log("frame", i);
    if (i > 105) {
      return;
    }
    sf.grow(step);
    sf.interpolate();
    sf.renderStep = 50;
    sf.pathTrace(150);
    sf.display();
    captureCanvas(
      sf.gl.canvas,
      `sf-frame-${id}-${String(i).padStart(5, "0")}.png`
    );
    i++;
    setTimeout(nextFrame, 150);
  }
  nextFrame();
}

function saveBlob(blob: Blob, fileName: string): void {
  const a = document.createElement("a");
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
}

function captureCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob: Blob | null) => {
    if (!blob) {
      return;
    }
    saveBlob(blob, fileName);
  });
}
