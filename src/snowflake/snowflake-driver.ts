import Camera from "../webgl/camera/camera";
import { ComputeVariable } from "../webgl/compute-variable";
import { AbstractDriver } from "../webgl/driver";
import {
  createFramebuffer,
  createTexture,
  defaultComputeAttributeData,
  getExtension,
} from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import { RenderProgram } from "./path-tracer/rendering-program";
import {
  SnowflakeSimConfig,
  SnowflakeUniformCollection,
  SnowflakeVisConfig,
} from "./snowflake-config";
import {
  AttachmentProgram,
  DiffusionFreezingProgram,
  DiffusionProgram,
  FreezingProgram,
  MeltingProgram,
  NoiseProgram,
  VisualizationProgram,
} from "./snowflake-programs";

export class SnowflakeDriver extends AbstractDriver {
  width: number;
  height: number;
  vao: WebGLVertexArrayObject;
  latticeVariable: ComputeVariable;
  simConfig: SnowflakeSimConfig;
  visConfig: SnowflakeVisConfig;
  uniforms: SnowflakeUniformCollection;
  internalSteps: number;
  programs: Record<string, Program>;
  camera: Camera;
  constructor(
    canvas: HTMLCanvasElement,
    simConfig: SnowflakeSimConfig,
    visConfig: SnowflakeVisConfig
  ) {
    const glAttributes: WebGLContextAttributes = { premultipliedAlpha: false };
    super(canvas, glAttributes);

    getExtension(this.gl, "EXT_color_buffer_float");

    this.camera = new Camera(this.gl, visConfig.cameraSettings);
    this.simConfig = simConfig;
    this.visConfig = visConfig;
    this.internalSteps = visConfig.internalSteps;
    this.width = simConfig.dimensions[0];
    this.height = simConfig.dimensions[1];
    canvas.width = this.width;
    canvas.height = this.height;

    this.vao = this.createComputeVao();
    this.latticeVariable = this.createLatticeVariable();
    this.uniforms = {
      u_alpha: simConfig.alpha,
      u_beta: simConfig.beta,
      u_theta: simConfig.theta,
      u_gamma: simConfig.gamma,
      u_mu: simConfig.mu,
      u_kappa: simConfig.kappa,
      u_rho: simConfig.rho,
      u_sigma: simConfig.sigma,
      u_resolution: simConfig.dimensions,
      u_latticeTexture: this.latticeVariable.getTexture(),
      u_step: this.steps,
      u_viewProjectionMatrix: this.camera.viewProjectionMatrix,
      u_cameraPosition: this.camera.position,
    };
    this.programs = {
      attachment: new AttachmentProgram(this.gl, this.uniforms, this.vao, null),
      diffusion: new DiffusionProgram(this.gl, this.uniforms, this.vao, null),
      melting: new MeltingProgram(this.gl, this.uniforms, this.vao, null),
      freezing: new FreezingProgram(this.gl, this.uniforms, this.vao, null),
      diffusionFreezing: new DiffusionFreezingProgram(
        this.gl,
        this.uniforms,
        this.vao,
        null
      ),
      noise: new NoiseProgram(this.gl, this.uniforms, this.vao, null),
      visualization: new VisualizationProgram(
        this.gl,
        this.uniforms,
        this.vao,
        null
      ),
      render: new RenderProgram(this.gl, this.uniforms, this.vao, null),
    };
    this.gl.blendEquation(this.gl.FUNC_ADD);
    this.gl.blendFunc(this.gl.ONE, this.gl.ZERO);
  }

  animate(): void {
    if (this.steps >= this.simConfig.steps) {
      this.stopAnimation();
      return;
    }
    for (let _ = 0; _ < this.internalSteps; _++) {
      this.step();
    }
    this.visualize();
    this.animateId = requestAnimationFrame(this.animate);
  }

  step(): void {
    this.gl.viewport(0, 0, this.width, this.height);
    const variable = this.latticeVariable;

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.diffusion.framebuffer = variable.getFramebuffer();
    this.programs.diffusion.run();

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.freezing.framebuffer = variable.getFramebuffer();
    this.programs.freezing.run();

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.attachment.framebuffer = variable.getFramebuffer();
    this.programs.attachment.run();

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.melting.framebuffer = variable.getFramebuffer();
    this.programs.melting.run();

    if (this.uniforms.u_sigma != 0) {
      this.uniforms.u_latticeTexture = variable.getTexture();
      variable.advance();
      this.programs.noise.framebuffer = variable.getFramebuffer();
      this.programs.noise.run();
    }

    this.steps += 1;
    this.uniforms.u_step = this.steps;
  }

  render(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.latticeVariable.getTexture();
    this.programs.render.run();
  }

  visualize(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.latticeVariable.getTexture();
    this.programs.visualization.run();
  }

  initialState(): ArrayBufferView {
    const [width, height] = this.simConfig.dimensions;
    const size = 4 * height * width;
    const defaultCell = [0, 0, 0, this.simConfig.rho];
    const state = new Float32Array(size);
    for (let i = 0; i < size; i += 4) {
      for (let j = 0; j < 4; j++) {
        state[i + j] = defaultCell[j];
      }
    }
    const center = 4 * (Math.floor(height / 2) * width + Math.floor(width / 2));
    state[center] = 1; // a = 1
    state[center + 2] = 1; // c = 1
    state[center + 3] = 0; // d = 0
    return state;
  }

  createLatticeVariable(): ComputeVariable {
    const gl = this.gl;
    const textureData = [this.initialState(), null];
    const internalFormat = gl.RGBA32F;
    const format = gl.RGBA;
    const textures = textureData.map((texData) =>
      createTexture(
        gl,
        gl.FLOAT,
        texData,
        this.width,
        this.height,
        format,
        internalFormat
      )
    );

    const framebuffers = textures.map((texture) =>
      createFramebuffer(gl, texture)
    );
    const concentrationVariable = new ComputeVariable(textures, framebuffers);
    return concentrationVariable;
  }

  createComputeVao(): WebGLVertexArrayObject {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, defaultComputeAttributeData, gl.STATIC_DRAW);
    const attributes = {
      a_position: 0,
      a_textureCoord: 1,
    };
    const vao = gl.createVertexArray();
    if (vao == null) {
      throw new Error("Failed to create vertex array object");
    }
    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(attributes.a_position);
    gl.vertexAttribPointer(attributes.a_position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(attributes.a_textureCoord);
    gl.vertexAttribPointer(
      attributes.a_textureCoord,
      2,
      gl.FLOAT,
      false,
      16,
      8
    );
    gl.bindVertexArray(null);
    return vao;
  }

  dumpTexture(): Float32Array {
    const gl = this.gl;
    const height = this.width;
    const width = this.height;
    const framebuffer = this.latticeVariable.getFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buffer);

    return buffer;
  }
}
