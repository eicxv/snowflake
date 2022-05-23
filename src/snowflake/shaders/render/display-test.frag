#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_renderTexture;

out vec4 s;

void main() {
    vec4 c = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0);
    // c.w = c.w > 0.5 ? 1.0 : 0.0;
    // s = vec4(c.www, 1.0);
    s = vec4(c.xyz * 0.5 + 0.5, 1.0);
}