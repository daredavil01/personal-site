// Whether this browser can give three.js a WebGL context.
//
// A locked-down browser, a remote desktop or a GPU on the blocklist has none,
// and `THREE.WebGLRenderer` throws when it asks. The globe checks first and
// draws a static panel instead, so it never has to rely on the error boundary.
// jsdom has no WebGL either, so tests take the same safe path.

let cached = null;

export function hasWebGL() {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2")
      || canvas.getContext("webgl")
      || canvas.getContext("experimental-webgl");
    cached = !!gl;
    // Hand the context back rather than hold one of the browser's few slots.
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch (e) {
    cached = false;
  }
  return cached;
}

export default hasWebGL;
