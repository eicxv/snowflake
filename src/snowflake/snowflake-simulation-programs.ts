import { Program } from "../webgl/program";
import computeSource from "./shaders/common/compute.vert?raw";
import attachmentSource from "./shaders/simulation/attachment.frag?raw";
import diffusionFreezingSource from "./shaders/simulation/diffusion-freezing.frag?raw";
import environmentChangeSource from "./shaders/simulation/environment-change.frag?raw";
import meltingSource from "./shaders/simulation/melting.frag?raw";
import { SnowflakeSimulationUniforms } from "./snowflake-config";

export class DiffusionFreezingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_kappa"];
    super(
      gl,
      diffusionFreezingSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_kappa, uniforms.u_kappa);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class AttachmentProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_alpha", "u_beta", "u_theta"];
    super(
      gl,
      attachmentSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_alpha, uniforms.u_alpha);
    gl.uniform1f(locations.u_beta, uniforms.u_beta);
    gl.uniform1f(locations.u_theta, uniforms.u_theta);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class MeltingProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_mu", "u_gamma"];
    super(
      gl,
      meltingSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_mu, uniforms.u_mu);
    gl.uniform1f(locations.u_gamma, uniforms.u_gamma);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class EnvironmentChangeProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_nu"];
    super(
      gl,
      environmentChangeSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_nu, uniforms.u_nu);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}
