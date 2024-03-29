#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_nu;

out vec4 s;

void main() {
    ivec2 cc = ivec2(gl_FragCoord.xy);
    vec4 c = texelFetch(u_latticeTexture, cc, 0);

    if (c.x < 0.5) {
        c.w = c.w * u_nu;
    }

    s = c;
}
