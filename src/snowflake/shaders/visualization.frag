#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define SQRT3 1.73205080757
#define INV_SQRT3 0.57735026919

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_uv;
out vec4 color;

ivec2 symmetryTfm(ivec2 p) {
    // transform hexagon coordinate to lower half of first sextant
    bool c0 = p.y >= 0;   //        c1
    bool c1 = p.y >= p.x; //    c2 | /
    bool c2 = p.x <= 0;   //       |/   c0
    bool c3 = p.y <= 0;   //    ---+---
    bool c4 = p.x > p.y;  //  c3  /|
    bool c5 = p.x >= 0;   //     / | c5
                          //     c4
    int a = c5 && !c1 ? 1 : (c2 && !c4 ? -1 : 0);
    int b = c1 && !c3 ? 1 : (c4 && !c0 ? -1 : 0);
    int c = c0 && !c2 ? 1 : (c3 && !c5 ? -1 : 0);

    p = ivec2(a * p.x + b * p.y, - b * p.x + c * p.y);
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

vec3 iceColor(vec4 cell) {
    float c = 1.0 - 0.3 * (cell.z / u_rho);
    return vec3(c);
}

vec3 vaporColor(vec4 cell) {
    float c = 1.0 - 0.6 * cell.w / u_rho;
    return vec3(c);
}

vec4 hexOffsetAndCenter(vec2 uv) {
    vec2 c1 = round(uv * vec2(1., INV_SQRT3));
    vec2 o1 = uv - c1 * vec2(1., SQRT3);;
    vec2 c2 = c1 + sign(o1) * 0.5;
    vec2 o2 = uv - c2 * vec2(1., SQRT3);;
    return dot(o1, o1) < dot(o2, o2) ? vec4(o1, c1) : vec4(o2, c2);
}

void main () {
    ivec2 res = textureSize(u_latticeTexture, 0);

    vec2 uv = v_uv;
    uv = (uv - 0.5) * 2.;
    uv *= float(res.x);
    vec4 hex = hexOffsetAndCenter(uv);
    vec2 hexCenter = hex.zw;

    mat2 tfm = mat2(1., 1., 0., 2.);
    hexCenter = hexCenter * tfm;

    ivec2 coord = symmetryTfm(ivec2(hexCenter));
    vec4 cell = texelFetch(u_latticeTexture, coord, 0);

    bool isFrozen = cell.x > 0.5;
    vec3 c = isFrozen ? iceColor(cell) : vaporColor(cell);
    color = vec4(c,1.0);
}