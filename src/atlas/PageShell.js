// PageShell — the single mode switch between the two shells (§4.1).
//
// Target shape (from phase 5 on):
//   atlas mode   -> lazy RegionShell themed as `region`'s biome
//   classic mode -> the existing Main layout
//
// Until RegionShell exists this is a deliberate classic passthrough: pages
// can already migrate to <PageShell region="…"> (one import + one wrapper
// element each, content untouched) and pick up the atlas shell later without
// a second edit. `region` keys match src/components/Index/globe/domains.js.

import React from "react";
import PropTypes from "prop-types";
import Main from "../layouts/Main";

const PageShell = ({ title, description, image, children }) => (
  <Main title={title} description={description} image={image}>
    {children}
  </Main>
);

PageShell.propTypes = {
  // Accepted now so page wraps are stable; consumed from phase 5.
  // eslint-disable-next-line react/no-unused-prop-types
  region: PropTypes.oneOf(["marathons", "treks", "writer", "reader", "creator", "person"]),
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  children: PropTypes.node,
};

PageShell.defaultProps = {
  region: "person",
  title: null,
  description: null,
  image: null,
  children: null,
};

export default PageShell;
