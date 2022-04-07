#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform uint u_step;
uniform float u_sigma;

in vec2 v_uv;
out vec4 state;

float hash1( uint n ) {
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uint(0x7fffffffU))/float(0x7fffffff);
}

void main() {
    vec4 cell = texture(u_latticeTexture, v_uv);
    uint seed = u_step + uint(15731.0 * v_uv.x + 789221.0 * v_uv.y);
    cell.w += sign(hash1(seed) - 0.5) * u_sigma;
    state = cell;
}