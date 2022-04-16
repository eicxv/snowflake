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

// #define HEIGHT .1 // lattice max height
#define HEIGHT 2. // lattice max height
#define XY_SCALE 20.

#define SEARCH_ITER 4 // max binary search iterations
#define MARCH_ITER 6 // max ray march iterations

uniform highp sampler2D u_renderTexture;
uniform highp sampler2D u_normalTexture;
uniform uint u_seed;
uniform float u_blend;

out vec4 fragColor;

const float c_minRayDist = 0.01;

const float c_rayPosNudge = 0.01;

// the farthest we look for ray hits
const float c_far = 10000.0;

// camera FOV
// const float c_FOVDeg = 15.0;
const float c_FOVDeg = 178.0;

// number of ray bounces allowed max
const int c_maxBounces = 8;

// how many renders per frame - make this larger to get around the vsync limitation, and get a better image faster.
const int c_samplesPerFrame = 1;

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

// #define LIGHT
#define DIFFUSE_AND_ROUGHNESS 0
#define DIFFUSE 0

const Material iceMaterial = Material(
    0.2,                          // specularChance
    0.01 * 0.01,                  // specularRoughness
    vec3(1.0, 1.0, 1.0) * 0.8,    // specularColor
    1.309,                        // IOR
    1. / 1.309,                   // invIOR
    1.,                           // refractionChance
    0.01 * 0.01,                  // refractionRoughness
    vec3(0.0, 0.0, 0.0)           // refractionColor
);

// const Material iceMaterial = Material(
//     0.0000000000001,                 // specularChance
//     0.01 * 0.01,                     // specularRoughness
//     vec3(1.0, 1.0, 1.0) * 0.8,       // specularColor
//     1.309,                           // IOR
//     1.,                              // refractionChance
//     0.0000000001 * 0.0000000001,     // refractionRoughness
//     vec3(0.14, 0.04, 0.04)           // refractionColor
// );

float ign(vec2 v) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(v, magic.xy)));
}

uint wangHash(inout uint seed) {
    seed = uint(seed ^ 61u) ^ uint(seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4);
    seed *= uint(0x27d4eb2d);
    seed = seed ^ (seed >> 15);
    return seed;
}

float randomFloat01(inout uint state) {
    return float(wangHash(state)) / 4294967296.0;
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

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(TAU * (c * t + d));
}

#ifdef LIGHT
#define GROUND vec3(0.05, 0.08, 0.26) * 2.5
#define SKY vec3(0.03)
#define MID vec3(0.03)
#define PALETTE vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)
#else
#define GROUND vec3(0.01, 0.03, 0.05)
#define GROUND_ALT vec3(0.005, 0.01, 0.02)
// #define MID vec3(0.01, 0.03, 0.05)
#define MID vec3(0.1, 0.1, 0.1)
#define SKY vec3(0.01, 0.03, 0.05)
#define PALETTE vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)
#endif
#define ANGLE_OFFSET 0.
#define COLOR_1 vec3(1., 0.718, 0.012) *   3.0
#define COLOR_2 vec3(0.071, 0.404, 0.51) * 3.0
#define COLOR_3 vec3(0.788, 0.094, 0.29) * 3.0

#define CORNERS vec4(0., 1.0, 0.2, .6)

float modulateGround(vec2 p) {
    p /= XY_SCALE;
    vec4 c = CORNERS;
    return
        c.x +
        (c.y - c.x) * smoothstep(0.0, 1.0, p.x) +
        (c.z - c.x) * smoothstep(0.0, 1.0, p.y) +
        (c.x - c.y - c.z + c.w) *
        smoothstep(0.0, 1.0, p.x) *
        smoothstep(0.0, 1.0, p.y);
}

vec3 getGround(vec3 rayPos, vec3 rayDir, inout uint rngState) {
    vec3 g1 = GROUND;
    vec3 g2 = GROUND_ALT;

    float t = -(rayPos.z - HEIGHT) / rayDir.z;
    vec2 pt = rayPos.xy + rayDir.xy * t;
    pt += 0.5;
    float noise = ign(gl_FragCoord.xy);
    noise = (noise - 0.5) * 0.1;

    return mix(g1, g2, noise + modulateGround(pt));
}

vec3 environmentAlt(vec3 n) {
    vec3 col;
    vec3 ground = GROUND;
    vec3 sky = SKY;
    float skyGroundBlend = smoothstep(-0.99, -0.95, n.z);
    col = mix(ground, sky, skyGroundBlend);

    float angle = atan(n.y, n.x) / TAU + 0.1357;
    vec3 rakeLight = pal(angle, PALETTE);

    rakeLight *= 4.;
    rakeLight *= sin(3. * angle * PI) + 1.;

    float rakeLightHeight = 0.8;
    float rakeLightOffset = 0.2;
    float rakeBlend = smoothstep(-rakeLightHeight + rakeLightOffset, 0.0, n.z)
                     * (1.0 -smoothstep(0.0, rakeLightHeight + rakeLightOffset, n.z));
    rakeLight = mix(vec3(0.0), rakeLight, rakeBlend);
    col = max(col, rakeLight);
    return col;
}

