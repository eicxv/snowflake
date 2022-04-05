#version 300 es

in vec2 a_position;
in vec2 a_textureCoord;

out vec2 v_cellCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_cellCoord = a_textureCoord;
}