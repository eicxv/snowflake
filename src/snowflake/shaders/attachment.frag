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

in vec2 v_cellCoord;
in vec2 v_nb0Coord;
in vec2 v_nb1Coord;
in vec2 v_nb2Coord;
in vec2 v_nb3Coord;
in vec2 v_nb4Coord;
in vec2 v_nb5Coord;
out vec4 state;

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
    vec4 cell = texture(u_latticeTexture, v_cellCoord);
    if (cell.x > 0.5) {
        state = cell;
        return;
    }

    vec4[6] nbs;
    nbs[0] = texture(u_latticeTexture, v_nb0Coord);
    nbs[1] = texture(u_latticeTexture, v_nb1Coord);
    nbs[2] = texture(u_latticeTexture, v_nb2Coord);
    nbs[3] = texture(u_latticeTexture, v_nb3Coord);
    nbs[4] = texture(u_latticeTexture, v_nb4Coord);
    nbs[5] = texture(u_latticeTexture, v_nb5Coord);

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