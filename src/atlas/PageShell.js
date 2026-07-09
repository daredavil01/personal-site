// PageShell — the single mode switch between the two shells (§4.1).
//
//   atlas mode   -> lazy RegionShell themed as `region`'s biome
//   classic mode -> the existing Main layout
//
// Every migrated page changes exactly one import + wrapper element; the inner
// content component is untouched (RegionShell keeps it visually identical in
// wave-1). `region` keys match src/components/Index/globe/domains.js.

import React, { Suspense } from "react";
import PropTypes from "prop-types";
import Main from "../layouts/Main";
import useViewMode from "./useViewMode";

const RegionShell = React.lazy(() => import("./regions/RegionShell"));

const PageShell = ({
  region, title, description, image, children,
}) => {
  const mode = useViewMode();

  if (mode === "atlas") {
    return (
      <Suspense fallback={null}>
        <RegionShell region={region} title={title} description={description} image={image}>
          {children}
        </RegionShell>
      </Suspense>
    );
  }

  return (
    <Main title={title} description={description} image={image}>
      {children}
    </Main>
  );
};

PageShell.propTypes = {
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
