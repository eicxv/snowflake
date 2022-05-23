#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

precision highp int;


#define PI 3.14159265359
#define TAU 6.28318530718
#define EPS 0.0001

#define HEIGHT 2. // lattice max height
#define XY_SCALE 20.

#define SEARCH_ITER 4 // max binary search iterations
#define MARCH_ITER 6 // max ray march iterations


// environment
#define GROUND_COL vec3(0.01, 0.03, 0.05)
#define GROUND_ACCENT_COL vec3(0.005, 0.01, 0.02)
#define HORIZON_COL vec3(0.1, 0.1, 0.1)
#define SKY_COL vec3(0.01, 0.03, 0.05)
#define LIGHT_1_COL vec3(1., 0.1, 0.1) *   3.0
#define LIGHT_2_COL vec3(0.071, 0.404, 0.51) * 3.0
#define LIGHT_3_COL vec3(0.788, 0.094, 0.29) * 3.0
#define LIGHT_1_DIR vec3(0.13230, 0.59848, -0.79016)
#define LIGHT_2_DIR vec3(-0.59619, -0.18837, 0.78043)
#define LIGHT_3_DIR vec3(0.73768, -0.67515, 0.0)
#define GROUND_SEED 143u

uniform highp sampler2D u_renderTexture;
uniform highp sampler2D u_normalTexture;
uniform uint u_seed;
uniform float u_blend;

in vec3 v_rayOrigin;
in vec3 v_rayTarget;

out vec4 FC;

const float cmrd = 0.01;
const float crn = 0.01;
const float cf = 10000.0;
const int cmb = 8;

struct M {
    float sC;      // percentage chance of doing a specular reflection
    float sR;   // how rough the specular reflections are
    vec3  sCo;       // the color tint of specular reflections
    float IR;                 // index of refraction. used by fresnel and refraction.
    float iIR;              // inverse of index of refraction
    float rC;    // percent chance of doing a refractive transmission
    float rR; // how rough the refractive transmissions are
    vec3  rCo;     // absorption for beer's law
};

struct HD {
    bool fI;
    float d;
    vec3 n;
};

const M iM = M(
    0.2,                          // sC
    0.01 * 0.01,                  // sR
    vec3(1.0, 1.0, 1.0) * 0.8,    // sCo
    1.309,                        // IR
    1. / 1.309,                   // iIR
    1.,                           // rC
    0.1 * 0.01,                  // rR
    vec3(0.0, 0.0, 0.0)           // rCo
);

float ign(vec2 v) {
    vec3 m = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(m.z * fract(dot(v, m.xy)));
}

uint pcg(inout uint s) {
	s *= 747796405u + 2891336453u;
	uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
	return (w >> 22u) ^ w;
}

float rF(inout uint state) {
    return float(pcg(state)) / 4294967296.0;
}

vec3 rV(inout uint state) {
    float z = rF(state) * 2.0 - 1.0;
    float a = rF(state) * TAU;
    float r = sqrt(1.0 - z * z);
    float x = r * cos(a);
    float y = r * sin(a);
    return vec3(x, y, z);
}

float fRA(float n1, float n2, vec3 n, vec3 i, float f0, float f90) {
        // Schlick aproximation
        float r0 = (n1 - n2) / (n1 + n2);
        r0 *= r0;
        float cx = -dot(n, i);
        if (n1 > n2) {
            float n = n1 / n2;
            float sT2 = n * n * (1.0 - cx * cx);
            // Total internal reflection
            if (sT2 > 1.0) {
                return f90;
            }
            cx = sqrt(1.0 - sT2);
        }
        float x = 1.0 - cx;
        float ret = r0 + (1.0 - r0) * x * x * x * x * x;

        return mix(f0, f90, ret);
}

vec4 sL(vec2 uv) {
    uv /= XY_SCALE;
    uv += 0.5;
    return texture(u_normalTexture, uv);
}

uint h3(uvec2 x) {
    uvec2 q = 1103515245u * ((x>>1u) ^ (x.yx));
    uint  n = 1103515245u * ((q.x) ^ (q.y >> 3u));
    return n;
}

float qf(uvec3 x) {
    return float(h3(uvec2(h3(x.xy), x.z))) / 4294967296.0;
}


float mG(vec2 p) {
    p /= XY_SCALE;
    p *= 2.;

    uvec3 rp = uvec3(p + 1000., GROUND_SEED);
    vec4 c = vec4(qf(rp + uvec3(0, 0, 0)),
                  qf(rp + uvec3(1, 0, 0)),
                  qf(rp + uvec3(0, 1, 0)),
                  qf(rp + uvec3(1, 1, 0)));
    vec2 r = fract(p);
    return
        c.x +
        (c.y - c.x) * smoothstep(0.0, 1.0, r.x) +
        (c.z - c.x) * smoothstep(0.0, 1.0, r.y) +
        (c.x - c.y - c.z + c.w) *
        smoothstep(0.0, 1.0, r.x) *
        smoothstep(0.0, 1.0, r.y);
}

vec3 gG(vec3 rp, vec3 rd) {
    vec3 g1 = GROUND_COL;
    vec3 g2 = GROUND_ACCENT_COL;

    float t = -(rp.z - HEIGHT) / rd.z;
    vec2 pt = rp.xy + rd.xy * t;
    pt += 0.5;
    float ns = ign(gl_FragCoord.xy);
    ns = (ns - 0.5) * 0.1;

    return mix(g1, g2, ns + mG(pt));
}

