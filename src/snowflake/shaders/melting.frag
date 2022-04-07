#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_mu;
uniform float u_gamma;

out vec4 state;

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
    p = adjustNbRight(p);

    p = adjustNbTopleft(p);
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

    // coord = adjustNbTopleft(adjustNbRight(p + ivec2(1, 1)));
    coord = p + ivec2(1, 1);
    coord = tfmNeighborCoord(coord);
    nbs[0] = texelFetch(u_latticeTexture, coord, 0);

    // coord = adjustNbTopleft(p + ivec2(0, 1));
    coord = p + ivec2(0, 1);
    coord = tfmNeighborCoord(coord);
    nbs[1] = texelFetch(u_latticeTexture, coord, 0);

    // coord = adjustNbTopleft(p + ivec2(-1, 0));
    coord = p + ivec2(-1, 0);
    coord = tfmNeighborCoord(coord);
    nbs[2] = texelFetch(u_latticeTexture, coord, 0);

    // coord = adjustNbBottom(p + ivec2(-1, -1));
    coord = p + ivec2(-1, -1);
    coord = tfmNeighborCoord(coord);
    nbs[3] = texelFetch(u_latticeTexture, coord, 0);

    // coord = adjustNbRight(adjustNbBottom(p + ivec2(0, -1)));
    coord = p + ivec2(0, -1);
    coord = tfmNeighborCoord(coord);
    nbs[4] = texelFetch(u_latticeTexture, coord, 0);

    // coord = adjustNbBottom(adjustNbRight(p + ivec2(1, 0)));
    coord = p + ivec2(1, 0);
    coord = tfmNeighborCoord(coord);
    nbs[5] = texelFetch(u_latticeTexture, coord, 0);

    return nbs;
}

float frozenNeighbors(vec4[6] nbs) {
    float fnb = 0.0;
    for (int i = 0; i < 6; i++) {
        fnb += nbs[i].x;
    }
    return fnb;
}

vec4 melting(vec4 cell, vec4 nbs[6]) {
    float frozenNbs = frozenNeighbors(nbs);
    float onBoundary = cell.x > 0.5 && frozenNbs > 0.5 ? 0.0 : 1.0;

    cell.w += onBoundary * (cell.y * u_mu + cell.z * u_gamma);
    cell.y -= onBoundary * cell.y * u_mu;
    cell.z -= onBoundary * cell.z * u_gamma;

    return cell;
}

void main() {
    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);
    vec4[6] nbs = neighbors(cellCoord);

    state = melting(cell, nbs);
}
