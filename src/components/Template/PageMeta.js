import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import {
  SITE_URL, PAGE_META, DEFAULT_META, OG_IMAGE, composeTitle,
} from "../../data/pageMeta";
import { ogCardUrl } from "../../lib/og/paths";

// The single Helmet block for every shell (§4.3). Extracted from layouts/
// Main.js so the classic shell and the atlas RegionShell consume the exact
// same meta logic — page metadata can never fork between the two.
//
// This must stay tag-for-tag identical to what functions/_middleware.js
// injects. The middleware is what crawlers actually see (they do not run JS);
// this side exists so the in-app share sheet and any JS-capable scraper agree
// with it. Adding a tag to one without the other is the drift this pairing
// exists to prevent. og:site_name is absent from both on purpose — index.html
// carries it globally, and adding it here would duplicate the tag.
const PageMeta = (props) => {
  const { pathname } = useLocation();
  const pathKey = pathname.replace(/\/$/, "") || "/";
  // Route meta comes from the shared PAGE_META module (also used by the
  // Cloudflare middleware); props act as overrides for unrouted pages (404).
  const pageMeta = PAGE_META[pathKey] || DEFAULT_META;
  const title = props.title || pageMeta.title;
  const description = props.description || pageMeta.description;
  const canonicalUrl = `${SITE_URL}${pathKey === "/" ? "" : pathKey}`;
  // A fixed route renders its card on demand from its ogSlug; a detail page
  // passes the card URL down as `image`. Either way `pageMeta.image` is the
  // committed fallback, so there is always a real 1200x630 image.
  const ogImage = props.image
    || (pageMeta.ogSlug
      ? ogCardUrl({ kind: "page", id: pageMeta.ogSlug, fallbackSlug: pageMeta.ogSlug, siteUrl: SITE_URL })
      : pageMeta.image);
  const imageAlt = props.imageAlt || pageMeta.imageAlt || description;
  const ogType = props.ogType || pageMeta.type || "website";
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
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={String(OG_IMAGE.width)} />
      <meta property="og:image:height" content={String(OG_IMAGE.height)} />
      <meta property="og:image:alt" content={imageAlt} />
      {props.publishedTime && <meta property="article:published_time" content={props.publishedTime} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />
    </Helmet>
  );
};

PageMeta.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  ogType: PropTypes.string,
  publishedTime: PropTypes.string,
  noindex: PropTypes.bool,
};

PageMeta.defaultProps = {
  title: null,
  description: null,
  image: null,
  imageAlt: null,
  ogType: null,
  publishedTime: null,
  noindex: false,
};

export default PageMeta;
