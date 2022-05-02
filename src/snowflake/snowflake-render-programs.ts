import { Program } from "../webgl/program";
import { preprocessSource } from "./../webgl/gl-utility";
import computeFlippedSource from "./shaders/common/compute-flipped.vert?raw";
import computeSource from "./shaders/common/compute.vert?raw";
import boundarySource from "./shaders/render/boundary.frag?raw";
import displayTestSource from "./shaders/render/display-test.frag?raw";
import displaySource from "./shaders/render/display.frag?raw";
import interpolateSource from "./shaders/render/interpolate.frag?raw";
import normalSource from "./shaders/render/normal.frag?raw";
import pathTraceSource from "./shaders/render/path-trace.frag?raw";
import renderSource from "./shaders/render/render.vert?raw";
import visualizationSource from "./shaders/render/visualization.frag?raw";
import {
  SnowflakeSimulationUniforms,
  SnowflakeUniforms,
} from "./snowflake-config";

export class InterpolateProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture"];
    super(
      gl,
      interpolateSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      4
    );
  }
  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class DisplayProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_renderTexture"];
    super(
      gl,
      displaySource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      4
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_renderTexture);
    gl.uniform1i(locations.u_renderTexture, 0);
  }
}

export class DisplayTestProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_renderTexture"];
    super(
      gl,
      displayTestSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      4
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_renderTexture);
    gl.uniform1i(locations.u_renderTexture, 0);
  }
}

export class PathTraceProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer?: WebGLFramebuffer | null,
    overwrites?: Record<string, string> | null
  ) {
    const localUniforms = [
      "u_renderTexture",
      "u_normalTexture",
      "u_blend",
      "u_seed",
    ];
    overwrites = overwrites ?? {};
    const fragSource = preprocessSource(pathTraceSource, overwrites);
    super(
      gl,
      fragSource,
      renderSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      4
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.uniform1ui(locations.u_seed, uniforms.u_seed);
    gl.uniform1f(locations.u_blend, uniforms.u_blend);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_renderTexture);
    gl.uniform1i(locations.u_renderTexture, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_normalTexture);
    gl.uniform1i(locations.u_normalTexture, 2);
  }
}

export class NormalProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_normalBlend"];
    super(
      gl,
      normalSource,
      computeFlippedSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.uniform1f(locations.u_normalBlend, uniforms.u_normalBlend);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class BoundaryProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture"];
    super(
      gl,
      boundarySource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      3
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeUniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}

export class VisualizationProgram extends Program {
  constructor(
    gl: WebGL2RenderingContext,
    uniforms: SnowflakeSimulationUniforms,
    vao: WebGLVertexArrayObject,
    framebuffer: WebGLFramebuffer | null = null
  ) {
    const localUniforms = ["u_latticeTexture", "u_rho"];
    super(
      gl,
      visualizationSource,
      computeSource,
      localUniforms,
      uniforms,
      vao,
      framebuffer,
      4
    );
  }

  bindUniforms(): void {
    const gl = this.gl;
    const locations = this.locations;
    const uniforms = this.uniforms as SnowflakeSimulationUniforms;

    gl.uniform1f(locations.u_rho, uniforms.u_rho);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.u_latticeTexture);
    gl.uniform1i(locations.u_latticeTexture, 0);
  }
}
