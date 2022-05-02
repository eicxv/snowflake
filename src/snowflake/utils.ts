import { SnowflakeSimConfig } from "./snowflake-config";
import { SnowflakeDriver } from "./snowflake-driver";

function partitionArray(arr: Float32Array, spacing: number): Float32Array[] {
  const output = [];
  for (let i = 0; i < arr.length; i += spacing) {
    output[output.length] = arr.slice(i, i + spacing);
  }
  return output;
}

export function examineBuffer(buffer: Float32Array): {
  frozenCells: number;
  mass: number;
} {
  const data = partitionArray(buffer, 4);

  let frozenCells = 0;
  let mass = 0;
  for (const cell of data) {
    frozenCells += cell[0];
    mass += cell[1] + cell[2] + cell[3];
  }
  return { frozenCells, mass };
}

export function expectedMass(config: SnowflakeSimConfig): number {
  const r = config.latticeLongRadius;
  const totalCells = r % 2 == 0 ? (r * r) / 4 + r / 2 : ((r + 1) * (r + 1)) / 4;
  let mass = totalCells * config.rho;
  mass += 1 - config.rho; // adjust for initial frozen cell
  return mass;
}

function logMassFunction(): (driver: SnowflakeDriver, change: boolean) => void {
  let prevMass: number | null = null;

  function logMass(driver: SnowflakeDriver, change: boolean = true): void {
    const { mass } = examineBuffer(driver.dumpTexture());
    console.log("mass", mass);
    if (change && prevMass != null) {
      const dm = mass - prevMass;
      if (dm > 0.00001) console.log("mass change:", dm);
    }
    prevMass = mass;
  }

  return logMass;
}

export function random(min = 0, max = 1): number {
  return fxrand() * (max - min) + min;
}

export const logMass = logMassFunction();

function saveBlob(blob: Blob, fileName: string): void {
  const a = document.createElement("a");
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
}

export function captureCanvas(
  canvas: HTMLCanvasElement,
  fileName: string
): void {
  canvas.toBlob((blob: Blob | null) => {
    if (!blob) {
      return;
    }
    saveBlob(blob, fileName);
  });
}
