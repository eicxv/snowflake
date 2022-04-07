#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;

in vec2 v_uv;
out vec4 color;

void main() {
  vec4 cell = texture(u_latticeTexture, v_uv);
  color = vec4(cell.xyz, 1.0);
}