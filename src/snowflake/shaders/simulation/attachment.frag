#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_alpha;
uniform float u_beta;
uniform float u_theta;

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

vec2 frozenNeighborsAndVapor(vec4 cell, vec4[6] nbs) {
    float fnb = 0.0;
    float d = cell.w;
    for (int i = 0; i < 6; i++) {
        fnb += nbs[i].x;
        d += nbs[i].x > 0.5 ? cell.w : nbs[i].w;
    }
    return vec2(fnb, d);
}

void main() {
    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);
    vec4[6] nbs = neighbors(cellCoord);

    if (cell.x > 0.5) {
        state = cell;
        return;
    }

    vec2 fNbsD = frozenNeighborsAndVapor(cell, nbs);
    float frozenNbs = fNbsD.x;
    float vaporSum = fNbsD.y;

    cell.x = (frozenNbs < 2.5 && cell.y >= u_beta) ? 1.0 : cell.x;
    cell.x = (frozenNbs == 3.0 && cell.y >= 1.0) ? 1.0 : cell.x;
    cell.x = (frozenNbs == 3.0 && cell.y >= u_alpha && vaporSum < u_theta) ? 1.0 : cell.x;
    cell.x = (frozenNbs > 3.5) ? 1.0 : cell.x;

    cell.z += cell.x * cell.y;
    cell.y -= cell.x * cell.y;

    state = cell;
}