vec3 light(vec3 rayDir, vec3 color, vec3 lightDir, float a1, float a2) {
    float blend = smoothstep(a1, a2, dot(rayDir, lightDir));
    return color * blend;
}

vec3 sphToCart(float theta, float phi) {
    return vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
    );
}

vec3 environment(vec3 rayPos, vec3 rayDir, inout uint rngState) {
    vec3 col;
    // vec3 ground = GROUND;
    vec3 ground = getGround(rayPos, rayDir, rngState);
    vec3 mid = MID;
    vec3 sky = SKY;
    float midGroundBlend = smoothstep(-0.99, -0.95, rayDir.z);
    float skyMidBlend = smoothstep(-0.2, 0.2, rayDir.z);
    col = mix(ground, mid, midGroundBlend);
    col = mix(col, sky, skyMidBlend);

    #if 0
    col = ground;
    float tBlend = step(rayDir.x, 0.0);
    // float tBlend = step(mod(rayDir.x, 0.002), 0.001);
    vec3 col55 = vec3(1.,1.,1.) * 0.1;
    col = mix(col55, col, tBlend);
    #endif

    vec3 lightDir;
    lightDir = sphToCart(1.58 * PI / 2., ANGLE_OFFSET);
    col += light(rayDir, COLOR_1, lightDir, 0.8, 0.9);
    lightDir = sphToCart(0.43 * PI / 2., TAU / 3. + ANGLE_OFFSET);
    col += light(rayDir, COLOR_2, lightDir, 0.8, 0.9);
    lightDir = sphToCart(PI / 2., 2. * TAU / 3. + ANGLE_OFFSET);
    col += light(rayDir, COLOR_3, lightDir, 0.8, 0.9);
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

    if (tex.w < EPS) {
        return false;
    }
    vec3 normal = tex.xyz;
    normal.z *= sign(pos.z);
    hitData.normal = normal;
    hitData.fromInside = isInside;
    hitData.dist = distance(rayPos, pos);
    return true;
}

bool hitSphere(vec3 rayPos, vec3 rayDir, inout HitData hitData, vec4 sphere)
{
	vec3 m = rayPos - sphere.xyz;
	float b = dot(m, rayDir);
	float c = dot(m, m) - sphere.w * sphere.w;

	if(c > 0.0 && b > 0.0) {
		return false;
    }

	float disc = b * b - c;
	if(disc < 0.0)
		return false;

    bool fromInside = false;
	float dist = -b - sqrt(disc);
    if (dist < 0.0) {
        fromInside = true;
        dist = -b + sqrt(disc);
    }

	if (dist > c_minRayDist && dist < hitData.dist) {
        hitData.fromInside = fromInside;
        hitData.dist = dist;
        hitData.normal = normalize((rayPos+rayDir*dist) - sphere.xyz) * (fromInside ? -1.0 : 1.0);
        return true;
    }

    return false;
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
    ret += environment(rayPos, rayDir, rngState) * throughput;
    return ret;
}

void getCameraVectors(out vec3 cameraPos, out vec3 cameraFwd, out vec3 cameraUp, out vec3 cameraRight) {
    cameraPos = vec3(0.01, 0.01, 600.0);
    cameraFwd = vec3(0.0, 0.0, -1.0);
    cameraRight = normalize(vec3(1.0, 0.02, 0.0));
    cameraUp = normalize(cross(cameraFwd, cameraRight));
}

void main() {
    ivec2 res = textureSize(u_renderTexture, 0);
    vec2 fragCoord = vec2(gl_FragCoord);
    uint rngState = uint(uint(fragCoord.x) * uint(1973) + uint(fragCoord.y) * uint(9277) + uint(u_seed) * uint(26699)) | uint(1);

    // calculate subpixel camera jitter for anti aliasing
    vec2 jitter = vec2(randomFloat01(rngState), randomFloat01(rngState)) - 0.5;

    vec3 cameraPos, cameraFwd, cameraUp, cameraRight;
    getCameraVectors(cameraPos, cameraFwd, cameraUp, cameraRight);
    vec3 rayDir;

    vec2 uvJittered = (gl_FragCoord.xy + jitter) / vec2(res.xy);
    vec2 screen = uvJittered * 2.0 - 1.0;

    float aspectRatio = float(res.x) / float(res.y);
    screen.y /= aspectRatio;

    float cameraDistance = tan(c_FOVDeg * 0.5 * PI / 180.0);
    rayDir = vec3(screen, cameraDistance);
    rayDir = normalize(mat3(cameraRight, cameraUp, cameraFwd) * rayDir);

    vec3 color = vec3(0.0);
    for (int i = 0; i < c_samplesPerFrame; ++i) {
    	color += traceRay(cameraPos, rayDir, rngState) / float(c_samplesPerFrame);
    }

    vec3 prevColor = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    color = mix(prevColor, color, u_blend);

    fragColor = vec4(color, u_blend);
}