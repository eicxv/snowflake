#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_renderTexture;

out vec4 color;

void main() {
    vec4 cell = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0);
    // cell.w = cell.w > 0.5 ? 1.0 : 0.0;
    // color = vec4(cell.www, 1.0);
    color = vec4(cell.xyz * 0.5 + 0.5, 1.0);
}