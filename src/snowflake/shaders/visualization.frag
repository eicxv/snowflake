#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform highp sampler2D u_latticeTexture;
uniform float u_rho;

in vec2 v_uv;
out vec4 color;

ivec2 tfmCoord(ivec2 p) {
    int x = p.x;int y = p.y;
    int a = 1;int b = 0;int c = 0;int d = 1;
    
    if (x > 0 && y >= 0 && y < x) { // sextant 1
        a = 1;b = 0;c = 0;d = 1;
    }
    else if (x > 0 && y >= 0 && y >= x) { // sextant 2
        a = 0;b = 1;c = -1;d = 1;
    }
    else if (x <= 0 && y > 0) { // sextant 3
        a = -1;b = 1;c = -1;d = 0;
    }
    else if (x < 0 && y <= 0 && x < y) { // sextant 4
        a = -1;b = 0;c =  0;d = -1;
    }
    else if (x < 0 && y <= 0 && x >= y) { // sextant 5
        a = 0;b =-1;c = 1;d = -1;
    }
    else if (x >= 0 && y < 0) { // sextant 6
        a = 1; b = -1; c = 1; d = 0;
    }

    int x_ = a * x + b * y;
    int y_ = c * x + d * y;

    if (2 * y_ > x_) {
        y_ = x_ - y_;
    }

    return ivec2(x_, y_);
}

vec3 iceColor(vec4 cell) {
    float c = 1.0 - 0.3 * (cell.z / u_rho);
    return vec3(c);
}

vec3 vaporColor(vec4 cell) {
    float c = 1.0 - 0.6 * cell.w / u_rho;
    return vec3(c);
}

vec4 HexDistAndCenter(vec2 uv) {
    vec2 s = vec2(1, 1.7320508);
    vec2 c1 = round(uv / s);
    vec2 o1 = uv / s - c1;
    vec2 c2 = c1 + sign(o1) * vec2(0.5, 0.5);
    vec2 o2 = uv - c2 * s;
    o1 = o1 * s;
    return dot(o1, o1) < dot(o2, o2) ? vec4(o1, c1) : vec4(o2, c2);
}

void main () {
    ivec2 res = textureSize(u_latticeTexture, 0);

    vec2 uv = v_uv;
    uv = (uv - 0.5) * 2.;
    uv *= float(res.x);
    vec4 hex = HexDistAndCenter(uv);
    vec2 hexCenter = hex.zw;

    mat2 tfm = mat2(1., 1., 0., 2.);
    hexCenter = hexCenter * tfm;

    ivec2 coord = tfmCoord(ivec2(hexCenter));
    vec4 cell = texelFetch(u_latticeTexture, coord, 0);

    bool isFrozen = cell.x > 0.5;
    vec3 c = isFrozen ? iceColor(cell) : vaporColor(cell);
    color = vec4(c,1.0);
}