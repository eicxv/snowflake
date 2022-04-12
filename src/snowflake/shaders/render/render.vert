#version 300 es

in vec2 a_position;
in vec2 a_textureCoord;

out vec3 v_rayPos;
out vec3 v_rayDir;

const vec3 cameraPosition = vec3(0.,0., 100.);

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_rayPos = cameraPosition;
  v_rayDir = vec3(a_position * .25, 3.0) - v_rayPos;
}