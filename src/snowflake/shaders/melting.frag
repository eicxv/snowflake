#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_mu;
uniform float u_gamma;

in vec2 v_cellCoord;
in vec2 v_nb0Coord;
in vec2 v_nb1Coord;
in vec2 v_nb2Coord;
in vec2 v_nb3Coord;
in vec2 v_nb4Coord;
in vec2 v_nb5Coord;
out vec4 state;

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
    vec4 cell = texture(u_latticeTexture, v_cellCoord);

    vec4[6] nbs;
    nbs[0] = texture(u_latticeTexture, v_nb0Coord);
    nbs[1] = texture(u_latticeTexture, v_nb1Coord);
    nbs[2] = texture(u_latticeTexture, v_nb2Coord);
    nbs[3] = texture(u_latticeTexture, v_nb3Coord);
    nbs[4] = texture(u_latticeTexture, v_nb4Coord);
    nbs[5] = texture(u_latticeTexture, v_nb5Coord);

    state = melting(cell, nbs);
}
