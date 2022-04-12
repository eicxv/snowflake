#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define PI 3.14159265359
#define TAU 6.28318530718
#define EPS 0.0001

#define HEIGHT 2. // lattice max height

#define SEARCH_ITER 4 // max binary search iterations
#define MARCH_ITER 16 // max ray march iterations

uniform highp sampler2D u_renderTexture;
uniform highp sampler2D u_normalTexture;
uniform uint u_step;

out vec4 fragColor;

const float c_minRayDist = 0.01;

const float c_rayPosNudge = 0.01;

// the farthest we look for ray hits
const float c_far = 10000.0;

// camera FOV
const float c_FOVDeg = 178.1;

// number of ray bounces allowed max
const int c_maxBounces = 12;

// how many renders per frame - make this larger to get around the vsync limitation, and get a better image faster.
const int c_samplesPerFrame = 8;

struct Material {
    vec3  albedo;              // the color used for diffuse lighting
    vec3  emissive;            // how much the surface glows
    float specularChance;      // percentage chance of doing a specular reflection
    float specularRoughness;   // how rough the specular reflections are
    vec3  specularColor;       // the color tint of specular reflections
    float IOR;                 // index of refraction. used by fresnel and refraction.
    float refractionChance;    // percent chance of doing a refractive transmission
    float refractionRoughness; // how rough the refractive transmissions are
    vec3  refractionColor;     // absorption for beer's law
};

struct HitData {
    bool fromInside;
    float dist;
    vec3 normal;
    Material material;
};

#define DEBUG 0
// #define LIGHT

#if DEBUG == 0
const Material iceMaterial = Material(
    vec3(0.2, 0.2, 0.3),            // albedo
    vec3(0.0, 0.0, 0.0),            // emissive
    0.01,                           // specularChance
    0.01,                           // specularRoughness
    vec3(1.0, 1.0, 1.0) * 0.8,      // specularColor
    1.309,                          // IOR
    1.,                           // refractionChance
    0.0000000001,                            // refractionRoughness
    vec3(0.14, 0.04, 0.04)           // refractionColor
);
#else
const Material iceMaterial = Material(
    vec3(0.0, 0.0, 0.0),            // albedo
    vec3(0.0, 0.0, 0.0),            // emissive
    0.0,                            // specularChance
    0.01,                           // specularRoughness
    vec3(1.0, 1.0, 1.0) * 0.8,      // specularColor
    1.309,                          // IOR
    0.0,                            // refractionChance
    0.0,                            // refractionRoughness
    vec3(0.0, 0.0, 0.)              // refractionColor
);
#endif

