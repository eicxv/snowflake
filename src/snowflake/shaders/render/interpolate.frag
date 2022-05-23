#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.14159265359

uniform highp sampler2D u_latticeTexture;

in vec2 v_uv;
out vec4 cl;

// like sign but spz(0.) = 1.
float spz(float x) {
    return step(0., x) * 2. - 1.;
}

vec2 spz(vec2 x) {
    return step(0., x) * 2. - 1.;
}

vec3 spz(vec3 x) {
    return step(0., x) * 2. - 1.;
}

vec3 bcc(vec2 p, vec2 a, vec2 b, vec2 c) {
    float id = 1. / ((b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y));
    float w0 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) * id;
    float w1 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) * id;
    float w2 = 1.0 - w0 - w1;
    return vec3(w0, w1, w2);
}

ivec2 sT(ivec2 p, out int sx, out int f) {
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
    f = int(2 * p.y > p.x);
    p.y = f == 1 ? p.x - p.y : p.y;

    sx = 0;
    sx += int(c0 || c1);
    sx += int(c0 || c2);
    sx += int(c0);
    sx += int(c0 && !c1);
    sx += int(c0 && !c2);

    return p;
}

vec3 rN(vec3 n, int sx, int f) {
    mat2 rf = mat2(sqrt(3.) / 2., 0.5, 0.5, -sqrt(3.) / 2.);
    float a = (float(sx) * 2. + float(f)) * PI / 6.;
    float s = sin(a);
    float c = cos(a);
    mat2 r = mat2(c, s, -s,  c);
    if (f == 1) {
        n.xy = rf * n.xy;
    }
    n.xy = r * n.xy;
    return n;
}

ivec2 nMC(ivec2 c, ivec2 r) {
    return r - c - 1;
}

void cH(vec2 uv, out vec2 c0, out vec2 c1, out vec2 c2) {
    c0 = round(uv * vec2(1., inversesqrt(3.)));
    c0 *= vec2(1., sqrt(3.));
    vec2 os0 = uv - c0;
    vec2 s = spz(os0);
    c1 = c0 + s * vec2(0.5, sqrt(3.) / 2.);
    vec2 os1 = uv - c1;

    float s0 = os0.x * sqrt(3.);
    bool qd = s0 < os0.y == -s0 < os0.y;
    if (qd) {
        c2 = vec2(c1.x - s.x, c1.y);
    } else {
        c2 = vec2(c0.x + s.x, c0.y);
    }
}

vec4 iV(vec2 uv, ivec2 r) {
    vec2 c0, c1, c2;
    cH(uv, c0, c1, c2);
    vec3 w = bcc(uv, c0, c1, c2);

    // transforms hexagon centers to cartesian integer coordiantes
    mat2 tic = mat2(1., 1./sqrt(3.), 0., 2./sqrt(3.));
    c0 *= tic;
    c1 *= tic;
    c2 *= tic;

    ivec2 c;
    int sx, f;
    vec4 v = vec4(0.);
    vec4 t;

    c = sT(ivec2(round(c0)), sx, f);
    c = nMC(c, r);
    t = texelFetch(u_latticeTexture, c, 0);
    t.xyz = rN(t.xyz, sx, f);
    if (t.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    v += w.x * t;

    c = sT(ivec2(round(c1)), sx, f);
    c = nMC(c, r);
    t = texelFetch(u_latticeTexture, c, 0);
    t.xyz = rN(t.xyz, sx, f);
    if (t.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    v += w.y * t;

    c = sT(ivec2(round(c2)), sx, f);
    c = nMC(c, r);
    t = texelFetch(u_latticeTexture, c, 0);
    t.xyz = rN(t.xyz, sx, f);
    if (t.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    v += w.z * t;

    v.xyz = normalize(v.xyz);
    return v;
}

void main () {
    ivec2 r = textureSize(u_latticeTexture, 0);
    vec2 uv = (v_uv - 0.5) * 2. * float(r.x);

    vec4 iv = iV(uv, r);

    if (iv.w < 0.0001) {
        iv.xyz = vec3(0., 0., 1.);
    }

    cl = iv;
}