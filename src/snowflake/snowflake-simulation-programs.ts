import { compileShader } from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import computeSource from "./shaders/common/compute.vert?raw";
import attachmentSource from "./shaders/simulation/attachment.frag?raw";
import diffusionFreezingSource from "./shaders/simulation/diffusion-freezing.frag?raw";
import meltingSource from "./shaders/simulation/melting.frag?raw";
import { SnowflakeSimulationUniforms } from "./snowflake-config";

export class DiffusionFreezingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(
      gl,
      diffusionFreezingSource,
      gl.FRAGMENT_SHADER
    );
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_kappa"];
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

    gl.uniform1f(locations.u_kappa, uniforms.u_kappa);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}

export class AttachmentProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, attachmentSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_alpha", "u_beta", "u_theta"];
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

    gl.uniform1f(locations.u_alpha, uniforms.u_alpha);
    gl.uniform1f(locations.u_beta, uniforms.u_beta);
    gl.uniform1f(locations.u_theta, uniforms.u_theta);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}

export class MeltingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, meltingSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, computeSource, gl.VERTEX_SHADER);
    const localUniforms = ["u_latticeTexture", "u_mu", "u_gamma"];
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

    gl.uniform1f(locations.u_mu, uniforms.u_mu);
    gl.uniform1f(locations.u_gamma, uniforms.u_gamma);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}