vec3 lgt(vec3 rayDir, vec3 color, vec3 lightDir, float a1, float a2) {
    float blend = smoothstep(a1, a2, dot(rayDir, lightDir));
    return color * blend;
}

vec3 ev(vec3 rp, vec3 rd) {
    vec3 c;
    vec3 g = gG(rp, rd);
    vec3 m = HORIZON_COL;
    vec3 s = SKY_COL;
    float mgb = smoothstep(-0.999, -0.998, rd.z);
    float smb = smoothstep(-0.2, 0.2, rd.z);
    c = mix(g, m, mgb);
    c = mix(c, s, smb);

    c += lgt(rd, LIGHT_1_COL, LIGHT_1_DIR, 0.83, 0.88);
    c += lgt(rd, LIGHT_2_COL, LIGHT_2_DIR, 0.7, 0.78);
    c += lgt(rd, LIGHT_3_COL, LIGHT_3_DIR, 0.83, 0.88);
    return c;
}


bool hzp(vec3 rp, vec3 rd, float h, out vec3 pt) {
    // hit z-plane at z = h
    float t = -(rp.z - h) / rd.z;
    pt = rp + rd * t;

    return t > cmrd;
}


vec3 bsm(vec3 p0, vec3 p1, bool I, out vec4 t) {
    // assumes either p0 or p1 is i height map
    vec3 p = mix(p0, p1, 0.5);
    for (int i = 0; i < SEARCH_ITER; i++) {
        t = sL(p.xy);
        if (I ^^ (abs(p.z) > t.w)) {
            p0 = p;
        } else {
            p1 = p;
        }
        p = mix(p0, p1, 0.5);
    }
    t = sL(p.xy);
    return p;
}

bool hLM(vec3 rp, vec3 rd, inout HD hd) {
    bool h;
    vec3 p = rp;
    vec3 dir = rd;
    if (rp.z > HEIGHT) {
        h = hzp(rp, rd, HEIGHT, p);
        if (!h) {
            return false;
        }
    }
    vec4 t = sL(p.xy);
    bool iI = abs(p.z) < t.w;
    float sl;
    for (int i = 0; i < MARCH_ITER; i++) {
        sl = abs(abs(p.z) - t.w);
        p += dir * sl;
        t = sL(p.xy);
        if (iI != abs(p.z) < t.w) {
            p = bsm(p - dir * sl, p, iI, t);
            break;
        }
    }
    t = sL(p.xy);

    if (t.w == 0.0) {
        return false;
    }
    vec3 n = t.xyz;
    n.z *= sign(p.z);
    hd.n = n;
    hd.fI = iI;
    hd.d = distance(rp, p);
    return true;
}

bool hS(vec3 rp, vec3 rd, inout HD hd) {
    return hLM(rp, rd, hd);
}

vec3 tR(vec3 rp, vec3 rd, inout uint rst) {
    // initialize
    vec3 ret = vec3(0.0, 0.0, 0.0);
    vec3 tp = vec3(1.0, 1.0, 1.0);
    HD hd;

    for (int i = 0; i < cmb; i++) {
        hd.d = cf;
        bool hit = hS(rp, rd, hd);

        if (!hit) {
            break;
        }

        float sC = iM.sC;
        float rC = iM.rC;

        float rPb = 1.0;
        if (sC > 0.0) {
        	sC = fRA(
            	hd.fI ? iM.IR : 1.0,
            	!hd.fI ? iM.IR : 1.0,
            	hd.n, rd, iM.sC, 1.0);

            float cM = (1.0 - sC) / (1.0 - iM.sC);
            rC *= cM;
        }

        float dS = 0.0;
        float dR = 0.0;
		if (rF(rst) < sC) {
            dS = 1.0;
            rPb = sC;
        }
        else {
            dR = 1.0;
            rPb = rC;
        }

        // avoid potential divide by zero
		rPb = max(rPb, 0.001);

        // nudge ray away from surface
        rp = (rp + rd * hd.d) - sign(dR - 0.5) * hd.n * crn;

        vec3 drd = normalize(sign(dS - 0.5) * hd.n + rV(rst));

        vec3 srd = reflect(rd, hd.n);
        srd = normalize(mix(srd, drd, iM.sR));

        vec3 rrd = refract(rd, hd.n, hd.fI ? iM.IR : iM.iIR);
        rrd = normalize(mix(rrd, drd, iM.rR));

        rd = mix(srd, rrd, dR);

        if (dR == 0.0) {
        	tp *= iM.sCo;
        }

        tp /= rPb;

        // Russian Roulette
        float p = max(tp.r, max(tp.g, tp.b));
        if (rF(rst) > p)
            break;

        tp *= 1.0 / p;
    }
    ret += ev(rp, rd) * tp;
    return ret;
}

void main() {
    ivec2 res = textureSize(u_renderTexture, 0);
    vec2 fc = vec2(gl_FragCoord);
    uint rs = uint(uint(fc.x) * uint(1973) + uint(fc.y) * uint(9277) + uint(u_seed) * uint(26699)) | uint(1);

    vec3 cp, rd;
    cp = v_rayOrigin;
    rd = normalize(v_rayTarget);

    vec3 c = vec3(0.0);
    c += tR(cp, rd, rs);

    vec3 pc = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    c = mix(pc, c, u_blend);

    FC = vec4(c, u_blend);
}