import { vec3 } from "gl-matrix";
import { hsluvToLch, lchToLuv, luvToXyz } from "hsluv";

type Vector3 = [number, number, number];

enum Lightness {
  White = 100,
  Pastel = 75,
  Standard = 50,
}

enum ColorHarmony {
  Monochrome,
  Analogous,
  Triad,
  Complementary,
}

interface ColorData {
  hsl: Vector3;
  scale: number;
}

type ColorDataCollection = Record<string, ColorData>;

// convert XYZ to rgb
// D65 illuminant
export function xyzToLinear([x, y, z]: Vector3): Vector3 {
  const r = 3.240479 * x - 1.53715 * y - 0.498535 * z;
  const g = -0.969256 * x + 1.875992 * y + 0.041556 * z;
  const b = 0.055648 * x - 0.204043 * y + 1.057311 * z;
  return [r, g, b];
}

function initColors(colorNames: string[]): ColorDataCollection {
  const colors: ColorDataCollection = {};
  for (const colorName of colorNames) {
    colors[colorName] = {
      hsl: [0, 0, 0],
      scale: 1,
    };
  }
  return colors;
}

function chooseSettings(): [ColorHarmony, Lightness] {
  const harmonyWeights = [0.1, 0.3, 0.3, 0.3];
  const lightWeights = [0.05, 0.3, 0.65];
  const harmony = sampleArrayWeighted(
    [
      ColorHarmony.Monochrome,
      ColorHarmony.Analogous,
      ColorHarmony.Triad,
      ColorHarmony.Complementary,
    ],
    harmonyWeights
  );
  const lightness = sampleArrayWeighted(
    [Lightness.White, Lightness.Pastel, Lightness.Standard],
    lightWeights
  );
  return [harmony, lightness];
}

function generateColors(): Record<string, Vector3> {
  const [harmony, lightness] = chooseSettings();
  const colorData = initColors([
    "LIGHT_1_COL",
    "LIGHT_2_COL",
    "LIGHT_3_COL",
    "GROUND_COL",
    "GROUND_ACCENT_COL",
    "HORIZON_COL",
    "SKY_COL",
  ]);
  genHues(colorData, harmony);
  genSaturation(colorData, lightness, harmony);
  genMultiplier(colorData, lightness, harmony);
  genLightness(colorData, lightness);
  const colors: Record<string, Vector3> = {};
  for (const [colorName, data] of Object.entries(colorData)) {
    const rgb = hsluvToLinear(data.hsl);
    vec3.scale(rgb, rgb, data.scale);
    colors[colorName] = rgb;
  }
  return colors;
}

function genHues(colors: ColorDataCollection, harmony: ColorHarmony): void {
  const baseHue = random(0, 360);
  let groundHue = baseHue;
  let offset: number;
  switch (harmony) {
    case ColorHarmony.Monochrome:
      offset = random(0, 30);
      break;
    case ColorHarmony.Analogous:
      offset = random(30, 80);
      break;
    case ColorHarmony.Triad:
      offset = random(80, 130);
      break;
    case ColorHarmony.Complementary:
      offset = random(130, 180);
      groundHue += 180;
  }
  const accentOffset = random(-15, 15);
  colors.LIGHT_1_COL.hsl[0] = baseHue;
  colors.LIGHT_2_COL.hsl[0] = baseHue + offset;
  colors.LIGHT_3_COL.hsl[0] = baseHue - offset;
  colors.GROUND_COL.hsl[0] = groundHue;
  colors.GROUND_ACCENT_COL.hsl[0] = groundHue + accentOffset;
  colors.HORIZON_COL.hsl[0] = groundHue;
  colors.SKY_COL.hsl[0] = groundHue;
}

function genSaturation(
  colors: ColorDataCollection,
  lightness: Lightness,
  harmony: ColorHarmony
): void {
  const lightSat = 50;
  let groundSat = 40;
  let accentSat = 30;
  let skySat = 20;
  if (
    lightness === Lightness.White ||
    lightness === Lightness.Pastel ||
    harmony === ColorHarmony.Monochrome
  ) {
    groundSat = 25;
    accentSat = 15;
  }
  if (lightness === Lightness.White) {
    skySat = 0;
  }
  colors.LIGHT_1_COL.hsl[1] = lightSat;
  colors.LIGHT_2_COL.hsl[1] = lightSat;
  colors.LIGHT_3_COL.hsl[1] = lightSat;
  colors.GROUND_COL.hsl[1] = groundSat;
  colors.GROUND_ACCENT_COL.hsl[1] = accentSat;
  colors.HORIZON_COL.hsl[1] = groundSat;
  colors.SKY_COL.hsl[1] = skySat;
}

