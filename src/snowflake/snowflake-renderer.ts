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
      u_viewProjectionMatrix: this.camera.viewProjectionMatrix,
      u_viewMatrix: this.camera.viewMatrix,
      u_cameraPosition: this.camera.position,
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

  normal(): void {
    const [width, height] = this.variables.lattice.resolution;
    this.gl.viewport(0, 0, width, height);
    const variable = this.variables.lattice;

    this.uniforms.u_latticeTexture = variable.getTexture();
    this.programs.normal.framebuffer = variable.getFramebuffer(1);
    this.programs.normal.run();
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

      this.programs.pathTrace.run();
      this.renderStep += 1;
      this.uniforms.u_seed += 1;
      this.uniforms.u_blend = this.blend(this.renderStep);
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
