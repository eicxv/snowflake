#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_cellCoord;
out vec4 color;

ivec2 tfmCoord(ivec2 p) {
    bool c0 = p.y >= 0;   //        c1
    bool c1 = p.y >= p.x; //    c2 | /
    bool c2 = p.x <= 0;   //       |/   c0
    bool c3 = p.y <= 0;   //    ---+---
    bool c4 = p.x > p.y;  //  c3  /|
    bool c5 = p.x >= 0;   //     / | c5
                          //     c4
    int a = c5 && !c1 ? 1 : (c2 && !c4 ? -1 : 0);
    int b = c4 && !c0 ? 1 : (c1 && !c3 ? -1 : 0);
    int c = c0 && !c2 ? 1 : (c3 && !c5 ? -1 : 0);

    p = ivec2(a * p.x + b * p.y, - b * p.x + c * p.y);
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

ivec2 adjustNbBottom(ivec2 p) {
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

ivec2 adjustNbTopleft(ivec2 p) {
    p = p.y < 0 ? ivec2(p.x + 1, 1) : p;
    return p;
}

ivec2 adjustNbRight(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
     p = p.x >= res.x ? ivec2(p.x - 2, p.y - 1) : p;
    return p;
}

ivec2 tfmNeighborCoord(ivec2 p) {
    p = adjustNbTopleft(p);
    p = adjustNbRight(p);
    p = adjustNbBottom(p);
    return p;
}

vec4[6] neighbors(ivec2 p) {
    // returns incorrect neighbors
    // for p = (0, 0) however the origin
    // is always frozen.

    // neighbor order after visualization transform:
    //   2   1
    //  3  C  0
    //   4   5
    vec4[6] nbs;
    ivec2 coord;
    coord = p + ivec2(1, 1);
    coord = adjustNbTopleft(adjustNbRight(coord));
    nbs[0] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(p + ivec2(0, 1));
    nbs[1] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(p + ivec2(-1, 0));
    nbs[2] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbBottom(p + ivec2(-1, -1));
    nbs[3] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbRight(adjustNbBottom(p + ivec2(0, -1)));
    nbs[4] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbBottom(adjustNbRight(p + ivec2(1, 0)));
    nbs[5] = texelFetch(u_latticeTexture, coord, 0);

    return nbs;
}


void main() {
    ivec2 res = textureSize(u_latticeTexture, 0);
    vec2 r = vec2(res);
    vec2 fc = gl_FragCoord.xy - vec2(0.5);

    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);

    bool isOrigin = cellCoord.x == 0 && cellCoord.y == 0;
    float a = isOrigin ? 1. : 0.;
    float b = 0.;
    float c = a;
    float d = isOrigin ? 0. : u_rho;

    color = vec4(a, b, c, d);
}
