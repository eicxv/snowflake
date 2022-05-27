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

out vec4 fragColor;

const float c_minRayDist = 0.01;
const float c_rayPosNudge = 0.01;
const float c_far = 10000.0;
const int c_maxBounces = 8;

struct Material {
    float specularChance;      // percentage chance of doing a specular reflection
    float specularRoughness;   // how rough the specular reflections are
    vec3  specularColor;       // the color tint of specular reflections
    float IOR;                 // index of refraction. used by fresnel and refraction.
    float invIOR;              // inverse of index of refraction
    float refractionChance;    // percent chance of doing a refractive transmission
    float refractionRoughness; // how rough the refractive transmissions are
    vec3  refractionColor;     // absorption for beer's law
};

struct HitData {
    bool fromInside;
    float dist;
    vec3 normal;
};

const Material iceMaterial = Material(
    0.2,                          // specularChance
    0.01 * 0.01,                  // specularRoughness
    vec3(1.0, 1.0, 1.0) * 0.8,    // specularColor
    1.309,                        // IOR
    1. / 1.309,                   // invIOR
    1.,                           // refractionChance
    0.1 * 0.01,                  // refractionRoughness
    vec3(0.0, 0.0, 0.0)           // refractionColor
);

float ign(vec2 v) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(v, magic.xy)));
}

