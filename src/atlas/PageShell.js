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
  region, title, description, image, imageAlt, ogType, noindex, children,
}) => {
  const mode = useViewMode();

  if (mode === "atlas") {
    return (
      <Suspense fallback={null}>
        <RegionShell
          region={region}
          title={title}
          description={description}
          image={image}
          imageAlt={imageAlt}
          ogType={ogType}
          noindex={noindex}
        >
          {children}
        </RegionShell>
      </Suspense>
    );
  }

  return (
    <Main title={title} description={description} image={image} imageAlt={imageAlt} ogType={ogType} noindex={noindex}>
      {children}
    </Main>
  );
};

PageShell.propTypes = {
  region: PropTypes.oneOf(["marathons", "treks", "writer", "reader", "creator", "person"]),
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  ogType: PropTypes.string,
  // A "not found" state: the edge already answers a missing row with a 404,
  // and this keeps the client's own head in agreement.
  noindex: PropTypes.bool,
  children: PropTypes.node,
};

PageShell.defaultProps = {
  region: "person",
  title: null,
  description: null,
  image: null,
  noindex: false,
  children: null,
};

export default PageShell;
