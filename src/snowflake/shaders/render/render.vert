#version 300 es

#define PI 3.14159265359
#define XY_SCALE 20.
#define ZOOM_FACTOR 0.46

in vec2 a_position;
in vec2 a_textureCoord;

out vec3 v_rayOrigin;
out vec3 v_rayTarget;

uniform highp sampler2D u_renderTexture;
uniform mat4 u_viewMatrix;
uniform vec3 u_cameraPosition;
uniform uint u_seed;


uint pcg(inout uint state) {
	state *= 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

float randomFloat01(inout uint state) {
    return float(pcg(state)) / 4294967296.0;
}

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);

  v_rayOrigin = u_cameraPosition;

  uint seed = u_seed;
  vec2 res = vec2(textureSize(u_renderTexture, 0));
  vec2 jitter = 2. * (vec2(randomFloat01(seed), randomFloat01(seed)) - 0.5) / res;
  vec2 target = a_position * (res - 1.0) / res;
  target += jitter;
  target *= XY_SCALE * ZOOM_FACTOR;
  v_rayTarget = (u_viewMatrix * vec4(target, 0.0, 1.0)).xyz;
}