vec4 sampleLatticeInter(vec2 uv) {
    uv = (uv + 0.5);
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
#define MID vec3(0.01, 0.03, 0.05)
#define SKY vec3(0.1, 0.3, 0.5)
#define PALETTE vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)
#endif
#define ANGLE_OFFSET 0.3241
#define COLOR_1 vec3(1., 0.718, 0.012) * 6.
#define COLOR_2 vec3(0.071, 0.404, 0.51) * 3.
#define COLOR_3 vec3(0.788, 0.094, 0.29) * 3.

vec3 environmentAlt(vec3 n) {
    #if DEBUG == 1
    return vec3(0.);
    #else
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
    #endif
}

vec3 light(vec3 rayDir, vec3 color, vec3 lightDir, float a1, float a2) {
    float blend = smoothstep(a1, a2, dot(rayDir, lightDir));
    return color * blend;
}

vec3 environment(vec3 rayDir) {
    vec3 col;
    vec3 ground = GROUND;
    vec3 mid = MID;
    vec3 sky = SKY;
    float midGroundBlend = smoothstep(-0.99, -0.95, rayDir.z);
    float skyMidBlend = smoothstep(-0.2, 0.2, rayDir.z);
    col = mix(ground, mid, midGroundBlend);
    col = mix(col, sky, skyMidBlend);

    vec3 lightDir;
    lightDir = vec3(cos(ANGLE_OFFSET), sin(ANGLE_OFFSET), 0);
    col += light(rayDir, COLOR_1, lightDir, 0.8, 0.9);
    lightDir = vec3(cos(TAU / 3. + ANGLE_OFFSET), sin(TAU / 3. + ANGLE_OFFSET), 0);
    col += light(rayDir, COLOR_2, lightDir, 0.8, 0.9);
    lightDir = vec3(cos(2. * TAU / 3. + ANGLE_OFFSET), sin(2. * TAU / 3. + ANGLE_OFFSET), 0);
    col += light(rayDir, COLOR_3, lightDir, 0.8, 0.9);
    return col;
}

vec3 lessThan_(vec3 f, float value) {
    return vec3(
        (f.x < value) ? 1.0 : 0.0,
        (f.y < value) ? 1.0 : 0.0,
        (f.z < value) ? 1.0 : 0.0);
}

vec3 linearToSRGB(vec3 rgb) {
    rgb = clamp(rgb, 0.0, 1.0);

    return mix(
        pow(rgb, vec3(1.0 / 2.4)) * 1.055 - 0.055,
        rgb * 12.92,
        lessThan_(rgb, 0.0031308)
    );
}

vec3 SRGBToLinear(vec3 rgb) {
    rgb = clamp(rgb, 0.0, 1.0);

    return mix(
        pow(((rgb + 0.055) / 1.055), vec3(2.4)),
        rgb / 12.92,
        lessThan_(rgb, 0.04045)
	);
}

uint wang_hash(inout uint seed) {
    seed = uint(seed ^ 61u) ^ uint(seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4);
    seed *= uint(0x27d4eb2d);
    seed = seed ^ (seed >> 15);
    return seed;
}

float randomFloat01(inout uint state) {
    return float(wang_hash(state)) / 4294967296.0;
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
        tex = sampleLatticeInter(p.xy);
        if (inside ^^ (abs(p.z) > tex.w)) {
            p0 = p;
        } else {
            p1 = p;
        }
        p = mix(p0, p1, 0.5);
    }
    tex = sampleLatticeInter(p.xy);
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
    vec4 tex = sampleLatticeInter(pos.xy);
    bool isInside = abs(pos.z) < tex.w;
    float stepLen;
    for (int i = 0; i < MARCH_ITER; i++) {
        stepLen = (abs(pos.z) - tex.w) * 1.;
        pos += dir * stepLen;
        tex = sampleLatticeInter(pos.xy);
        if (isInside != abs(pos.z) < tex.w) {
            pos = binarySearchMarch(pos - dir * stepLen, pos, isInside, tex);
            break;
        }
    }
    tex = sampleLatticeInter(pos.xy);

    if (tex.w < EPS) {
        return false;
    }
    vec3 normal = tex.xyz;
    normal.z *= sign(pos.z);
    hitData.normal = normal;
    hitData.material = iceMaterial;
    hitData.fromInside = isInside;
    hitData.dist = distance(rayPos, pos);
    return true;
}

void hitScene(vec3 rayPos, vec3 rayDir, inout HitData hitData) {
    #if DEBUG == 0
    hitLatticeMarch(rayPos, rayDir, hitData);
    #elif DEBUG == 1
    bool hit = hitLatticeMarch(rayPos, rayDir, hitData);
    if (hit) {
        hitData.material.emissive = (hitData.normal * 0.5 + 0.5) * 0.3;
    }
    #else
    vec3 pos;
    hitZPlane(rayPos, rayDir, HEIGHT, pos);
    vec4 tex = sampleLatticeInter(pos.xy);
    hitData.dist = 1.;
    hitData.material =  Material(
        vec3(0.1, 0.1, 0.1),    // albedo
        tex.xyz,               // emissive
        0.,                     // specularChance
        0.,                     // specularRoughness
        vec3(0.),               // specularColor
        1.,                     // IOR
        0.,                     // refractionChance
        0.,                     // refractionRoughness
        vec3(0.)                // refractionColor
    );
    #endif
}

