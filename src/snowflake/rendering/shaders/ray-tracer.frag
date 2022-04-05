#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.1415926538

uniform highp sampler2D u_latticeTexture;
// uniform vec3 u_cameraPosition;

in vec2 v_cellCoord;
in vec2 v_nb0Coord;
in vec2 v_nb1Coord;
in vec2 v_nb2Coord;
in vec2 v_nb3Coord;
in vec2 v_nb4Coord;
in vec2 v_nb5Coord;
out vec4 color;

vec3 normal(float nbs[6]) {
  vec2 grad = vec2(
    ( 2.0 * nbs[0]
    +       nbs[1]
    -       nbs[2]
    - 2.0 * nbs[3]
    -       nbs[4]
    +       nbs[5]) / 6.0,

    ( nbs[1]
    + nbs[2]
    - nbs[4]
    - nbs[5]) / (2.0 * sqrt(3.0))
  );
  return normalize(vec3(-grad, 1.0));
}

void main() {
  vec4 cell = texture(u_latticeTexture, v_cellCoord);

  float[6] nbs;
  nbs[0] = texture(u_latticeTexture, v_nb0Coord).z;
  nbs[1] = texture(u_latticeTexture, v_nb1Coord).z;
  nbs[2] = texture(u_latticeTexture, v_nb2Coord).z;
  nbs[3] = texture(u_latticeTexture, v_nb3Coord).z;
  nbs[4] = texture(u_latticeTexture, v_nb4Coord).z;
  nbs[5] = texture(u_latticeTexture, v_nb5Coord).z;

  vec3 n = normal(nbs);
  n = n * 0.5 + 0.5;

  color = vec4(n,1.0);
}