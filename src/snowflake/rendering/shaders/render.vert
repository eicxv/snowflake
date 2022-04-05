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

const float sc45 = 0.5 * sqrt(2.0); // = sin(PI / 4) = cos(PI / 4)
const mat2 negRot45 = mat2(sc45, sc45, -sc45, sc45);
const vec2 scale = vec2(sqrt(3.0), 1.0); // grid to hexagon scale

vec2 squareToHex(vec2 uv) {
    uv -= vec2(0.5, 0.5);
    uv *= scale;
    uv = negRot45 * uv;
    uv += vec2(0.5, 0.5);
    return uv;
}

// hexagonal to square lattice mapping results in a skewed grid
// neighbor order:
//   2   1
//  3  C  0
//   4   5

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vec2 h = 1.0 / u_resolution;
  v_cellCoord = squareToHex(a_textureCoord);
  v_nb0Coord = v_cellCoord + h;
  v_nb1Coord = v_cellCoord + vec2(0.0, h.y);
  v_nb2Coord = v_cellCoord - vec2(h.x, 0.0);
  v_nb3Coord = v_cellCoord - h;
  v_nb4Coord = v_cellCoord - vec2(0.0, h.y);
  v_nb5Coord = v_cellCoord + vec2(h.x, 0.0);
}