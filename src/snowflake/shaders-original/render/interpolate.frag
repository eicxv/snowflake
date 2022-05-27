#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.14159265359

uniform highp sampler2D u_latticeTexture;
uniform vec2 u_translate;
uniform float u_scale;


in vec2 v_uv;
out vec4 color;

// like sign but signPosZero(0.) = 1.
float signPosZero(float x) {
    return step(0., x) * 2. - 1.;
}

vec2 signPosZero(vec2 x) {
    return step(0., x) * 2. - 1.;
}

vec3 signPosZero(vec3 x) {
    return step(0., x) * 2. - 1.;
}

float sideOfLine(vec2 point,vec2 lineStart,vec2 lineEnd) {
    // x = 0 => on line
    // x < 0 => left of line
    // x > 0 => right of line
    // when looking from start to end
    float disc = (point.x - lineStart.x) * (lineEnd.y - lineStart.y)
           - (point.y - lineStart.y) * (lineEnd.x - lineStart.x);
    return disc;
}

vec3 barycentricCoords(vec2 p, vec2 a, vec2 b, vec2 c) {
    float invDenom = 1. / ((b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y));
    float w0 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) * invDenom;
    float w1 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) * invDenom;
    float w2 = 1.0 - w0 - w1;
    return vec3(w0, w1, w2);
}

ivec2 symmetryTransform(ivec2 p, out int sextant, out int flip) {
    // transform hexagon coordinate to lower half of first sextant
    // returns transformed coordinates x,y; sextant index s and
    // and whether the coordinate mirrored
    int x = p.x;      //      c2   c1
    int y = p.y;      //       | /
    bool c0 = y < 0;  //       |/
    bool c1 = y > x;  //    ---+--- c0
    bool c2 = x < 0;  //      /|
                      //     / |
    int a = !c2 && !c1 ? 1 : (c2 && c1 ? -1 : 0);
    int b = c1 && !c0 ? 1 : (!c1 && c0 ? -1 : 0);
    int c = !c0 && !c2 ? 1 : (c0 && c2 ? -1 : 0);

    p = ivec2(a * x + b * y, - b * x + c * y);
    flip = int(2 * p.y > p.x);
    p.y = flip == 1 ? p.x - p.y : p.y;

    sextant = 0;
    sextant += int(c0 || c1);
    sextant += int(c0 || c2);
    sextant += int(c0);
    sextant += int(c0 && !c1);
    sextant += int(c0 && !c2);

    return p;
}

vec3 rotateNormal(vec3 n, int sextant, int flipped) {
    mat2 reflection = mat2(sqrt(3.) / 2., 0.5, 0.5, -sqrt(3.) / 2.);
    float angle = (float(sextant) * 2. + float(flipped)) * PI / 6.;
    float s = sin(angle);
    float c = cos(angle);
    mat2 rotation = mat2(c, s, -s,  c);
    if (flipped == 1) {
        n.xy = reflection * n.xy;
    }
    n.xy = rotation * n.xy;
    return n;
}

ivec2 normalMapCoord(ivec2 coord, ivec2 res) {
    return res - coord - 1;
}

void closestHexes(vec2 uv, out vec2 c0, out vec2 c1, out vec2 c2) {
    c0 = round(uv * vec2(1., inversesqrt(3.)));
    c0 *= vec2(1., sqrt(3.));
    vec2 os0 = uv - c0;
    vec2 signs = signPosZero(os0);
    c1 = c0 + signs * vec2(0.5, sqrt(3.) / 2.);
    vec2 os1 = uv - c1;

    float os0sq3 = os0.x * sqrt(3.);
    bool qd = os0sq3 < os0.y == -os0sq3 < os0.y;
    if (qd) {
        c2 = vec2(c1.x - signs.x, c1.y);
    } else {
        c2 = vec2(c0.x + signs.x, c0.y);
    }
}

vec4 interpolateValue(vec2 uv, ivec2 res) {
    vec2 c0, c1, c2;
    closestHexes(uv, c0, c1, c2);
    vec3 weights = barycentricCoords(uv, c0, c1, c2);

    // transforms hexagon centers to cartesian integer coordiantes
    mat2 toIntCoords = mat2(1., 1./sqrt(3.), 0., 2./sqrt(3.));
    c0 *= toIntCoords;
    c1 *= toIntCoords;
    c2 *= toIntCoords;

    ivec2 coord;
    int sextant, flip;
    vec4 value = vec4(0.);
    vec4 tex;

    coord = symmetryTransform(ivec2(round(c0)), sextant, flip);
    coord = normalMapCoord(coord, res);
    tex = texelFetch(u_latticeTexture, coord, 0);
    tex.xyz = rotateNormal(tex.xyz, sextant, flip);
    if (tex.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    value += weights.x * tex;

    coord = symmetryTransform(ivec2(round(c1)), sextant, flip);
    coord = normalMapCoord(coord, res);
    tex = texelFetch(u_latticeTexture, coord, 0);
    tex.xyz = rotateNormal(tex.xyz, sextant, flip);
    if (tex.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    value += weights.y * tex;

    coord = symmetryTransform(ivec2(round(c2)), sextant, flip);
    coord = normalMapCoord(coord, res);
    tex = texelFetch(u_latticeTexture, coord, 0);
    tex.xyz = rotateNormal(tex.xyz, sextant, flip);
    if (tex.w == 0.) {
        return vec4(0., 0., 1., 0.);
    }
    value += weights.z * tex;

    value.xyz = normalize(value.xyz);
    return value;
}

void main () {
    ivec2 res = textureSize(u_latticeTexture, 0);
    vec2 uv = ((v_uv - 0.5) * 2. * u_scale + u_translate) * float(res.x);

    vec4 interpolatedValue = interpolateValue(uv, res);

    if (interpolatedValue.w < 0.0001) {
        interpolatedValue.xyz = vec3(0., 0., 1.);
    }

    color = interpolatedValue;
}