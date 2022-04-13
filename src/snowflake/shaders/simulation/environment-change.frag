#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_nu;

out vec4 state;

void main() {
    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);

    if (cell.x < 0.5) {
        cell.w = cell.w * u_nu;
    }

    state = cell;
}
