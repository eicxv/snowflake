#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_renderTexture;

out vec4 cl;


vec3 lt(vec3 f, float value) {
    return vec3(
        (f.x < value) ? 1.0 : 0.0,
        (f.y < value) ? 1.0 : 0.0,
        (f.z < value) ? 1.0 : 0.0
    );
}

vec3 lts(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(
        pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055,
        c * 12.92,
        lt(c, 0.0031308)
    );
}

vec3 AF(vec3 g) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((g * (a * g + b)) / (g * (c * g + d) + e), 0.0, 1.0);
}

void main() {
    vec3 c = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    c = AF(c);
    c = lts(c);
    cl = vec4(c, 1.0);
}