vec3 traceRay(vec3 rayPos, vec3 rayDir, inout uint rngState) {
    // initialize
    vec3 ret = vec3(0.0, 0.0, 0.0);
    vec3 throughput = vec3(1.0, 1.0, 1.0);

    for (int i = 0; i < c_maxBounces; i++) {
        // shoot a ray out into the world
        HitData hitData;
        hitData.dist = c_far;
        hitData.fromInside = false;
        hitScene(rayPos, rayDir, hitData);

        if (hitData.dist == c_far) {
            ret += environment(rayDir) * throughput;
            break;
        }

        // absorption
        if (hitData.fromInside)
            throughput *= exp(-hitData.material.refractionColor * hitData.dist);

        float specularChance = hitData.material.specularChance;
        float refractionChance = hitData.material.refractionChance;

        float rayProbability = 1.0;
        if (specularChance > 0.0) {
        	specularChance = fresnelReflectAmount(
            	hitData.fromInside ? hitData.material.IOR : 1.0,
            	!hitData.fromInside ? hitData.material.IOR : 1.0,
            	hitData.normal, rayDir, hitData.material.specularChance, 1.0);

            float chanceMultiplier = (1.0 - specularChance) / (1.0 - hitData.material.specularChance);
            refractionChance *= chanceMultiplier;
        }

        float doSpecular = 0.0;
        float doRefraction = 0.0;
        float raySelectRoll = randomFloat01(rngState);
		if (specularChance > 0.0 && raySelectRoll < specularChance) {
            doSpecular = 1.0;
            rayProbability = specularChance;
        }
        else if (refractionChance > 0.0 && raySelectRoll < specularChance + refractionChance) {
            doRefraction = 1.0;
            rayProbability = refractionChance;
        }
        else {
            rayProbability = 1.0 - (specularChance + refractionChance);
        }

        // avoid potential divide by zero
		rayProbability = max(rayProbability, 0.001);

        // nudge ray away from surface
        if (doRefraction == 1.0) {
            rayPos = (rayPos + rayDir * hitData.dist) - hitData.normal * c_rayPosNudge;
        }
        else {
            rayPos = (rayPos + rayDir * hitData.dist) + hitData.normal * c_rayPosNudge;
        }

        // Calculate a new ray direction.
        vec3 diffuseRayDir = normalize(hitData.normal + randomUnitVector(rngState));

        vec3 specularRayDir = reflect(rayDir, hitData.normal);
        specularRayDir = normalize(mix(specularRayDir, diffuseRayDir, hitData.material.specularRoughness*hitData.material.specularRoughness));

        vec3 refractionRayDir = refract(rayDir, hitData.normal, hitData.fromInside ? hitData.material.IOR : 1.0 / hitData.material.IOR);
        refractionRayDir = normalize(mix(refractionRayDir, normalize(-hitData.normal + randomUnitVector(rngState)), hitData.material.refractionRoughness*hitData.material.refractionRoughness));

        rayDir = mix(diffuseRayDir, specularRayDir, doSpecular);
        rayDir = mix(rayDir, refractionRayDir, doRefraction);

		// emissive lighting
        ret += hitData.material.emissive * throughput;

        // update throughput
        if (doRefraction == 0.0)
        	throughput *= mix(hitData.material.albedo, hitData.material.specularColor, doSpecular);

        throughput /= rayProbability;

        // Russian Roulette
        float p = max(throughput.r, max(throughput.g, throughput.b));
        if (randomFloat01(rngState) > p)
            break;

        throughput *= 1.0 / p;
    }
    return ret;
}

void getCameraVectors(out vec3 cameraPos, out vec3 cameraFwd, out vec3 cameraUp, out vec3 cameraRight) {
    cameraPos = vec3(0.01, 0.01, 30.0);
    cameraFwd = vec3(0.0, 0.0, -1.0);
    cameraRight = normalize(vec3(1.0, 0.02, 0.0));
    cameraUp = normalize(cross(cameraFwd, cameraRight));
}

void main() {
    ivec2 res = textureSize(u_renderTexture, 0);
    vec2 fragCoord = vec2(gl_FragCoord);
    uint rngState = uint(uint(fragCoord.x) * uint(1973) + uint(fragCoord.y) * uint(9277) + uint(u_step) * uint(26699)) | uint(1);

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

    float blend = 1.0 / float(u_step + 1u);
    vec3 prevColor = texelFetch(u_renderTexture, ivec2(gl_FragCoord.xy), 0).xyz;
    color = mix(prevColor, color, blend);

    fragColor = vec4(color, blend);
}