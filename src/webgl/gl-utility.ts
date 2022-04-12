import {
  FragmentShader,
  LocationCollection,
  ShaderSource,
  ShaderType,
  VertexShader,
} from "./program";

export enum TextureWrap {
  Repeat = "REPEAT",
  ClampToEdge = "CLAMP_TO_EDGE",
  MirroredRepeat = "MIRRORED_REPEAT",
}

export enum TextureFilter {
  Linear = "LINEAR",
  Nearest = "NEAREST",
}

export const defaultAttributeData = new Float32Array([
  -1.0, 1.0, 0.0, 1.0,

  -1.0, -1.0, 0.0, 0.0,

  1.0, 1.0, 1.0, 1.0,

  1.0, -1.0, 1.0, 0.0,
]);

export function createAttributeBuffer(
  gl: WebGL2RenderingContext,
  data: ArrayBufferView
): WebGLBuffer {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  if (buffer == null) {
    throw new Error("Failed to create attribute buffer");
  }
  return buffer;
}

export function getExtension(
  gl: WebGL2RenderingContext,
  extension: string
): void {
  const ext = gl.getExtension(extension);
  if (ext == null) {
    throw new Error(`Failed to enable ${extension} extension`);
  }
}

export function compileShader(
  gl: WebGL2RenderingContext,
  source: ShaderSource,
  type: ShaderType
): WebGLShader {
  const shader = gl.createShader(type);
  if (shader == null) {
    throw new Error(
      `Failed to create shader of type "${gl.getShaderInfoLog(type)}"`
    );
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    throw new Error(
      `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`
    );
  }

  return shader;
}

export function getLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformNames: string[]
): LocationCollection {
  return Object.fromEntries(
    uniformNames.map((unifName) => {
      const location = gl.getUniformLocation(program, unifName);
      if (location == null) {
        throw new Error(`Failed to create location ${unifName}`);
      }
      return [unifName, location];
    })
  );
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertShader: VertexShader | ShaderSource,
  fragShader: FragmentShader | ShaderSource,
  attributes: [string, number][] = []
): WebGLProgram {
  const program = gl.createProgram();
  if (program == null) {
    throw new Error("Failed to create program");
  }

  if (!(vertShader instanceof WebGLShader)) {
    vertShader = compileShader(gl, vertShader, gl.VERTEX_SHADER);
  }
  if (!(fragShader instanceof WebGLShader)) {
    fragShader = compileShader(gl, fragShader, gl.FRAGMENT_SHADER);
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  if (attributes) {
    for (const [attrName, location] of attributes) {
      gl.bindAttribLocation(program, location, attrName);
    }
  }
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    throw new Error(
      `Program creation failed: ${gl.getProgramInfoLog(program)}`
    );
  }
  return program;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  type: number,
  data: ArrayBufferView | null,
  width: number,
  height: number,
  format: number,
  internalFormat: number,
  wrap = TextureWrap.Repeat,
  filter = TextureFilter.Nearest
): WebGLTexture {
  const texture = gl.createTexture();
  if (texture == null) {
    throw new Error("Failed to create texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[wrap]);
  const target = gl.TEXTURE_2D;
  const level = 0;
  const border = 0;
  gl.texImage2D(
    target,
    level,
    internalFormat,
    width,
    height,
    border,
    format,
    type,
    data
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

export function createFramebuffer(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture
): WebGLFramebuffer {
  const framebuffer = gl.createFramebuffer();
  if (framebuffer == null) {
    throw new Error("Failed to create framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const target = gl.FRAMEBUFFER;
  const attachment = gl.COLOR_ATTACHMENT0;
  const texTarget = gl.TEXTURE_2D;
  const level = 0;
  gl.framebufferTexture2D(target, attachment, texTarget, texture, level);
  return framebuffer;
}
