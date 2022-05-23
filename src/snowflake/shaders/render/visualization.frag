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
out vec4 s;

ivec4 sT(ivec2 p) {
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
    int f = int(2 * p.y > p.x);
    p.y = f == 1 ? p.x - p.y : p.y;

    int s = 0;
    s += int(c0 || c1);
    s += int(c0 || c2);
    s += int(c0);
    s += int(c0 && !c1);
    s += int(c0 && !c2);

    return ivec4(p, s, f);
}

vec4 hOC(vec2 uv) {
    vec2 c1 = round(uv * vec2(1., 1. / sqrt(3.)));
    c1 *= vec2(1., sqrt(3.));
    vec2 o1 = uv - c1;
    vec2 c2 = c1 + sign(o1) * vec2(0.5, sqrt(3.) / 2.);
    vec2 o2 = uv - c2;
    vec4 o = dot(o1, o1) < dot(o2, o2) ? vec4(o1, c1) : vec4(o2, c2);
    return o;
}

vec3 iC(vec4 d) {
    float c = 1.0 - 0.3 * (d.z / u_rho);
    return vec3(c);
}

vec3 vC(vec4 d) {
    float c = 1.0 - 0.6 * d.w / u_rho;
    return vec3(c);
}

// vec3 vaporColor2(vec4 cell) {
//     float c = 1.0 - 0.6 * cell.w / u_rho;
//     vec3 col1 = vec3(0.16, 0.13, 0.1);
//     vec3 col2 = vec3(0.995, 0.988, 0.947);
//     return mix(col1, col2, c);
// }

// vec3 iceColor2(vec4 cell) {
//     float c = 1.0 - 0.36 * (cell.z / u_rho);
//     vec3 col1 = vec3(0.06, 0.03, 0.1);
//     vec3 col2 = vec3(0.789, 0.783, 0.89);
//     return mix(col1, col2, c);
// }

vec2 hC(vec2 uv, ivec2 r) {
    uv = (uv - 0.5) * 1.845 * float(r.x);
    vec2 hc = hOC(uv).zw;

    // transforms hexagon centers to cartesian integer coordiantes
    hc *= mat2(1., 1./sqrt(3.), 0., 2./sqrt(3.));
    return hc;
}

void main () {
    ivec2 r = textureSize(u_latticeTexture, 0);

    vec2 h = hC(v_uv, r);
    ivec4 td = sT(ivec2(round(h)));
    ivec2 cr = td.xy;


    vec4 c = texelFetch(u_latticeTexture, cr, 0);
    if (c.x < 0.5 && c.w == 0.0) {
        c.w = u_rho;
    }

    vec3 d = c.x > 0.5 ? iC(c) : vC(c);

    s = vec4(d, 1.0);
}
