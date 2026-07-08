import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import { BASE_URL, PAGE_META, DEFAULT_META, composeTitle } from "../../data/pageMeta";

// The single Helmet block for every shell (§4.3). Extracted from layouts/
// Main.js so the classic shell and the atlas RegionShell consume the exact
// same meta logic — page metadata can never fork between the two.
const PageMeta = (props) => {
  const { pathname } = useLocation();
  const pathKey = pathname.replace(/\/$/, "") || "/";
  // Route meta comes from the shared PAGE_META module (also used by the
  // Cloudflare middleware); props act as overrides for unrouted pages (404).
  const pageMeta = PAGE_META[pathKey] || DEFAULT_META;
  const title = props.title || pageMeta.title;
  const description = props.description || pageMeta.description;
  const canonicalUrl = `${BASE_URL}${pathKey === "/" ? "" : pathKey}`;
  const ogImage = props.image || pageMeta.image;
  const ogTitle = composeTitle(title);

  return (
    <Helmet
      titleTemplate="%s | Sanket Tambare"
      defaultTitle="Sanket Tambare"
      defer={false}
    >
      {title && <title>{title}</title>}
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={description} />
      {props.noindex && <meta name="robots" content="noindex" />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

PageMeta.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  noindex: PropTypes.bool,
};

PageMeta.defaultProps = {
  title: null,
  description: null,
  image: null,
  noindex: false,
};

export default PageMeta;
