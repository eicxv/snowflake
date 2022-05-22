import { ComputeVariable } from "../webgl/compute-variable";
import { TextureFilter, TextureWrap } from "../webgl/gl-utility";
import { Program } from "../webgl/program";
import {
  SnowflakeRenderUniforms,
  SnowflakeSimConfig,
  SnowflakeUniforms,
  SnowflakeVisConfig,
} from "./snowflake-config";
import {
  BoundaryProgram,
  DisplayProgram,
  InterpolateProgram,
  NormalProgram,
  PathTraceProgram,
  VisualizationProgram,
} from "./snowflake-render-programs";
import { SnowflakeSimulator } from "./snowflake-simulator";

export class SnowflakeRenderer extends SnowflakeSimulator {
  gl: WebGL2RenderingContext;
  visConfig: SnowflakeVisConfig;
  internalSteps = 1;
  seed = 0;
  renderStep = 0;
  declare uniforms: SnowflakeUniforms;
  constructor(
    gl: WebGL2RenderingContext,
    simConfig: SnowflakeSimConfig,
    visConfig: SnowflakeVisConfig
  ) {
    super(gl, simConfig);
    this.gl = gl;
    this.visConfig = visConfig;
    Object.assign(this.variables, this.createVisVariables());
    Object.assign(this.uniforms, this.createVisUniforms());
    Object.assign(this.programs, this.createVisPrograms());
  }

  private createVisPrograms(): Record<string, Program> {
    const programs = {
      normal: new NormalProgram(this.gl, this.uniforms, this.vaos.sim, null),
      boundary: new BoundaryProgram(
        this.gl,
        this.uniforms,
        this.vaos.sim,
        null
      ),
      pathTrace: new PathTraceProgram(
        this.gl,
        this.uniforms,
        this.vaos.vis,
        null,
        this.visConfig.overwrites?.pathTrace
      ),
      display: new DisplayProgram(this.gl, this.uniforms, this.vaos.vis, null),
      interpolate: new InterpolateProgram(
        this.gl,
        this.uniforms,
        this.vaos.vis,
        null
      ),
      visualization: new VisualizationProgram(
        this.gl,
        this.uniforms,
        this.vaos.vis,
        null
      ),
    };
    return programs;
  }

  private createVisUniforms(): SnowflakeRenderUniforms {
    const uniforms = {
      u_renderTexture: this.variables.render.getTexture(),
      u_normalTexture: this.variables.normal.getTexture(),
      u_viewMatrix: this.visConfig.viewMatrix,
      u_cameraPosition: this.visConfig.cameraPosition,
      u_normalBlend: 0.9,
      u_seed: 0,
      u_blend: 1,
    };
    return uniforms;
  }

  private createVisVariables(): Record<string, ComputeVariable> {
    const variables = {
      render: this.createVariable(this.visConfig.resolution, null, 2),
      normal: this.createVariable(
        this.visConfig.resolution,
        null,
        1,
        TextureWrap.ClampToEdge,
        TextureFilter.Linear
      ),
    };
    return variables;
  }

  changeResolution(resolution: number): void {
    this.visConfig.resolution = [resolution, resolution];
    this.variables = { ...this.variables, ...this.createVisVariables() };
    this.uniforms.u_renderTexture = this.variables.render.getTexture();
    this.uniforms.u_normalTexture = this.variables.normal.getTexture();
  }

  normal(): void {
    const [width, height] = this.variables.lattice.resolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    this.programs.normal.framebuffer = variable.getFramebuffer(1);
    this.programs.normal.run();
  }

  boundaryLength(): number {
    const gl = this.gl;
    const [width, height] = this.variables.lattice.resolution;
    gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;
    const framebuffer = this.variables.lattice.getFramebuffer(1);

    this.uniforms.u_latticeTexture = variable.getTexture();
    this.programs.boundary.framebuffer = framebuffer;
    this.programs.boundary.run();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buffer);

    const [boundaryLength, area] = this.countBoundaryLength(
      buffer,
      width,
      height
    );
    const boundaryLengthPerArea = boundaryLength / area;
    return boundaryLengthPerArea;
  }

  stats(): {
    boundaryLength: number;
    area: number;
    mass: number;
    radius: number;
    time: number;
  } {
    const gl = this.gl;
    const [width, height] = this.variables.lattice.resolution;
    gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;
    const framebuffer = this.variables.lattice.getFramebuffer(1);

    this.uniforms.u_latticeTexture = variable.getTexture();
    this.programs.boundary.framebuffer = framebuffer;
    this.programs.boundary.run();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const buffer = new Float32Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buffer);

    const [boundaryLength, area] = this.countBoundaryLength(
      buffer,
      width,
      height
    );
    const mass = this.countFrozenMass(buffer, width, height);
    const radius = this.findFirstNonFrozenCell(buffer.slice(0, width * 4));
    return { boundaryLength, area, mass, radius, time: this.growthCount };
  }

  updateNormalBlend(): void {
    const bpa = this.boundaryLength();
    const normalBlend = this.estimateNormalBlend(bpa);
    this.uniforms.u_normalBlend = normalBlend;
  }

  private estimateNormalBlend(x: number): number {
    return (2 / Math.PI) * 0.984 * Math.atan(0.96e2 * x);
  }

  protected countBoundaryLength(
    cells: Float32Array,
    width: number,
    height: number
  ): [number, number] {
    let boundaryLength = 0;
    let area = 0;
    for (let j = 0; j < height; j++) {
      for (let i = 2 * j; i < width; i++) {
        const index = (i + j * width) * 4;
        boundaryLength += cells[index + 1] > 0 ? 1 : 0;
        area += cells[index] > 0 ? 1 : 0;
      }
    }
    return [boundaryLength, area];
  }

  countFrozenMass(cells: Float32Array, width: number, height: number): number {
    let mass = 0;
    for (let j = 0; j < height; j++) {
      for (let i = 2 * j; i < width; i++) {
        const index = (i + j * width) * 4;
        mass += cells[index + 2];
      }
    }
    return mass;
  }

  pathTrace(cycles: number = 1): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture(1);

    for (let _ = 0; _ < cycles; _++) {
      this.uniforms.u_renderTexture = this.variables.render.getTexture();
      this.variables.render.advance();
      this.programs.pathTrace.framebuffer =
        this.variables.render.getFramebuffer();

      this.uniforms.u_blend = this.blend(this.renderStep);
      this.programs.pathTrace.run();
      this.renderStep += 1;
      this.uniforms.u_seed += 1;
    }
  }

  blend(step: number): number {
    return 1 / (step + 1);
  }

  interpolate(): void {
    this.normal();
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture(1);
    this.programs.interpolate.framebuffer =
      this.variables.normal.getFramebuffer();

    this.programs.interpolate.run();
  }

  display(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_renderTexture = this.variables.render.getTexture();
    this.programs.display.run();
  }

  visualize(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture();
    this.programs.visualization.run();
  }
}
