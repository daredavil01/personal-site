import React from "react";

// Shared "In 1 Minute" intro blurb. Rendered on both the home page
// (src/pages/Index.js) and the About page (src/components/About/AboutDocument.js)
// so the two never drift out of sync. Pass `className` to style the <p> per context.
const OneMinuteIntro = ({ className = "" }) => (
  <p className={className}>
    Software developer by day, ultra-marathoner and fort-trekker by adventure. I care deeply about
    the intersection of technology, society, and public policy — and I write about it weekly in
    my Substack newsletter <em>The Wanderer&apos;s Technical Anecdotes</em>, as part of the 100 Days
    to Offload challenge. I also host <em>Dare Write&apos;s</em>, a podcast on book reviews,
    technology, and travelogues. I read voraciously in both English and Marathi.
  </p>
);

export default OneMinuteIntro;
