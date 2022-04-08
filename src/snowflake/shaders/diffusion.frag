#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;

out vec4 state;

ivec2 adjustNbTopleft(ivec2 p) {
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

ivec2 adjustNbBottom(ivec2 p) {
    p = p.y < 0 ? ivec2(p.x + 1, 1) : p;
    return p;
}

ivec2 adjustNbRight(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
     p = p.x >= res.x ? ivec2(p.x - 2, p.y - 1) : p;
    return p;
}

vec4[6] neighbors(ivec2 p) {
    // returns incorrect neighbors
    // for p = (0, 0) however the
    // origin is always frozen.

    // neighbor order after visualization transform:
    //   2   1
    //  3  C  0
    //   4   5
    vec4[6] nbs;
    ivec2 coord;

    coord = adjustNbBottom(adjustNbRight(p + ivec2(1, 0)));
    nbs[0] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(adjustNbRight(p + ivec2(1, 1)));
    nbs[1] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(p + ivec2(0, 1));
    nbs[2] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(p + ivec2(-1, 0));
    nbs[3] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(adjustNbBottom(p + ivec2(-1, -1)));
    nbs[4] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbRight(adjustNbBottom(p + ivec2(0, -1)));
    nbs[5] = texelFetch(u_latticeTexture, coord, 0);

    return nbs;
}

float diffusion(vec4 cell, vec4[6] nbs) {
    float d = cell.w;
    for (int i = 0; i < 6; i++) {
        d += nbs[i].x > 0.5 ? cell.w : nbs[i].w;
    }
    return d / 7.0;
}

void main() {
    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);
    vec4[6] nbs = neighbors(cellCoord);

    if (cell.x > 0.5) {
        state = cell;
        return;
    }

    cell.w = diffusion(cell, nbs);
    state = cell;
}