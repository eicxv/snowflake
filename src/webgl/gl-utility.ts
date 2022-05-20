import {
  ExtensionUnavailableError,
  ProgramLinkError,
  ShaderCompilationError,
  WebglCreationError,
} from "./errors";
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
    throw new WebglCreationError("attribute buffer");
  }
  return buffer;
}

export function getExtension(
  gl: WebGL2RenderingContext,
  extension: string
): void {
  const ext = gl.getExtension(extension);
  if (ext == null) {
    throw new ExtensionUnavailableError(extension);
  }
}

export function compileShader(
  gl: WebGL2RenderingContext,
  source: ShaderSource,
  type: ShaderType
): WebGLShader {
  const shader = gl.createShader(type);
  if (shader == null) {
    throw new WebglCreationError("shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

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
        console.warn(`Failed to create location ${unifName}`);
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
    throw new WebglCreationError("program");
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
    for (const shader of [vertShader, fragShader]) {
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        throw new ShaderCompilationError(gl, shader);
      }
    }
    throw new ProgramLinkError(gl, program);
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
    throw new WebglCreationError("texture");
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
    throw new WebglCreationError("framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const target = gl.FRAMEBUFFER;
  const attachment = gl.COLOR_ATTACHMENT0;
  const texTarget = gl.TEXTURE_2D;
  const level = 0;
  gl.framebufferTexture2D(target, attachment, texTarget, texture, level);
  return framebuffer;
}

export function preprocessSource(
  source: string,
  defineOverwrites: { [key: string]: string }
): string {
  for (const [key, value] of Object.entries(defineOverwrites)) {
    source = source.replace(
      new RegExp(`#define ${key} .*`, "g"),
      `#define ${key} ${value}`
    );
  }
  return source;
}

function clientWaitAsync(
  gl: WebGL2RenderingContext,
  sync: WebGLSync,
  flags: number,
  interval_ms: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    function test(): void {
      const res = gl.clientWaitSync(sync, flags, 0);
      if (res == gl.WAIT_FAILED) {
        reject();
        return;
      }
      if (res == gl.TIMEOUT_EXPIRED) {
        setTimeout(test, interval_ms);
        return;
      }
      resolve();
    }
    test();
  });
}

async function getBufferSubDataAsync(
  gl: WebGL2RenderingContext,
  target: number,
  buffer: WebGLBuffer,
  srcByteOffset: number,
  dstBuffer: ArrayBufferView,
  dstOffset?: number,
  length?: number
): Promise<void> {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  if (sync == null) {
    throw "sync is null";
  }

  await clientWaitAsync(gl, sync, 0, 10);
  gl.deleteSync(sync);

  gl.bindBuffer(target, buffer);
  gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
  gl.bindBuffer(target, null);
}

export async function readPixelsAsync(
  gl: WebGL2RenderingContext,
  x: number,
  y: number,
  w: number,
  h: number,
  format: number,
  type: number,
  dest: ArrayBufferView
): Promise<ArrayBufferView> {
  const buf = gl.createBuffer();
  if (buf == null) {
    throw new WebglCreationError("buffer");
  }
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ);
  gl.readPixels(x, y, w, h, format, type, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

  await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest);

  gl.deleteBuffer(buf);
  return dest;
}
