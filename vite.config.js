import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migrated from Create React App (react-scripts). Key compatibility shims:
// - `define` replaces process.env.PUBLIC_URL, which the generated data files
//   in src/data embed as template literals (do NOT regenerate them instead).
// - The esbuild loader/optimizeDeps blocks let JSX live in .js files (the
//   whole codebase does); plugin-react only transforms .jsx/.tsx.
// - outDir stays `build/` so the Cloudflare Pages config is untouched.
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.PUBLIC_URL": JSON.stringify(""),
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
    jsx: "automatic",
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "build",
    sourcemap: true,
  },
});
