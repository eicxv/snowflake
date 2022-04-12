#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_renderTexture;

out vec4 color;

const float c_exposure = 1.0;

vec3 lessThan_(vec3 f, float value) {
    return vec3(
        (f.x < value) ? 1.0 : 0.0,
        (f.y < value) ? 1.0 : 0.0,
        (f.z < value) ? 1.0 : 0.0
    );
}

vec3 linearToSRGB(vec3 rgb) {
    rgb = clamp(rgb, 0.0, 1.0);

    return mix(
        pow(rgb, vec3(1.0 / 2.4)) * 1.055 - 0.055,
        rgb * 12.92,
        lessThan_(rgb, 0.0031308)
    );
}

vec3 ACESFilm(vec3 col) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((col * (a * col + b)) / (col * (c * col + d) + e), 0.0, 1.0);
}

void main() {
    vec3 col = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    col *= c_exposure;
    col = ACESFilm(col);
    col = linearToSRGB(col);
    color = vec4(col, 1.0);
}