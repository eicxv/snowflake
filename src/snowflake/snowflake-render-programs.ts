import { compileShader } from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import computeFlippedSource from "./shaders/common/compute-flipped.vert?raw";
import computeSource from "./shaders/common/compute.vert?raw";
import dispSource from "./shaders/common/disp.frag?raw";
import fillSource from "./shaders/common/fill.frag?raw";
import displaySource from "./shaders/render/display.frag?raw";
import interpolateSource from "./shaders/render/interpolate.frag?raw";
import normalSource from "./shaders/render/normal.frag?raw";
import pathTraceSource from "./shaders/render/path-trace.frag?raw";
import renderSource from "./shaders/render/render.vert?raw";
import visualizationSource from "./shaders/render/visualization.frag?raw";
import {
  SnowflakeSimulationUniforms,
  SnowflakeUniforms,
} from "./snowflake-config";

export class InterpolateProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, interpolateSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class DisplayProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, displaySource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_renderTexture"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_renderTexture);
    gl.uniform1i(locations.u_renderTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class PathTraceProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, pathTraceSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, renderSource, gl.VERTEX_SHADER);
    const localUniforms = [
      "u_renderTexture",
      "u_normalTexture",
      "u_blend",
      "u_seed",
    ];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.uniform1ui(locations.u_seed, uniforms.u_seed);
    gl.uniform1f(locations.u_blend, uniforms.u_blend);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_renderTexture);
    gl.uniform1i(locations.u_renderTexture, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_normalTexture);
    gl.uniform1i(locations.u_normalTexture, 2);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class NormalProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, normalSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(
      gl,
      computeFlippedSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = ["u_latticeTexture"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}

export class DispProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, dispSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class FillProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, fillSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_rho"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);

    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.uniform1f(locations.u_rho, uniforms.u_rho);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}

export class VisualizationProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(
      gl,
      visualizationSource,
      gl.FRAGMENT_SHADER
    );
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_rho"];
    super(
      gl,
      fragShader,
      vertShader,
      localUniforms,
      uniforms,
      vao,
      framebuffer
    );
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_rho, uniforms.u_rho);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
