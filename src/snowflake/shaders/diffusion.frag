#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;

in vec2 v_cellCoord;
in vec2 v_nb0Coord;
in vec2 v_nb1Coord;
in vec2 v_nb2Coord;
in vec2 v_nb3Coord;
in vec2 v_nb4Coord;
in vec2 v_nb5Coord;
out vec4 state;

float diffusion(vec4 cell, vec4[6] nbs) {
    float d = cell.w;
    for (int i = 0; i < 6; i++) {
        d += nbs[i].x > 0.5 ? cell.w : nbs[i].w;
    }
    return d / 7.0;
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

    float d = diffusion(cell, nbs);
    cell.w = d;
    state = cell;
}