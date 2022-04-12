import { Uniforms } from "./program";

export interface Driver {
  gl: WebGL2RenderingContext;
  running: boolean;
  step: () => void;
  startAnimation: () => void;
  stopAnimation: () => void;
}

export abstract class AbstractDriver implements Driver {
  gl: WebGL2RenderingContext;
  steps = 0;
  abstract uniforms: Uniforms;
  protected animateId: number | null = null;

  constructor(canvas: HTMLCanvasElement, glAttributes: WebGLContextAttributes) {
    const gl = canvas.getContext("webgl2", glAttributes);
    if (gl == null) {
      throw new Error("webgl2 not supported");
    }
    this.gl = gl;
    this.animate = this.animate.bind(this);
  }

  abstract animate(): void;

  abstract step(): void;

  startAnimation(): void {
    if (this.running) {
      return;
    }
    this.animateId = requestAnimationFrame(this.animate);
  }

  stopAnimation(): void {
    if (this.animateId == null) {
      return;
    }
    cancelAnimationFrame(this.animateId);
    this.animateId = null;
  }

  get running(): boolean {
    return !(this.animateId == null);
  }
}
