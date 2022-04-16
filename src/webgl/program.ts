import { createProgram, getLocations } from "./gl-utility";

export type ShaderSource = string;
export type ShaderType = number;
export type VertexShader = WebGLShader;
export type FragmentShader = WebGLShader;

export interface LocationCollection {
  [locationName: string]: WebGLUniformLocation | null;
}

export type Uniforms = Record<string, number | number[] | WebGLTexture>;

export abstract class Program {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  framebuffer: WebGLFramebuffer | null;
  uniforms: Uniforms;
  locations: LocationCollection;
  vao: WebGLVertexArrayObject;
  numberOfVertices: number;
  constructor(
    gl: WebGL2RenderingContext,
    fragShader: FragmentShader,
    vertShader: VertexShader,
    localUniforms: string[],
    uniforms: Uniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null,
    numberOfVertices: number
  ) {
    this.gl = gl;
    this.uniforms = uniforms;
    this.framebuffer = framebuffer;
    this.vao = vao;
    this.program = createProgram(gl, vertShader, fragShader);
    this.locations = getLocations(gl, this.program, localUniforms);
    this.numberOfVertices = numberOfVertices;
  }

  run(): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.bindVertexArray(this.vao);
    this.bindUniforms();

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numberOfVertices);
  }

  abstract bindUniforms(): void;
}