function genMultiplier(
  colors: ColorDataCollection,
  lightness: Lightness,
  harmony: ColorHarmony
): void {
  let lightMultipliers: Vector3;
  if (harmony === ColorHarmony.Monochrome || lightness === Lightness.White) {
    lightMultipliers = [12.2, 1.2, 0.6];
  } else if (harmony === ColorHarmony.Complementary) {
    lightMultipliers = [10.5, 6.75, 6.75];
  } else {
    lightMultipliers = [9, 7.5, 7.5];
  }
  switch (lightness) {
    case Lightness.White:
      vec3.scale(lightMultipliers, lightMultipliers, 0.25);
      break;
    case Lightness.Pastel:
      vec3.scale(lightMultipliers, lightMultipliers, 0.4);
      break;
    case Lightness.Standard:
      break;
  }
  const groundMult = random(0.1, 0.18);
  colors.LIGHT_1_COL.scale = lightMultipliers[0];
  colors.LIGHT_2_COL.scale = lightMultipliers[1];
  colors.LIGHT_3_COL.scale = lightMultipliers[2];
  colors.GROUND_COL.scale = groundMult;
  colors.GROUND_ACCENT_COL.scale = groundMult * 0.6;
  colors.HORIZON_COL.scale = groundMult * 1.25;
  colors.SKY_COL.scale = groundMult * 2.25;
}

function genLightness(colors: ColorDataCollection, lightness: Lightness): void {
  colors.LIGHT_1_COL.hsl[2] = lightness;
  colors.LIGHT_2_COL.hsl[2] = lightness;
  colors.LIGHT_3_COL.hsl[2] = lightness;
  colors.GROUND_COL.hsl[2] = 35;
  colors.GROUND_ACCENT_COL.hsl[2] = 30;
  colors.HORIZON_COL.hsl[2] = 35;
  colors.SKY_COL.hsl[2] = 35;
}

function sampleArrayWeighted<T>(arr: ArrayLike<T>, weights: Array<number>): T {
  const total = weights.reduce((a, b) => a + b, 0);
  const rand = random(0, total);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += weights[i];
    if (sum > rand) {
      return arr[i];
    }
  }
  return arr[0];
}

function sampleArray<T>(arr: ArrayLike<T>): T {
  const index = Math.floor(random() * arr.length);
  return arr[index];
}

function hsluvToLinear(hsluv: Vector3): Vector3 {
  const lch = hsluvToLch(hsluv);
  const luv = lchToLuv(lch);
  const xyz = luvToXyz(luv);
  const lin = xyzToLinear(xyz);
  return lin;
}

function sphericalToCartesian([r, theta, phi]: Vector3): Vector3 {
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  return [x, y, z];
}

function random(min = 0, max = 1): number {
  return Math.random() * (max - min) + min;
  // return 0.5 * (max - min) + min;
}

function generateLightDirections(): Record<string, Vector3> {
  const angleOffset = random(0, 2 * Math.PI);
  const directions = {
    LIGHT_1_DIR: sphericalToCartesian([1, (0.43 * Math.PI) / 2, angleOffset]),
    LIGHT_2_DIR: sphericalToCartesian([
      1,
      (random(0.7, 1.3) * Math.PI) / 2,
      (2 * Math.PI) / 3 + angleOffset,
    ]),
    LIGHT_3_DIR: sphericalToCartesian([
      1,
      (1.58 * Math.PI) / 2,
      (2 * Math.PI * 2) / 3 + angleOffset,
    ]),
  };
  return directions;
}

function toGlsl(value: number | number[], float = true, decimals = 6): string {
  if (Array.isArray(value)) {
    if (value.length > 4 || value.length <= 1) {
      throw new Error("Value Error");
    }
    const values = value.map((v) => v.toFixed(decimals)).join(", ");
    return `vec${value.length}(${values})`;
  } else {
    if (float) {
      return value.toFixed(decimals);
    }
    return value.toString();
  }
}

export function generateOverwrites(): Record<string, string> {
  const values: Record<string, number | number[]> = {
    ...generateLightDirections(),
    ...generateColors(),
    GROUND_SEED: random(0, 10000),
  };
  const overwrites: Record<string, string> = {};
  Object.entries(values).forEach(([key, value]) => {
    overwrites[key] = toGlsl(value);
  });
  return overwrites;
}

// create function to take a series of colors and create divs with the colors and add them to the body
function showColors(colors: string[]): void {
  const body = document.querySelector("body");
  if (!body) {
    return;
  }
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.marginBottom = "4rem";
  colors.forEach((color) => {
    const div = document.createElement("div");
    div.style.backgroundColor = color;
    div.style.width = "100px";
    div.style.height = "100px";
    container.appendChild(div);
  });
  body.appendChild(container);
}
