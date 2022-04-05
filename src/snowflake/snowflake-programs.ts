import { compileShader } from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import attachmentSource from "./shaders/attachment.frag?raw";
import computeNeighborsSource from "./shaders/compute-neighbors.vert?raw";
import computeSource from "./shaders/compute.vert?raw";
import diffusionFreezingSource from "./shaders/diffusion-freezing.frag?raw";
import diffusionSource from "./shaders/diffusion.frag?raw";
import freezingSource from "./shaders/freezing.frag?raw";
import meltingSource from "./shaders/melting.frag?raw";
import noiseSource from "./shaders/noise.frag?raw";
import visualizationSource from "./shaders/visualization.frag?raw";
import { SnowflakeUniformCollection } from "./snowflake-config";

export class DiffusionFreezingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(
      gl,
      diffusionFreezingSource,
      gl.FRAGMENT_SHADER
    );
    const vertShader = compileShader(
      gl,
      computeNeighborsSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = ["u_latticeTexture", "u_resolution", "u_kappa"];
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform2fv(locations.u_resolution, uniforms.u_resolution);
    gl.uniform1f(locations.u_kappa, uniforms.u_kappa);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class DiffusionProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, diffusionSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(
      gl,
      computeNeighborsSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = ["u_latticeTexture", "u_resolution"];
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform2fv(locations.u_resolution, uniforms.u_resolution);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class FreezingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, freezingSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(
      gl,
      computeNeighborsSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = ["u_latticeTexture", "u_resolution", "u_kappa"];
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform2fv(locations.u_resolution, uniforms.u_resolution);
    gl.uniform1f(locations.u_kappa, uniforms.u_kappa);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class AttachmentProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, attachmentSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(
      gl,
      computeNeighborsSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = [
      "u_latticeTexture",
      "u_resolution",
      "u_alpha",
      "u_beta",
      "u_theta",
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform2fv(locations.u_resolution, uniforms.u_resolution);
    gl.uniform1f(locations.u_alpha, uniforms.u_alpha);
    gl.uniform1f(locations.u_beta, uniforms.u_beta);
    gl.uniform1f(locations.u_theta, uniforms.u_theta);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class MeltingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, meltingSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(
      gl,
      computeNeighborsSource,
      gl.VERTEX_SHADER
    );
    const localUniforms = [
      "u_latticeTexture",
      "u_resolution",
      "u_mu",
      "u_gamma",
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform2fv(locations.u_resolution, uniforms.u_resolution);
    gl.uniform1f(locations.u_mu, uniforms.u_mu);
    gl.uniform1f(locations.u_gamma, uniforms.u_gamma);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class NoiseProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, noiseSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_sigma", "u_step"];
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform1f(locations.u_sigma, uniforms.u_sigma);
    gl.uniform1ui(locations.u_step, uniforms.u_step);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export class VisualizationProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
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
    const uniforms = this.uniforms as SnowflakeUniformCollection;

    gl.uniform1f(locations.u_rho, uniforms.u_rho);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
