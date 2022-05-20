import glslOptimize from "rollup-plugin-glsl-optimize";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    minify: "terser",
    rollupOptions: {
      plugins: [glslOptimize()],
      output: {
        interop: "auto",
      },
    },
  },
});
