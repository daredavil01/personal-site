// The single GSAP import point (§4.7). Every atlas module imports gsap from
// here — never from "gsap" directly — so tree-shaking and chunk placement
// stay controlled: GSAP lands in the lazy atlas chunks and never in the
// entry bundle. Plugins (when phases 3–4 need them) are registered here:
//
//   import { ScrollTrigger } from "gsap/ScrollTrigger";
//   gsap.registerPlugin(ScrollTrigger);
//
// Ownership rule (§4.6): usePanZoom owns the SVG viewBox; GSAP only ever
// animates element transforms/opacity. Do not add viewBox tweens here.

// eslint-disable-next-line import/prefer-default-export -- named re-export keeps call sites identical to upstream gsap
export { gsap } from "gsap";