uint pcg(inout uint state) {
	state *= 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

float randomFloat01(inout uint state) {
    return float(pcg(state)) / 4294967296.0;
}

vec3 randomUnitVector(inout uint state) {
    float z = randomFloat01(state) * 2.0 - 1.0;
    float a = randomFloat01(state) * TAU;
    float r = sqrt(1.0 - z * z);
    float x = r * cos(a);
    float y = r * sin(a);
    return vec3(x, y, z);
}

float fresnelReflectAmount(float n1, float n2, vec3 normal, vec3 incident, float f0, float f90) {
    // Schlick aproximation
    float r0 = (n1 - n2) / (n1 + n2);
    r0 *= r0;
    float cosX = -dot(normal, incident);
    if (n1 > n2) {
        float n = n1 / n2;
        float sinT2 = n * n * (1.0 - cosX * cosX);
        // Total internal reflection
        if (sinT2 > 1.0) {
            return f90;
        }
        cosX = sqrt(1.0 - sinT2);
    }
    float x = 1.0 - cosX;
    float ret = r0 + (1.0 - r0) * x * x * x * x * x;

    return mix(f0, f90, ret);
}

vec4 sampleLattice(vec2 uv) {
    uv /= XY_SCALE;
    uv += 0.5;
    return texture(u_normalTexture, uv);
}

uint iqint3(uvec2 x) {
    uvec2 q = 1103515245u * ((x>>1u) ^ (x.yx));
    uint  n = 1103515245u * ((q.x) ^ (q.y >> 3u));
    return n;
}

float iqFloat(uvec3 x) {
    return float(iqint3(uvec2(iqint3(x.xy), x.z))) / 4294967296.0;
}


float modulateGround(vec2 p) {
    p /= XY_SCALE;
    p *= 2.;

    uvec3 rp = uvec3(p + 1000., GROUND_SEED);
    vec4 c = vec4(iqFloat(rp + uvec3(0, 0, 0)),
                  iqFloat(rp + uvec3(1, 0, 0)),
                  iqFloat(rp + uvec3(0, 1, 0)),
                  iqFloat(rp + uvec3(1, 1, 0)));
    vec2 r = fract(p);
    return
        c.x +
        (c.y - c.x) * smoothstep(0.0, 1.0, r.x) +
        (c.z - c.x) * smoothstep(0.0, 1.0, r.y) +
        (c.x - c.y - c.z + c.w) *
        smoothstep(0.0, 1.0, r.x) *
        smoothstep(0.0, 1.0, r.y);
}

vec3 getGround(vec3 rayPos, vec3 rayDir) {
    vec3 g1 = GROUND_COL;
    vec3 g2 = GROUND_ACCENT_COL;

    float t = -(rayPos.z - HEIGHT) / rayDir.z;
    vec2 pt = rayPos.xy + rayDir.xy * t;
    pt += 0.5;
    float noise = ign(gl_FragCoord.xy);
    noise = (noise - 0.5) * 0.1;

    return mix(g1, g2, noise + modulateGround(pt));
}

vec3 light(vec3 rayDir, vec3 color, vec3 lightDir, float a1, float a2) {
    float blend = smoothstep(a1, a2, dot(rayDir, lightDir));
    return color * blend;
}

vec3 environment(vec3 rayPos, vec3 rayDir) {
    vec3 col;
    vec3 ground = getGround(rayPos, rayDir);
    vec3 mid = HORIZON_COL;
    vec3 sky = SKY_COL;
    float midGroundBlend = smoothstep(-0.999, -0.998, rayDir.z);
    float skyMidBlend = smoothstep(-0.2, 0.2, rayDir.z);
    col = mix(ground, mid, midGroundBlend);
    col = mix(col, sky, skyMidBlend);

    col += light(rayDir, LIGHT_1_COL, LIGHT_1_DIR, 0.83, 0.88);
    col += light(rayDir, LIGHT_2_COL, LIGHT_2_DIR, 0.7, 0.78);
    col += light(rayDir, LIGHT_3_COL, LIGHT_3_DIR, 0.83, 0.88);
    return col;
}


bool hitZPlane(vec3 rayPos, vec3 rayDir, float height, out vec3 pt) {
    // hit z-plane at z = height
    float t = -(rayPos.z - height) / rayDir.z;
    pt = rayPos + rayDir * t;

    return t > c_minRayDist;
}


vec3 binarySearchMarch(vec3 p0, vec3 p1, bool inside, out vec4 tex) {
    // assumes either p0 or p1 is inside height map
    vec3 p = mix(p0, p1, 0.5);
    for (int i = 0; i < SEARCH_ITER; i++) {
        tex = sampleLattice(p.xy);
        if (inside ^^ (abs(p.z) > tex.w)) {
            p0 = p;
        } else {
            p1 = p;
        }
        p = mix(p0, p1, 0.5);
    }
    tex = sampleLattice(p.xy);
    return p;
}

bool hitLatticeMarch(vec3 rayPos, vec3 rayDir, inout HitData hitData) {
    bool hit;
    vec3 pos = rayPos;
    vec3 dir = rayDir;
    if (rayPos.z > HEIGHT) {
        hit = hitZPlane(rayPos, rayDir, HEIGHT, pos);
        if (!hit) {
            return false;
        }
    }
    vec4 tex = sampleLattice(pos.xy);
    bool isInside = abs(pos.z) < tex.w;
    float stepLen;
    for (int i = 0; i < MARCH_ITER; i++) {
        stepLen = abs(abs(pos.z) - tex.w);
        pos += dir * stepLen;
        tex = sampleLattice(pos.xy);
        if (isInside != abs(pos.z) < tex.w) {
            pos = binarySearchMarch(pos - dir * stepLen, pos, isInside, tex);
            break;
        }
    }
    tex = sampleLattice(pos.xy);

    if (tex.w == 0.0) {
        return false;
    }
    vec3 normal = tex.xyz;
    normal.z *= sign(pos.z);
    hitData.normal = normal;
    hitData.fromInside = isInside;
    hitData.dist = distance(rayPos, pos);
    return true;
}

bool hitScene(vec3 rayPos, vec3 rayDir, inout HitData hitData) {
    return hitLatticeMarch(rayPos, rayDir, hitData);
}

vec3 traceRay(vec3 rayPos, vec3 rayDir, inout uint rngState) {
    // initialize
    vec3 ret = vec3(0.0, 0.0, 0.0);
    vec3 throughput = vec3(1.0, 1.0, 1.0);
    HitData hitData;

    for (int i = 0; i < c_maxBounces; i++) {
        hitData.dist = c_far;
        bool hit = hitScene(rayPos, rayDir, hitData);

        if (!hit) {
            break;
        }

        float specularChance = iceMaterial.specularChance;
        float refractionChance = iceMaterial.refractionChance;

        float rayProbability = 1.0;
        if (specularChance > 0.0) {
        	specularChance = fresnelReflectAmount(
            	hitData.fromInside ? iceMaterial.IOR : 1.0,
            	!hitData.fromInside ? iceMaterial.IOR : 1.0,
            	hitData.normal, rayDir, iceMaterial.specularChance, 1.0);

            float chanceMultiplier = (1.0 - specularChance) / (1.0 - iceMaterial.specularChance);
            refractionChance *= chanceMultiplier;
        }

        float doSpecular = 0.0;
        float doRefraction = 0.0;
        float raySelectRoll = randomFloat01(rngState);
		if (raySelectRoll < specularChance) {
            doSpecular = 1.0;
            rayProbability = specularChance;
        }
        else {
            doRefraction = 1.0;
            rayProbability = refractionChance;
        }

        // avoid potential divide by zero
		rayProbability = max(rayProbability, 0.001);

        // nudge ray away from surface
        rayPos = (rayPos + rayDir * hitData.dist) - sign(doRefraction - 0.5) * hitData.normal * c_rayPosNudge;

        vec3 diffuseRayDir = normalize(sign(doSpecular - 0.5) * hitData.normal + randomUnitVector(rngState));

        vec3 specularRayDir = reflect(rayDir, hitData.normal);
        specularRayDir = normalize(mix(specularRayDir, diffuseRayDir, iceMaterial.specularRoughness));

        vec3 refractionRayDir = refract(rayDir, hitData.normal, hitData.fromInside ? iceMaterial.IOR : iceMaterial.invIOR);
        refractionRayDir = normalize(mix(refractionRayDir, diffuseRayDir, iceMaterial.refractionRoughness));

        rayDir = mix(specularRayDir, refractionRayDir, doRefraction);

        if (doRefraction == 0.0) {
        	throughput *= iceMaterial.specularColor;
        }

        throughput /= rayProbability;

        // Russian Roulette
        float p = max(throughput.r, max(throughput.g, throughput.b));
        if (randomFloat01(rngState) > p)
            break;

        throughput *= 1.0 / p;
    }
    ret += environment(rayPos, rayDir) * throughput;
    return ret;
}

void main() {
    ivec2 res = textureSize(u_renderTexture, 0);
    vec2 fragCoord = vec2(gl_FragCoord);
    uint rngState = uint(uint(fragCoord.x) * uint(1973) + uint(fragCoord.y) * uint(9277) + uint(u_seed) * uint(26699)) | uint(1);

    vec3 cameraPos, rayDir;
    cameraPos = v_rayOrigin;
    rayDir = normalize(v_rayTarget);

    vec3 color = vec3(0.0);
    color += traceRay(cameraPos, rayDir, rngState);

    vec3 prevColor = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    color = mix(prevColor, color, u_blend);

    fragColor = vec4(color, u_blend);
}