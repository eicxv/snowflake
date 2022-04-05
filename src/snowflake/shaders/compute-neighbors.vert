#version 300 es

in vec2 a_position;
in vec2 a_textureCoord;
uniform vec2 u_resolution;

out vec2 v_cellCoord;
out vec2 v_nb0Coord;
out vec2 v_nb1Coord;
out vec2 v_nb2Coord;
out vec2 v_nb3Coord;
out vec2 v_nb4Coord;
out vec2 v_nb5Coord;

// hexagonal to square lattice mapping results in a skewed grid
// neighbor order:
//   2   1
//  3  C  0
//   4   5

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vec2 h = 1.0 / u_resolution;
  v_cellCoord = a_textureCoord;
  v_nb0Coord = a_textureCoord + h;
  v_nb1Coord = a_textureCoord + vec2(0.0, h.y);
  v_nb2Coord = a_textureCoord - vec2(h.x, 0.0);
  v_nb3Coord = a_textureCoord - h;
  v_nb4Coord = a_textureCoord - vec2(0.0, h.y);
  v_nb5Coord = a_textureCoord + vec2(h.x, 0.0);
}
