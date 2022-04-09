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

ivec2 adjustNbLeft(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
    p = p.x <= 0 ? ivec2(1, 0) : p;
    return p;
}

float[6] neighbors(ivec2 p) {
    // returns correct neighbors
    // for p = (0, 0)

    // neighbor order after visualization transform:
    //   2   1
    //  3  C  0
    //   4   5
    float[6] nbs;
    ivec2 coord;

    coord = adjustNbBottom(adjustNbRight(p + ivec2(1, 0)));
    nbs[0] = texelFetch(u_latticeTexture, coord, 0).z;

    coord = adjustNbTopleft(adjustNbRight(p + ivec2(1, 1)));
    nbs[1] = texelFetch(u_latticeTexture, coord, 0).z;

    coord = adjustNbLeft(adjustNbTopleft(p + ivec2(0, 1)));
    nbs[2] = texelFetch(u_latticeTexture, coord, 0).z;

    coord = adjustNbLeft(adjustNbTopleft(p + ivec2(-1, 0)));
    nbs[3] = texelFetch(u_latticeTexture, coord, 0).z;

    coord = adjustNbBottom(adjustNbLeft(p + ivec2(-1, -1)));
    nbs[4] = texelFetch(u_latticeTexture, coord, 0).z;

    coord = adjustNbTopleft(adjustNbRight(adjustNbBottom(p + ivec2(0, -1))));
    nbs[5] = texelFetch(u_latticeTexture, coord, 0).z;

    return nbs;
}

vec3 normal(float nbs[6]) {
  vec2 grad = vec2(
    ( 2.0 * nbs[0]
    +       nbs[1]
    -       nbs[2]
    - 2.0 * nbs[3]
    -       nbs[4]
    +       nbs[5]) / 6.0,

    ( nbs[1]
    + nbs[2]
    - nbs[4]
    - nbs[5]) / (2.0 * sqrt(3.0))
  );
  return normalize(vec3(-grad, 1.0));
}

void main() {
    ivec2 res = textureSize(u_latticeTexture, 0);
    ivec2 cellCoord = res - ivec2(gl_FragCoord.xy) - 1;
    vec4 cell = texelFetch(u_latticeTexture, cellCoord, 0);
    float[6] nbs = neighbors(cellCoord);
    vec3 n = normal(nbs);

    state = vec4(n, cell.z);
}