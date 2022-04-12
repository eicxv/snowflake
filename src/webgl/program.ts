import { createProgram, getLocations } from "./gl-utility";

export type ShaderSource = string;
export type ShaderType = number;
export type VertexShader = WebGLShader;
export type FragmentShader = WebGLShader;

export interface LocationCollection {
  [locationName: string]: WebGLUniformLocation;
}

export type Uniforms = Record<string, number | number[] | WebGLTexture>;

export abstract class Program {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  framebuffer: WebGLFramebuffer | null;
  uniforms: Uniforms;
  locations: LocationCollection;
  vao: WebGLVertexArrayObject;
  constructor(
    gl: WebGL2RenderingContext,
    fragShader: FragmentShader,
    vertShader: VertexShader,
    localUniforms: string[],
    uniforms: Uniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    this.gl = gl;
    this.uniforms = uniforms;
    this.framebuffer = framebuffer;
    this.vao = vao;
    this.program = createProgram(gl, vertShader, fragShader);
    this.locations = getLocations(gl, this.program, localUniforms);
  }

  abstract run(): void;
}
