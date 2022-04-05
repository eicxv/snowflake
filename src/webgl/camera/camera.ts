import { mat4, vec3 } from "gl-matrix";

export interface CameraSettings {
  position: vec3;
  target: vec3;
  near: number;
  far: number;
  fov: number;
  up: vec3;
}

export default class Camera {
  private canvas: HTMLCanvasElement;
  worldUp: vec3;
  position: vec3;
  target: vec3;
  near: number;
  far: number;
  fov: number;
  viewMatrix: mat4;
  projectionMatrix: mat4;
  viewProjectionMatrix: mat4;
  constructor(gl: WebGL2RenderingContext, settings: CameraSettings) {
    this.canvas = gl.canvas;
    this.worldUp = vec3.fromValues(
      ...(settings.up as [number, number, number])
    );
    this.position = settings.position;
    this.target = settings.target;
    this.near = settings.near;
    this.far = settings.far;
    this.fov = settings.fov;
    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();

    this.createViewMatrix(settings.position, settings.target, this.worldUp);
    this.createProjectionMatrix();
    this.updateViewProjectionMatrix();
  }

  createProjectionMatrix(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    mat4.perspective(
      this.projectionMatrix,
      this.fov,
      aspect,
      this.near,
      this.far
    );
  }

  createViewMatrix(position: vec3, target: vec3, worldUp: vec3): void {
    this.position = position;
    this.target = target;
    mat4.lookAt(this.viewMatrix, position, target, worldUp);
  }

  updateViewProjectionMatrix(): mat4 {
    mat4.mul(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
    return this.viewProjectionMatrix;
  }

  getForward(out: vec3): vec3 {
    out[0] = this.viewMatrix[8];
    out[1] = this.viewMatrix[9];
    out[2] = this.viewMatrix[10];
    return out;
  }
  getUp(out: vec3): vec3 {
    out[0] = this.viewMatrix[4];
    out[1] = this.viewMatrix[5];
    out[2] = this.viewMatrix[6];
    return out;
  }
  getLeft(out: vec3): vec3 {
    out[0] = this.viewMatrix[0];
    out[1] = this.viewMatrix[1];
    out[2] = this.viewMatrix[2];
    return out;
  }
}
