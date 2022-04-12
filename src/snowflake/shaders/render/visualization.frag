#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.14159265359

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_uv;
out vec4 color;

ivec4 symmetryTfm(ivec2 p) {
    // transform hexagon coordinate to lower half of first sextant
    // returns transformed coordinates x,y; sextant index s and
    // and whether the coordinate mirrored
    int x = p.x;      //      c2   c1
    int y = p.y;      //       | /
    bool c0 = y < 0;  //       |/
    bool c1 = y > x;  //    ---+--- c0
    bool c2 = x < 0;  //      /|
                      //     / |
    int a = !c2 && !c1 ? 1 : (c2 && c1 ? -1 : 0);
    int b = c1 && !c0 ? 1 : (!c1 && c0 ? -1 : 0);
    int c = !c0 && !c2 ? 1 : (c0 && c2 ? -1 : 0);

    p = ivec2(a * x + b * y, - b * x + c * y);
    int flip = int(2 * p.y > p.x);
    p.y = flip == 1 ? p.x - p.y : p.y;

    int s = 0;
    s += int(c0 || c1);
    s += int(c0 || c2);
    s += int(c0);
    s += int(c0 && !c1);
    s += int(c0 && !c2);

    return ivec4(p, s, flip);
}

vec4 hexOffsetAndCenter(vec2 uv) {
    vec2 c1 = round(uv * vec2(1., 1. / sqrt(3.)));
    c1 *= vec2(1., sqrt(3.));
    vec2 o1 = uv - c1;
    vec2 c2 = c1 + sign(o1) * vec2(0.5, sqrt(3.) / 2.);
    vec2 o2 = uv - c2;
    vec4 o = dot(o1, o1) < dot(o2, o2) ? vec4(o1, c1) : vec4(o2, c2);
    return o;
}

vec3 iceColor(vec4 cell) {
    float c = 1.0 - 0.3 * (cell.z / u_rho);
    return vec3(c);
}

vec3 vaporColor(vec4 cell) {
    float c = 1.0 - 0.6 * cell.w / u_rho;
    return vec3(c);
}

vec2 hexCenter(vec2 uv, ivec2 res) {
    uv = (uv - 0.5) * 2. * float(res.x);
    vec2 hexCenter = hexOffsetAndCenter(uv).zw;

    // transforms hexagon centers to cartesian integer coordiantes
    hexCenter *= mat2(1., 1./sqrt(3.), 0., 2./sqrt(3.));
    return hexCenter;
}

void main () {
    ivec2 res = textureSize(u_latticeTexture, 0);

    vec2 hex = hexCenter(v_uv, res);
    ivec4 tfmData = symmetryTfm(ivec2(round(hex)));
    ivec2 coord = tfmData.xy;


    vec4 cell = texelFetch(u_latticeTexture, coord, 0);

    bool isFrozen = cell.x > 0.5;
    vec3 c = isFrozen ? iceColor(cell) : vaporColor(cell);

    color = vec4(c, 1.0);
}
