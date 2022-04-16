export class WebglError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebglError";
  }
}

export class WebglCreationError extends WebglError {
  constructor(object: string, message?: string) {
    message = message ?? `Failed to create ${object}`;
    super(message);
    this.name = "WebglCreationError";
  }
}

export class ContextCreationError extends WebglCreationError {
  constructor(message?: string) {
    super("Webgl2 context", message);
    this.name = "ContextCreationError";
  }
}

export class ExtensionUnavailableError extends WebglError {
  extensionName: string;

  constructor(extension: string) {
    super(`Failed to enable ${extension} extension`);
    this.name = "ExtensionUnavailableError";
    this.extensionName = extension;
  }
}

export class ProgramLinkError extends WebglCreationError {
  programInfoLog: string | null;

  constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    message?: string
  ) {
    const infoLog = gl.getProgramInfoLog(program);
    message = message ?? `Program linking failed: ${infoLog}`;
    super(message);
    this.name = "ProgramLinkError";
    this.programInfoLog = infoLog;
  }
}

export class ShaderCompilationError extends WebglCreationError {
  shaderInfoLog: string | null;

  constructor(
    gl: WebGL2RenderingContext,
    shader: WebGLShader,
    message?: string
  ) {
    const infoLog = gl.getShaderInfoLog(shader);
    message =
      message ?? `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`;
    super(message);
    this.name = "ShaderCompilationError";
    this.shaderInfoLog = infoLog;
  }
}
