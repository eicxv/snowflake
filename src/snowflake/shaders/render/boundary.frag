#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;

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
    ivec2 res = textureSize(u_latticeTexture, 0);
     p = p.x >= res.x ? ivec2(p.x - 2, p.y - 1) : p;
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
    vec4[6] n;
    ivec2 c;

    c = aB(aR(p + ivec2(1, 0)));
    n[0] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aR(p + ivec2(1, 1)));
    n[1] = texelFetch(u_latticeTexture, c, 0);

    c = aT(p + ivec2(0, 1));
    n[2] = texelFetch(u_latticeTexture, c, 0);

    c = aT(p + ivec2(-1, 0));
    n[3] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aB(p + ivec2(-1, -1)));
    n[4] = texelFetch(u_latticeTexture, c, 0);

    c = aR(aB(p + ivec2(0, -1)));
    n[5] = texelFetch(u_latticeTexture, c, 0);

    return n;
}

float nFN(vec4[6] n) {
    for (int i = 0; i < 6; i++) {
        if (n[i].x < 0.5) {
            return 1.0;
        };
    }
    return 0.0;
}

void main() {
    ivec2 cc = ivec2(gl_FragCoord.xy);
    vec4 c = texelFetch(u_latticeTexture, cc, 0);
    vec4[6] nbs = ngbs(cc);

    if (c.x < 0.5) {
        s = vec4(0.0);
    } else {
        s = vec4(1., nFN(nbs), c.z, 0.);
    }
}
