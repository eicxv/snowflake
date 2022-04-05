import { compileShader } from "../../webgl/gl-utility";
import { Program } from "../../webgl/program";
import { SnowflakeUniformCollection } from "../snowflake-config";
import renderFragSource from "./shaders/ray-tracer.frag?raw";
import renderVertSource from "./shaders/render.vert?raw";

export class RenderProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniformCollection,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const fragShader = compileShader(gl, renderFragSource, gl.FRAGMENT_SHADER);
    const vertShader = compileShader(gl, renderVertSource, gl.VERTEX_SHADER);
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
