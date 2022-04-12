import { AbstractDriver } from "../webgl/driver";
import { getExtension } from "../webgl/gl-utility";
import {
  SnowflakeSimConfig,
  SnowflakeUniforms,
  SnowflakeVisConfig,
} from "./snowflake-config";
import { SnowflakeRenderer } from "./snowflake-renderer";

export class SnowflakeDriver extends AbstractDriver {
  uniforms: SnowflakeUniforms;
  snowflake: SnowflakeRenderer;
  constructor(
    canvas: HTMLCanvasElement,
    simConfig: SnowflakeSimConfig,
    visConfig: SnowflakeVisConfig
  ) {
    const glAttributes: WebGLContextAttributes = {
      premultipliedAlpha: false,
    };
    super(canvas, glAttributes);
    getExtension(this.gl, "EXT_color_buffer_float");

    this.snowflake = new SnowflakeRenderer(this.gl, simConfig, visConfig);
    this.uniforms = this.snowflake.uniforms;
  }

  animate(): void {
    throw new Error("Method not implemented.");
  }

  step(): void {
    throw new Error("Method not implemented.");
  }

  dumpTexture(): Float32Array {
    const gl = this.gl;
    const [width, height] = this.snowflake.variables.lattice.resolution;
    const framebuffer = this.snowflake.variables.lattice.getFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buffer);

    return buffer;
  }
}
