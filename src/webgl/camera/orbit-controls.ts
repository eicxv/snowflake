import { mat4, quat, vec3 } from "gl-matrix";
import Camera, { CameraSettings } from "./camera";

export interface OrbitSettings {
  orbitSpeed: number;
  dollySpeed: number;
  panSpeed: number;
}

export default class OrbitControls {
  canvas: HTMLCanvasElement;
  camera: Camera;
  orbitSpeed: number;
  panSpeed: number;
  onChange: (() => void) | null;
  dollyFraction: { in: number; out: number };
  eye: vec3;
  orbitTarget: vec3;
  orbitRotation: quat;
  orbitMatrix: mat4;
  private _vec: vec3;

  constructor(
    gl: WebGL2RenderingContext,
    cameraSettings: CameraSettings,
    orbitSettings: OrbitSettings
  ) {
    this.canvas = gl.canvas;
    const { position, target } = cameraSettings;
    this.camera = new Camera(gl, cameraSettings);
    const { orbitSpeed, dollySpeed, panSpeed } = orbitSettings;
    this.orbitSpeed = orbitSpeed;
    this.panSpeed = panSpeed;
    this.onChange = null;
    this.dollyFraction = { in: dollySpeed, out: 1 - 1 / (1 - dollySpeed) };
    this.eye = vec3.fromValues(...(position as [number, number, number]));
    this.orbitTarget = vec3.fromValues(...(target as [number, number, number]));
    this.orbitRotation = quat.create();
    this.orbitMatrix = mat4.create();
    // init orbitRotation from position and target
    mat4.lookAt(
      this.orbitMatrix,
      this.eye,
      this.orbitTarget,
      this.camera.worldUp
    );
    mat4.getRotation(this.orbitRotation, this.orbitMatrix);
    this.eye = [0, 0, vec3.len(this.eye)];
    this._vec = vec3.create();

    this.canvas.addEventListener("mousemove", this.handleMove.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
  }

  update(): void {
    mat4.fromRotationTranslation(
      this.orbitMatrix,
      this.orbitRotation,
      this.orbitTarget
    );
    mat4.translate(this.orbitMatrix, this.orbitMatrix, this.eye);
    mat4.invert(this.camera.viewMatrix, this.orbitMatrix);
    this.camera.updateViewProjectionMatrix();
    this.onChange?.();
  }

  orbit(yaw: number, pitch: number): void {
    quat.rotateY(this.orbitRotation, this.orbitRotation, yaw);
    quat.rotateX(this.orbitRotation, this.orbitRotation, pitch);
    quat.normalize(this.orbitRotation, this.orbitRotation);
  }

  dolly(direction: number): void {
    const scale =
      direction > 0 ? this.dollyFraction.in : this.dollyFraction.out;
    const toTarget = vec3.sub(this._vec, this.orbitTarget, this.eye);
    vec3.scaleAndAdd(this.eye, this.eye, toTarget, scale);
  }

  pan(dx: number, dy: number): void {
    const speed = (this.panSpeed * this.eye[2]) / this.canvas.clientHeight;
    this.eye[0] += dx * speed;
    this.eye[1] += dy * speed;
  }

  handleMove(ev: MouseEvent): void {
    if (ev.buttons & 2 || (ev.buttons & 1 && ev.shiftKey)) {
      this.pan(-ev.movementX, ev.movementY);
      this.update();
    } else if (ev.buttons & 1) {
      const speed = this.orbitSpeed / this.canvas.clientHeight;
      const yaw = -ev.movementX * speed;
      const pitch = -ev.movementY * speed;
      this.orbit(yaw, pitch);
      this.update();
    }
  }

  handleWheel(ev: WheelEvent): void {
    ev.preventDefault();
    this.dolly(-Math.sign(ev.deltaY));
    this.update();
  }
}
