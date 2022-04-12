import { AbstractDriver } from "../webgl/driver";
import { getExtension } from "../webgl/gl-utility";
import {
  SnowflakeControlConfig,
  SnowflakeSimConfig,
  SnowflakeUniforms,
  SnowflakeVisConfig,
} from "./snowflake-config";
import { SnowflakeRenderer } from "./snowflake-renderer";

export class SnowflakeDriver extends AbstractDriver {
  uniforms: SnowflakeUniforms;
  snowflake: SnowflakeRenderer;
  controlConfig: SnowflakeControlConfig;
  constructor(
    canvas: HTMLCanvasElement,
    controlConfig: SnowflakeControlConfig,
    simConfig: SnowflakeSimConfig,
    visConfig: SnowflakeVisConfig
  ) {
    const glAttributes: WebGLContextAttributes = {
      premultipliedAlpha: false,
    };
    super(canvas, glAttributes);
    getExtension(this.gl, "EXT_color_buffer_float");
    getExtension(this.gl, "OES_texture_float_linear");

    this.controlConfig = controlConfig;
    this.snowflake = new SnowflakeRenderer(this.gl, simConfig, visConfig);
    this.uniforms = this.snowflake.uniforms;

    this.animate = this.animate.bind(this);
  }

  animate(): void {
    this.step();
    this.animateId = requestAnimationFrame(this.animate);
  }

  step(): void {
    const sf = this.snowflake;
    const cConfig = this.controlConfig;
    sf.pathTrace(cConfig.growStepPerCycle);
    if (sf.growCount < cConfig.growSteps) {
      sf.grow(cConfig.growStepPerCycle);
      sf.interpolate();
      if (cConfig.renderBlendReset != null) {
        sf.renderStep = cConfig.renderBlendReset;
      }
    }
    sf.display();
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
