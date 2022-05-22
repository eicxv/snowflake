import { vec3 } from "gl-matrix";
import { hsluvToHex, hsluvToLch, lchToLuv, luvToXyz } from "hsluv";
import { features } from "./features";
import { random, sampleArrayWeighted } from "./utils";

type Vector3 = [number, number, number];

enum Lightness {
  White = 100,
  Pastel = 80,
  Standard = 50,
}

enum Harmony {
  Monochrome,
  Analogous,
  Triad,
  Complementary,
}

interface ColorData {
  hsl: Vector3;
  intensity: number;
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
      intensity: 1,
    };
  }
  return colors;
}

function setFeatures(
  colorData: ColorDataCollection,
  lightness: Lightness,
  harmony: Harmony
): void {
  const white = lightness == Lightness.White;
  const fs = [
    ["Primary Color", colorData.LIGHT_1_COL],
    ["Secondary Color", colorData.LIGHT_2_COL],
    ["Tertiary Color", colorData.LIGHT_3_COL],
  ] as Array<[string, ColorData]>;
  fs.forEach(([name, color]) => {
    const colorName = white ? "White" : colorNameFromHue(color.hsl[0]);
    features.setFeature(name, colorName);
  });
  features.setFeature("Harmony", Harmony[harmony]);
}

function chooseSettings(): [Harmony, Lightness] {
  const lightWeights = [0.05, 0.25, 0.7];
  const harmonyWeights = [0.1, 0.3, 0.25, 0.35];

  const lightness = sampleArrayWeighted(
    [Lightness.White, Lightness.Pastel, Lightness.Standard],
    lightWeights
  );
  const harmony =
    lightness == Lightness.White
      ? Harmony.Monochrome
      : sampleArrayWeighted(
          [
            Harmony.Monochrome,
            Harmony.Analogous,
            Harmony.Triad,
            Harmony.Complementary,
          ],
          harmonyWeights
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
  genIntensity(colorData, lightness, harmony);
  genLightness(colorData, lightness);
  const colors: Record<string, Vector3> = {};
  for (const [colorName, data] of Object.entries(colorData)) {
    const rgb = hsluvToLinear(data.hsl);
    vec3.scale(rgb, rgb, data.intensity);
    colors[colorName] = rgb;
  }
  setBackgroundStyle(colorData);
  setFeatures(colorData, lightness, harmony);
  return colors;
}

function genHues(colors: ColorDataCollection, harmony: Harmony): void {
  const baseHue = random(0, 360);
  let groundHue = baseHue;
  let offset: number;
  switch (harmony) {
    case Harmony.Monochrome:
      offset = random(0, 30);
      break;
    case Harmony.Analogous:
      offset = random(30, 80);
      break;
    case Harmony.Triad:
      offset = random(80, 130);
      break;
    case Harmony.Complementary:
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
  harmony: Harmony
): void {
  const lightSat = 50;
  let groundSat = 30;
  let accentSat = 22;
  let skySat = 20;
  if (lightness === Lightness.Pastel || harmony === Harmony.Monochrome) {
    groundSat = 25;
    accentSat = 15;
  }
  if (lightness === Lightness.White) {
    groundSat = 15;
    accentSat = 5;
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

function genIntensity(
  colors: ColorDataCollection,
  lightness: Lightness,
  harmony: Harmony
): void {
  let lightMultipliers: Vector3;
  if (harmony === Harmony.Monochrome || lightness === Lightness.White) {
    lightMultipliers = [12.4, 2.2, 1.2];
  } else if (harmony === Harmony.Complementary) {
    lightMultipliers = [10.5, 3.5, 6];
  } else if (harmony === Harmony.Triad) {
    lightMultipliers = [10, 4, 6.5];
  } else {
    // Analogous
    lightMultipliers = [10.5, 5.5, 6];
  }
  switch (lightness) {
    case Lightness.White:
      vec3.scale(lightMultipliers, lightMultipliers, 0.25);
      break;
    case Lightness.Pastel:
      vec3.scale(lightMultipliers, lightMultipliers, 0.5);
      break;
    case Lightness.Standard:
      break;
  }
  vec3.scale(lightMultipliers, lightMultipliers, 1.2);

  const groundMult = random(0.12, 0.28);
  colors.LIGHT_1_COL.intensity = lightMultipliers[0];
  colors.LIGHT_2_COL.intensity = lightMultipliers[1];
  colors.LIGHT_3_COL.intensity = lightMultipliers[2];
  colors.GROUND_COL.intensity = groundMult;
  colors.GROUND_ACCENT_COL.intensity = groundMult * 0.6;
  colors.HORIZON_COL.intensity = groundMult * 1.25;
  colors.SKY_COL.intensity = groundMult * 1.5;
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

function generateLightDirections(): Record<string, Vector3> {
  const angleOffset = random(0, 2 * Math.PI);
  const directions = {
    LIGHT_1_DIR: sphericalToCartesian([1, (0.43 * Math.PI) / 2, angleOffset]),
    LIGHT_2_DIR: sphericalToCartesian([
      1,
      (0.6 * Math.PI) / 2,
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

function colorNameFromHue(hue: number): string {
  hue = (hue + 360) % 360;
  const hn = [
    ["Rose", 5],
    ["Red", 15],
    ["Amber", 40],
    ["Yellow", 70],
    ["Chartreuse", 105],
    ["Green", 140],
    ["Aquamarine", 160],
    ["Turquoise", 200],
    ["Azure", 240],
    ["Blue", 275],
    ["Violet", 310],
    ["Magenta", 345],
    ["Rose", 360],
  ] as Array<[string, number]>;

  for (const [name, h] of hn) {
    if (hue <= h) {
      return name;
    }
  }
  throw new Error("Color name error");
}

function setBackgroundStyle(colors: ColorDataCollection): void {
  const html = document.documentElement;
  const col = colors.GROUND_COL;
  const hsl = col.hsl;
  hsl[2] = hsl[2] * col.intensity * 0.5;
  const bgColor = hsluvToHex(colors.GROUND_COL.hsl);
  html.style.backgroundColor = bgColor;
}
