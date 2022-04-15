import { ComputeVariable } from "../webgl/compute-variable";
import {
  createFramebuffer,
  createTexture,
  defaultAttributeData,
  TextureFilter,
  TextureWrap,
} from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import {
  SnowflakeSimConfig,
  SnowflakeSimulationUniforms,
} from "./snowflake-config";
import {
  AttachmentProgram,
  DiffusionFreezingProgram,
  EnvironmentChangeProgram,
  MeltingProgram,
} from "./snowflake-simulation-programs";

export class SnowflakeSimulator {
  gl: WebGL2RenderingContext;
  variables: Record<string, ComputeVariable>;
  simConfig: SnowflakeSimConfig;
  uniforms: SnowflakeSimulationUniforms;
  internalSteps = 1;
  growCount = 0;
  programs: Record<string, Program>;
  vaos: Record<string, WebGLVertexArrayObject>;
  constructor(gl: WebGL2RenderingContext, simConfig: SnowflakeSimConfig) {
    this.gl = gl;

    this.simConfig = simConfig;
    this.variables = this.createVariables();
    this.uniforms = this.createUniforms();
    this.vaos = {
      sim: this.createVao(this.createSimAttributeData()),
      vis: this.createVao(defaultAttributeData),
    };
    this.programs = this.createPrograms();
  }

  private createPrograms(): Record<string, Program> {
    const programs = {
      diffusionFreezing: new DiffusionFreezingProgram(
        this.gl,
        this.uniforms,
        this.vaos.sim,
        null
      ),
      attachment: new AttachmentProgram(
        this.gl,
        this.uniforms,
        this.vaos.sim,
        null
      ),
      melting: new MeltingProgram(this.gl, this.uniforms, this.vaos.sim, null),
      environmentChange: new EnvironmentChangeProgram(
        this.gl,
        this.uniforms,
        this.vaos.sim,
        null
      ),
    };
    return programs;
  }

  private createUniforms(): SnowflakeSimulationUniforms {
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
      u_nu: simConfig.nu,
      u_latticeTexture: this.variables.lattice.getTexture(),
    };
    return uniforms;
  }

  private createVariables(): Record<string, ComputeVariable> {
    const simResolution = this.calcSimResolution();
    const variables = {
      lattice: this.createVariable(
        simResolution,
        this.initialState(simResolution),
        2
      ),
    };
    return variables;
  }

  private calcSimResolution(): [number, number] {
    const x = this.simConfig.latticeLongRadius;
    const y = Math.ceil(x / 2) + 1;
    return [x, y];
  }

  grow(cycles: number): void {
    const [width, height] = this.variables.lattice.resolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;
    this.growCount += cycles;

    for (let _ = 0; _ < cycles; _++) {
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
    }
  }

  environmentChange(): void {
    const [width, height] = this.variables.lattice.resolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    variable.advance();
    this.programs.environmentChange.framebuffer = variable.getFramebuffer();
    this.programs.environmentChange.run();
  }

  initialState(resolution: [number, number]): Float32Array {
    const [width, height] = resolution;
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

  getSnowflakeRadius(): number {
    const gl = this.gl;
    const width = this.variables.lattice.resolution[0];
    const framebuffer = this.variables.lattice.getFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width);
    gl.readPixels(0, 0, width, 1, gl.RGBA, gl.FLOAT, buffer);

    return this.findFirstNonFrozenCell(buffer);
  }

  private findFirstNonFrozenCell(values: ArrayLike<number>): number {
    let left = 0;
    let right = values.length / 4 - 1;
    const target = 0;

    while (left < right) {
      const mid: number = Math.floor((left + right) / 2);

      if (values[mid * 4] > target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }

  private createVao(attributeData: Float32Array): WebGLVertexArrayObject {
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

  private createSimAttributeData(): Float32Array {
    const [width, height] = this.variables.lattice.resolution;
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

  protected createVariable(
    resolution: [number, number],
    initialData: Float32Array | null = null,
    numberOfTextures: number = 2,
    wrap?: TextureWrap,
    filter?: TextureFilter
  ): ComputeVariable {
    const gl = this.gl;
    const textureData: Array<Float32Array | null> = new Array(
      numberOfTextures
    ).fill(null);
    textureData[0] = initialData;
    const textures = textureData.map((texData) =>
      this.createTexture(resolution, texData, wrap, filter)
    );

    const framebuffers = textures.map((texture) =>
      createFramebuffer(gl, texture)
    );
    const concentrationVariable = new ComputeVariable(
      textures,
      framebuffers,
      resolution
    );
    return concentrationVariable;
  }

  private createTexture(
    resolution: [number, number],
    textureData: Float32Array | null = null,
    wrap?: TextureWrap,
    filter?: TextureFilter
  ): WebGLTexture {
    const gl = this.gl;
    const [width, height] = resolution;
    const internalFormat = gl.RGBA32F;
    const type = gl.FLOAT;
    const format = gl.RGBA;
    return createTexture(
      gl,
      type,
      textureData,
      width,
      height,
      format,
      internalFormat,
      wrap,
      filter
    );
  }
}
