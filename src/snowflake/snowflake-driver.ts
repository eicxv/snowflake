import Camera from "../webgl/camera/camera";
import { ComputeVariable } from "../webgl/compute-variable";
import { AbstractDriver } from "../webgl/driver";
import {
  createFramebuffer,
  createTexture,
  defaultAttributeData,
  getExtension,
} from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import {
  SnowflakeSimConfig,
  SnowflakeUniformCollection,
  SnowflakeVisConfig,
} from "./snowflake-config";
import {
  AttachmentProgram,
  DiffusionFreezingProgram,
  DisplayProgram,
  DispProgram,
  FillProgram,
  MeltingProgram,
  NormalProgram,
  RenderProgram,
  VisualizationProgram,
} from "./snowflake-programs";

export class SnowflakeDriver extends AbstractDriver {
  computeVao: WebGLVertexArrayObject;
  visualizationVao: WebGLVertexArrayObject;
  variables: Record<"lattice" | "render", ComputeVariable>;
  simConfig: SnowflakeSimConfig;
  visConfig: SnowflakeVisConfig;
  uniforms: SnowflakeUniformCollection;
  internalSteps: number;
  simResolution: [number, number];
  programs: Record<string, Program>;
  camera: Camera;
  constructor(
    canvas: HTMLCanvasElement,
    simConfig: SnowflakeSimConfig,
    visConfig: SnowflakeVisConfig
  ) {
    const glAttributes: WebGLContextAttributes = {
      premultipliedAlpha: false,
    };
    super(canvas, glAttributes);

    getExtension(this.gl, "EXT_color_buffer_float");

    this.camera = new Camera(this.gl, visConfig.cameraSettings);
    this.simConfig = simConfig;
    this.visConfig = visConfig;
    this.internalSteps = visConfig.internalSteps;

    this.simResolution = this.calcSimResolution();
    this.computeVao = this.createComputeVao(this.createAttributeData());
    this.visualizationVao = this.createComputeVao(defaultAttributeData);
    this.variables = {
      lattice: this.createVariable(this.simResolution, this.initialState()),
      render: this.createVariable(this.visConfig.resolution),
    };
    this.uniforms = this.createUniforms();
    this.programs = this.createPrograms();
  }

  private createPrograms(): Record<string, Program> {
    const programs = {
      diffusionFreezing: new DiffusionFreezingProgram(
        this.gl,
        this.uniforms,
        this.computeVao,
        null
      ),
      attachment: new AttachmentProgram(
        this.gl,
        this.uniforms,
        this.computeVao,
        null
      ),
      melting: new MeltingProgram(
        this.gl,
        this.uniforms,
        this.computeVao,
        null
      ),
      visualization: new VisualizationProgram(
        this.gl,
        this.uniforms,
        this.visualizationVao,
        null
      ),
      normal: new NormalProgram(this.gl, this.uniforms, this.computeVao, null),
      render: new RenderProgram(
        this.gl,
        this.uniforms,
        this.visualizationVao,
        null
      ),
      display: new DisplayProgram(
        this.gl,
        this.uniforms,
        this.visualizationVao,
        null
      ),
      fill: new FillProgram(this.gl, this.uniforms, this.computeVao, null),
      disp: new DispProgram(
        this.gl,
        this.uniforms,
        this.visualizationVao,
        null
      ),
    };
    return programs;
  }

  private createUniforms(): SnowflakeUniformCollection {
    const simConfig = this.simConfig;
    const uniforms = {
      u_alpha: simConfig.alpha,
      u_beta: simConfig.beta,
      u_theta: simConfig.theta,
      u_gamma: simConfig.gamma,
      u_mu: simConfig.mu,
      u_kappa: simConfig.kappa,
      u_rho: simConfig.rho,
      u_sigma: simConfig.sigma,
      u_latticeTexture: this.variables.lattice.getTexture(),
      u_renderTexture: this.variables.render.getTexture(),
      u_step: this.steps,
      u_viewProjectionMatrix: this.camera.viewProjectionMatrix,
      u_viewMatrix: this.camera.viewMatrix,
      u_cameraPosition: this.camera.position,
    };
    return uniforms;
  }

  private createAttributeData(): Float32Array {
    const [width, height] = this.simResolution;
    const hx = 2 / width;
    const hy = 2 / height;
    const shiftX = -hx; // shift bottom left x-coord
    const shiftY = width % 2 == 0 ? -hy / 2 : -hy; // shift top right y-coord

    // prettier-ignore
    const attributeData = new Float32Array([
      -1.0 + shiftX, -1.0, 0.0, 0.0,
      1.0, 1.0 + shiftY, 1.0, 1.0,
      1.0, -1.0, 1.0, 0.0,
    ]);
    return attributeData;
  }

  private calcSimResolution(): [number, number] {
    const x = this.simConfig.latticeLongRadius;
    const y = Math.ceil(x / 2) + 1;
    return [x, y];
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
    const [width, height] = this.simResolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.diffusionFreezing.framebuffer = variable.getFramebuffer();
    this.programs.diffusionFreezing.run();

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.attachment.framebuffer = variable.getFramebuffer();
    this.programs.attachment.run();

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.melting.framebuffer = variable.getFramebuffer();
    this.programs.melting.run();

    this.steps += 1;
    this.uniforms.u_step = this.steps;
  }

  fill(): void {
    const [width, height] = this.simResolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.fill.framebuffer = variable.getFramebuffer();
    this.programs.fill.run();
  }

  normal(): void {
    const [width, height] = this.simResolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    this.programs.normal.framebuffer = variable.getFramebuffer(1);
    this.programs.normal.run();
  }

  render(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture(1);

    this.uniforms.u_renderTexture = this.variables.render.getTexture();
    this.variables.render.advance();
    this.programs.render.framebuffer = this.variables.render.getFramebuffer();

    this.programs.render.run();
  }

  display(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_renderTexture = this.variables.render.getTexture();
    this.programs.display.run();
  }

  disp(): void {
    this.normal();
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = variable.getTexture(1);
    this.programs.disp.framebuffer = null;
    this.programs.disp.run();
  }

  visualize(): void {
    this.normal();
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture(1);
    this.programs.visualization.run();
  }

  initialState(): Float32Array {
    const [width, height] = this.simResolution;
    const size = 4 * height * width;
    const defaultCell = [0, 0, 0, this.simConfig.rho];
    const state = new Float32Array(size);
    for (let i = 0; i < size; i += 4) {
      for (let j = 0; j < 4; j++) {
        state[i + j] = defaultCell[j];
      }
    }
    state[0] = 1; // a = 1
    state[2] = 1; // c = 1
    state[3] = 0; // d = 0
    return state;
  }

  createVariable(
    resolution: [number, number],
    initialData: Float32Array | null = null
  ): ComputeVariable {
    const gl = this.gl;
    const [width, height] = resolution;
    const textureData = [initialData, null];
    const internalFormat = gl.RGBA32F;
    const format = gl.RGBA;
    const textures = textureData.map((texData) =>
      createTexture(
        gl,
        gl.FLOAT,
        texData,
        width,
        height,
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

  private createComputeVao(
    attributeData: Float32Array
  ): WebGLVertexArrayObject {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, attributeData, gl.STATIC_DRAW);
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
    const [width, height] = this.simResolution;
    const framebuffer = this.variables.lattice.getFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buffer);

    return buffer;
  }
}
