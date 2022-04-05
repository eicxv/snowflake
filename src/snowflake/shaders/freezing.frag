#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_kappa;

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

void main() {
    vec4 cell = texture(u_latticeTexture, v_cellCoord);

    vec4[6] nbs;
    nbs[0] = texture(u_latticeTexture, v_nb0Coord);
    nbs[1] = texture(u_latticeTexture, v_nb1Coord);
    nbs[2] = texture(u_latticeTexture, v_nb2Coord);
    nbs[3] = texture(u_latticeTexture, v_nb3Coord);
    nbs[4] = texture(u_latticeTexture, v_nb4Coord);
    nbs[5] = texture(u_latticeTexture, v_nb5Coord);

    float frozenNbs = frozenNeighbors(nbs);
    if (frozenNbs > 0.5) {
        cell.y += (1.0 - u_kappa) * cell.w;
        cell.z += u_kappa * cell.w;
        cell.w = 0.0;
    }
    state = cell;
}