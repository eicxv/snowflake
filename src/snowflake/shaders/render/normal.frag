#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_normalBlend;

out vec4 s;

#define XY_SCALE 20.

ivec2 aT(ivec2 p) {
    p.y = 2 * p.y > p.x ? p.x - p.y : p.y;
    return p;
}

ivec2 aB(ivec2 p) {
    p = p.y < 0 ? ivec2(p.x + 1, 1) : p;
    return p;
}

ivec2 aR(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
    p = p.x >= res.x ? ivec2(p.x - 2, p.y - 1) : p;
    return p;
}

ivec2 aL(ivec2 p) {
    ivec2 res = textureSize(u_latticeTexture, 0);
    p = p.x <= 0 ? ivec2(1, 0) : p;
    return p;
}

vec4[6] ngbs(ivec2 p) {
    // returns correct neighbors
    // for p = (0, 0)

    // neighbor order after visualization transform:
    //   2   1
    //  3  C  0
    //   4   5
    vec4[6] n;
    ivec2 c;

    c = aB(aR(p + ivec2(1, 0)));
    n[0] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aR(p + ivec2(1, 1)));
    n[1] = texelFetch(u_latticeTexture, c, 0);

    c = aL(aT(p + ivec2(0, 1)));
    n[2] = texelFetch(u_latticeTexture, c, 0);

    c = aL(aT(p + ivec2(-1, 0)));
    n[3] = texelFetch(u_latticeTexture, c, 0);

    c = aB(aL(p + ivec2(-1, -1)));
    n[4] = texelFetch(u_latticeTexture, c, 0);

    c = aT(aR(aB(p + ivec2(0, -1))));
    n[5] = texelFetch(u_latticeTexture, c, 0);

    return n;
}

vec3 N(vec4[6] n) {
  vec2 g = vec2(
    ( 2.0 * n[0].z
    +       n[1].z
    -       n[2].z
    - 2.0 * n[3].z
    -       n[4].z
    +       n[5].z) / (6.0 * XY_SCALE),

    ( n[1].z
    + n[2].z
    - n[4].z
    - n[5].z) / (2.0 * sqrt(3.0) * XY_SCALE)
  );
  return normalize(vec3(-g, 1.0));
}

vec3 eN(vec4[6] n) {
    vec3 a = vec3(0.);
    a += vec3( 1.0,   0.0,           0.0) * (1. - n[0].x);
    a += vec3( 0.5,   sqrt(3.) / 2., 0.0) * (1. - n[1].x);
    a += vec3(-0.5,   sqrt(3.) / 2., 0.0) * (1. - n[2].x);
    a += vec3(-1.0,   0.0,           0.0) * (1. - n[3].x);
    a += vec3(-0.5,  -sqrt(3.) / 2., 0.0) * (1. - n[4].x);
    a += vec3( 0.5,  -sqrt(3.) / 2., 0.0) * (1. - n[5].x);

    return a;
}

#define EDGE_NORMAL
#define MIX_EDGE_NORMAL

void main() {
    ivec2 r = textureSize(u_latticeTexture, 0);
    ivec2 cc = r - ivec2(gl_FragCoord.xy) - 1;
    vec4 c = texelFetch(u_latticeTexture, cc, 0);
    vec4[6] nbs = ngbs(cc);
    vec3 n = N(nbs);
    vec3 en = eN(nbs);

    if (dot(en, en) > 0.01) {
        n = mix(normalize(en), n, u_normalBlend);
        n = normalize(n);
    }

    s = vec4(n, c.z);
}
