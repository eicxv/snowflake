#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_kappa;

out vec4 s;

ivec2 aT(ivec2 p) {
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

ivec2 aB(ivec2 p) {
    p = p.y < 0 ? ivec2(p.x + 1, 1) : p;
    return p;
}

ivec2 aR(ivec2 p) {
    ivec2 r = textureSize(u_latticeTexture, 0);
     p = p.x >= r.x ? ivec2(p.x - 2, p.y - 1) : p;
    return p;
}

vec4[6] ngbs(ivec2 p) {
    // returns incorrect neighbors
    // for p = (0, 0) however the
    // origin is always frozen.

    // neighbor order after visualization transform:
    //   2   1
    //  3  C  0
    //   4   5
    vec4[6] nbs;
    ivec2 c;

    c = aB(aR(p + ivec2(1, 0)));
    nbs[0] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aR(p + ivec2(1, 1)));
    nbs[1] = texelFetch(u_latticeTexture, c, 0);

    c = aT(p + ivec2(0, 1));
    nbs[2] = texelFetch(u_latticeTexture, c, 0);

    c = aT(p + ivec2(-1, 0));
    nbs[3] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aB(p + ivec2(-1, -1)));
    nbs[4] = texelFetch(u_latticeTexture, c, 0);

    c = aR(aB(p + ivec2(0, -1)));
    nbs[5] = texelFetch(u_latticeTexture, c, 0);

    return nbs;
}

vec4 df(vec4 c, vec4[6] nbs) {
    float d = c.w;
    float fn = 0.0;
    for (int i = 0; i < 6; i++) {
        d += nbs[i].x > 0.5 ? c.w : nbs[i].w;
        fn += nbs[i].x;
    }
    c.w = d / 7.0;

    if (fn > 0.5) {
        c.y += (1.0 - u_kappa) * c.w;
        c.z += u_kappa * c.w;
        c.w = 0.0;
    }
    return c;
}

void main() {
    ivec2 cc = ivec2(gl_FragCoord.xy);
    vec4 c = texelFetch(u_latticeTexture, cc, 0);
    vec4[6] nbs = ngbs(cc);

    if (c.x > 0.5) {
        s = c;
        return;
    }

    c = df(c, nbs);
    s = c;
}