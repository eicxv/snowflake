#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.14159265359
#define INV_PI 0.31830988618    // 1. / PI
#define SQRT3 1.73205080757     // sqrt(3.)
#define SQRT3_2 0.86602540378   // sqrt(3.) / 2.
#define INV_SQRT3 0.57735026919 // 1. / sqrt(3.)

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_uv;
out vec4 color;

ivec4 symmetryTfm(ivec2 p) {
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
    int flip = int(2 * p.y > p.x);
    p.y = flip == 1 ? p.x - p.y : p.y;

    int s = 0;
    s += int(c0 || c1);
    s += int(c0 || c2);
    s += int(c0 || (c0 && c2));
    s += int(c0 && !c1);
    s += int(c0 && !c2);

    return ivec4(p, s, flip);
}

vec4 hexOffsetAndCenter(vec2 uv) {
    vec2 c1 = round(uv * vec2(1., INV_SQRT3));
    vec2 o1 = uv - c1 * vec2(1., SQRT3);
    vec2 c2 = c1 + sign(o1) * 0.5;
    vec2 o2 = uv - c2 * vec2(1., SQRT3);
    return dot(o1, o1) < dot(o2, o2) ? vec4(o1, c1) : vec4(o2, c2);
}

vec3 rotateNormal(vec3 n, vec2 uv, int sextant, int flipped) {
    mat2 reflection = mat2(SQRT3_2, 0.5, 0.5, -SQRT3_2);
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

vec3 iceColor(vec4 cell) {
    float c = 1.0 - 0.3 * (cell.z / u_rho);
    return vec3(c);
}

vec3 vaporColor(vec4 cell) {
    float c = 1.0 - 0.6 * cell.w / u_rho;
    return vec3(c);
}

void main () {
    ivec2 res = textureSize(u_latticeTexture, 0);

    vec2 uv = v_uv;
    uv = (uv - 0.5) * 2. * float(res.x);
    vec4 hex = hexOffsetAndCenter(uv);
    vec2 hexCenter = hex.zw;

    mat2 tfm = mat2(1., 1., 0., 2.);
    hexCenter *= tfm;

    ivec4 tfmData = symmetryTfm(ivec2(hexCenter));
    ivec2 coord = tfmData.xy;
    int sextant = tfmData.z;
    int flip = tfmData.w;

    coord = res - coord - 1;

    vec4 cell = texelFetch(u_latticeTexture, coord, 0);
    vec3 n = cell.xyz;

    vec2 hexC = hex.zw;
    mat2 hTfm = mat2(1., 0., 0., SQRT3);
    hexC = hexC * hTfm;
    n = rotateNormal(n, hexC, sextant, flip);

    n = n  * 0.5 + 0.5;
    color = vec4(n, 1. + 0. * u_rho);

    // bool isFrozen = cell.x > 0.5;
    // vec3 c = isFrozen ? iceColor(cell) : vaporColor(cell);
    // color = vec4(c, 1.0);
}