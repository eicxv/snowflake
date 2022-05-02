import { RandomForestClassifier as RFClassifier } from "ml-random-forest";
import randomForestModel from "./models/model.json";
import { SnowflakeSimConfig } from "./snowflake-config";
import { random } from "./utils";

function uniform(a = 0, b = 1): () => number {
  return () => random() * (b - a) + a;
}

function expone(a: number, b: number): () => number {
  return () => a * Math.exp(-b * random());
}

// const gRho = uniform(0.45, 0.8);
// const gBeta = uniform(1.06, 3.2);
// const gAlpha = expone(0.6, 2);
// const gTheta = expone(0.12, 8);
// const gKappa = expone(0.15, 2);
// const gMu = expone(0.15, 6);
// const gGamma = expone(0.1, 2);

const gRho = uniform(0.45, 0.8);
const gBeta = uniform(1.06, 3.2);
const gAlpha = expone(0.6, 1);
const gTheta = expone(0.12, 4);
const gKappa = expone(0.15, 1);
const gMu = expone(0.15, 2);
const gGamma = expone(0.1, 1);

// eslint-disable-next-line
// @ts-ignore
const classifier = RFClassifier.load(randomForestModel) as RFClassifier;

function generateFeature(): number[][] {
  return [[gAlpha(), gBeta(), gTheta(), gGamma(), gMu(), gKappa(), gRho()]];
}

export function generateParameters(
  latticeLongRadius = 500,
  filterHexagons = true
): SnowflakeSimConfig {
  let feature = generateFeature();
  if (filterHexagons) {
    for (let _ = 0; _ < 50; _++) {
      const label = classifier.predict(feature);
      if (label[0] === 0) {
        break;
      }
      feature = generateFeature();
    }
  }

  const values = feature[0];
  return {
    alpha: values[0],
    beta: values[1],
    theta: values[2],
    gamma: values[3],
    mu: values[4],
    kappa: values[5],
    rho: values[6],
    sigma: 0,
    nu: 1,
    latticeLongRadius,
  };
}
