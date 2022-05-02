import Camera from "../webgl/camera/camera";
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
  DisplayTestProgram,
  InterpolateProgram,
  NormalProgram,
  PathTraceProgram,
  VisualizationProgram,
} from "./snowflake-render-programs";
import { SnowflakeSimulator } from "./snowflake-simulator";

export class SnowflakeRenderer extends SnowflakeSimulator {
  gl: WebGL2RenderingContext;
  visConfig: SnowflakeVisConfig;
  camera: Camera;
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
    this.camera = new Camera(this.gl, visConfig.cameraSettings);
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
      displayTest: new DisplayTestProgram(
        this.gl,
        this.uniforms,
        this.vaos.vis,
        null
      ),
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
      u_viewMatrix: this.camera.viewMatrix,
      u_cameraPosition: this.camera.position,
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

  updateNormalBlend(): void {
    const bpa = this.boundaryLength();
    const normalBlend = this.estimateNormalBlend(bpa);
    console.log("normalBlend", normalBlend);
    this.uniforms.u_normalBlend = normalBlend;
  }

  private estimateNormalBlend(x: number): number {
    return (2 / Math.PI) * 0.995 * Math.atan(0.96e2 * x);
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

  displayTest(): void {
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_renderTexture = this.variables.normal.getTexture();
    this.programs.displayTest.run();
  }

  visualize(): void {
    console.log("visualizing");
    const [width, height] = this.visConfig.resolution;
    this.gl.viewport(0, 0, width, height);
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;

    this.uniforms.u_latticeTexture = this.variables.lattice.getTexture();
    this.programs.visualization.run();
  }
}
