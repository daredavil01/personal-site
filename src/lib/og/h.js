// Hyperscript for satori element trees.
//
// Satori's layout engine only needs `{ type, props }` objects — which is all a
// React element is — so cards are built with this instead of JSX. That matters
// for two reasons:
//
//   1. `vite.config.js` applies its JSX-in-.js esbuild loader only to
//      `/src\/.*\.js$/`, and the Cloudflare Pages Functions bundler is a
//      SEPARATE esbuild pass that does NOT transform JSX. A layout written in
//      JSX would compile for the browser and fail in the Worker.
//   2. It keeps React out of the Worker bundle entirely.
//
// Children are flattened and nullish/false/empty entries dropped, so a layout
// can write `cond && h(...)` inline the way JSX allows.
//
// `children` is then NORMALISED to match what satori expects from React:
// omitted when there are none, the bare value when there is one, an array only
// when there are several. This is not cosmetic — satori treats an ARRAY-valued
// `children` as "more than one child" whatever its length, and then rejects any
// `<div>` without an explicit `display`. Always wrapping would therefore force
// `display: flex` onto every styled leaf in every layout.

export const h = (type, props, ...children) => {
  const kids = children
    .flat(Infinity)
    .filter((child) => child != null && child !== false && child !== "");

  const normalised = { ...(props || {}) };
  if (kids.length === 1) {
    [normalised.children] = kids;
  } else if (kids.length > 1) {
    normalised.children = kids;
  }

  return { type, props: normalised };
};

// A satori text leaf is just a string, but a div that mixes strings and
// elements lays out more predictably when every child is an element.
export const text = (value) => h("div", {}, String(value));

export default h;
