#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_cellCoord;
out vec4 color;

const float sc = 0.5 * sqrt(2.0); // = sin(PI / 4) = sin(PI / 4)
const mat2 rot45 = mat2(sc, -sc, sc, sc);
const vec2 scale = vec2(1.0 / sqrt(3.0), 1.0); // grid to hexagon scale

vec2 squareToHex(vec2 uv, float zoom) {
    uv -= vec2(0.5, 0.5);
    uv *= (1.0 / zoom) * vec2(1.0, sqrt(3.0));
    uv = rot45 * uv;
    uv += vec2(0.5, 0.5);
    return uv;
}

vec3 iceColor(vec4 cell) {
    float c = 1.0 - 0.3 * (cell.z / u_rho);
    return vec3(c);
}

vec3 vaporColor(vec4 cell) {
    float c = 1.0 - 0.6 * cell.w / u_rho;
    return vec3(c);
}

void main() {
    vec2 uv = squareToHex(v_cellCoord, 1.0);
    vec4 cell = texture(u_latticeTexture, uv);
    bool isFrozen = cell.x > 0.5;
    vec3 c = isFrozen ? iceColor(cell) : vaporColor(cell);
    color = vec4(c,1.0);
}
