function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

export class ComputeVariable {
  private length: number;
  private textures: WebGLTexture[];
  private framebuffers: WebGLFramebuffer[];
  private head: number;
  readonly resolution: [number, number];

  constructor(
    textures: WebGLTexture[],
    framebuffers: WebGLFramebuffer[],
    resolution: [number, number]
  ) {
    this.length = textures.length;
    this.textures = textures;
    this.framebuffers = framebuffers;
    this.head = 0;
    this.resolution = resolution;
  }

  advance(): void {
    this.head = this.head + 1;
    if (this.head >= this.length) {
      this.head = 0;
    }
  }

  get framebuffer(): WebGLFramebuffer {
    return this.framebuffers[this.head];
  }

  get texture(): WebGLFramebuffer {
    return this.textures[this.head];
  }

  getFramebuffer(offset: number = 0): WebGLFramebuffer {
    const index = mod(this.head + offset, this.length);
    return this.framebuffers[index];
  }

  getTexture(offset: number = 0): WebGLTexture {
    const index = mod(this.head + offset, this.length);
    return this.textures[index];
  }
}
