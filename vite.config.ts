import glslOptimize from "rollup-plugin-glsl-optimize";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./src",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    minify: "terser",
    assetsDir: "public",
    rollupOptions: {
      plugins: [glslOptimize()],
      output: {
        interop: "auto",
      },
    },
  },
});
