import { SnowflakeSimConfig } from "./snowflake-config";

function partitionArray(arr: Float32Array, spacing: number): Float32Array[] {
  const output = [];
  for (let i = 0; i < arr.length; i += spacing) {
    output[output.length] = arr.slice(i, i + spacing);
  }
  return output;
}

export function examineBuffer(buffer: Float32Array): [number, number] {
  const data = partitionArray(buffer, 4);

  let frozenCells = 0;
  let mass = 0;
  for (const cell of data) {
    frozenCells += cell[0];
    mass += cell[1] + cell[2] + cell[3];
  }
  return [frozenCells, mass];
}

export function expectedMass(config: SnowflakeSimConfig): number {
  const [w, h] = config.dimensions;
  let mass = w * h * config.rho;
  mass += 1 - config.rho; // adjust for initial frozen cell
  return mass;
}
