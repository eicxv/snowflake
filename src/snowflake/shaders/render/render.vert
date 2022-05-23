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


uint h(inout uint s) {
	s *= 747796405u + 2891336453u;
	uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
	return (w >> 22u) ^ w;
}

float rf(inout uint state) {
    return float(h(state)) / 4294967296.0;
}

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);

  v_rayOrigin = u_cameraPosition;

  uint s = u_seed;
  vec2 r = vec2(textureSize(u_renderTexture, 0));
  vec2 j = 2. * (vec2(rf(s), rf(s)) - 0.5) / r;
  vec2 t = a_position * (r - 1.0) / r;
  t += j;
  t *= XY_SCALE * ZOOM_FACTOR;
  v_rayTarget = (u_viewMatrix * vec4(t, 0.0, 1.0)).xyz;
}