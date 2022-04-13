#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;

out vec4 state;

#define Z_SCALE 0.05

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

ivec2 adjustNbLeft(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
    p = p.x <= 0 ? ivec2(1, 0) : p;
    return p;
}

vec4[6] neighbors(ivec2 p) {
    // returns correct neighbors
    // for p = (0, 0)

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

    coord = adjustNbLeft(adjustNbTopleft(p + ivec2(0, 1)));
    nbs[2] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbLeft(adjustNbTopleft(p + ivec2(-1, 0)));
    nbs[3] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbBottom(adjustNbLeft(p + ivec2(-1, -1)));
    nbs[4] = texelFetch(u_latticeTexture, coord, 0);

    coord = adjustNbTopleft(adjustNbRight(adjustNbBottom(p + ivec2(0, -1))));
    nbs[5] = texelFetch(u_latticeTexture, coord, 0);

    return nbs;
}

vec3 normal(vec4[6] nbs) {
  vec2 grad = vec2(
    ( 2.0 * nbs[0].z * Z_SCALE
    +       nbs[1].z * Z_SCALE
    -       nbs[2].z * Z_SCALE
    - 2.0 * nbs[3].z * Z_SCALE
    -       nbs[4].z * Z_SCALE
    +       nbs[5].z * Z_SCALE) / 6.0,

    ( nbs[1].z * Z_SCALE
    + nbs[2].z * Z_SCALE
    - nbs[4].z * Z_SCALE
    - nbs[5].z * Z_SCALE) / (2.0 * sqrt(3.0))
  );
  return normalize(vec3(-grad, 1.0));
}

vec3 edgeNormal(vec4[6] nbs) {
    vec3 avg = vec3(0.);
    avg += vec3( 1.0,   0.0,           0.0) * (1. - nbs[0].x);
    avg += vec3( 0.5,   sqrt(3.) / 2., 0.0) * (1. - nbs[1].x);
    avg += vec3(-0.5,   sqrt(3.) / 2., 0.0) * (1. - nbs[2].x);
    avg += vec3(-1.0,   0.0,           0.0) * (1. - nbs[3].x);
    avg += vec3(-0.5,  -sqrt(3.) / 2., 0.0) * (1. - nbs[4].x);
    avg += vec3( 0.5,  -sqrt(3.) / 2., 0.0) * (1. - nbs[5].x);

    return avg;
}

// bool onEdge(vec3[6] nbs) {
//     int edgeNbs
// }

// int edge normal

// #define NO_NORMAL_ON_BOUNDARY
// #define EDGE_NORMAL
// #define MIX_EDGE_NORMAL

// double edge normal

// #define EDGE_NORMAL
// #define MIX_EDGE_NORMAL

// outer edge normal

#define EDGE_NORMAL_ON_BOUNDARY
#define MIX_EDGE_NORMAL

void main() {
    ivec2 res = textureSize(u_latticeTexture, 0);
    ivec2 cellCoord = res - ivec2(gl_FragCoord.xy) - 1;
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);
    vec4[6] nbs = neighbors(cellCoord);
    vec3 n = normal(nbs);
    vec3 en = edgeNormal(nbs);

    #ifdef NO_NORMAL_ON_BOUNDARY
    if (cell.x < 0.5) {
        state = vec4(0.,0.,1.,cell.z * Z_SCALE);
        return;
    }
    #endif
    #ifdef EDGE_NORMAL_ON_BOUNDARY
    if (cell.x < 0.5) {
        #ifdef MIX_EDGE_NORMAL
        if (dot(en, en) > 0.01) {
            n = mix(normalize(en), n, 0.5);
            n = normalize(n);
        }
        #else
        n = dot(en, en) > 0.01 ? normalize(en) : n;
        #endif
    }
    #endif
    #ifdef EDGE_NORMAL
        #ifdef MIX_EDGE_NORMAL
        if (dot(en, en) > 0.01) {
            n = mix(normalize(en), n, 0.5);
            n = normalize(n);
        }
        #else
        n = dot(en, en) > 0.01 ? normalize(en) : n;
        #endif
    #endif

    state = vec4(n, cell.z * Z_SCALE);
}