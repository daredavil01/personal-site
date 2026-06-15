import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import Navigation from "../components/Template/Navigation";
import SideBar from "../components/Template/SideBar";
import Footer from "../components/Template/Footer";
import ScrollToTop from "../components/Template/ScrollToTop";
import FloatingToggle from "../components/Template/FloatingToggle";
import { BASE_URL, PAGE_META, DEFAULT_META, composeTitle } from "../data/pageMeta";

const Main = (props) => {
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
    <>
      <ScrollToTop />
      <Helmet
        titleTemplate="%s | Sanket Tambare"
        defaultTitle="Sanket Tambare"
        defer={false}
      >
        {title && <title>{title}</title>}
        <link rel="canonical" href={canonicalUrl} />
        <meta name="description" content={description} />
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

      <div className="flex flex-col min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-body transition-colors duration-300">
        <a href="#main" className="skip-link">Skip to main content</a>
        <Navigation />

        <div
          id="wrapper"
          className="flex flex-col lg:flex-row-reverse pt-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full gap-8"
        >
          <SideBar />
          <main id="main" className="flex-grow min-w-0 py-8 min-h-[50vh]">
            {props.children}
          </main>
        </div>

        <Footer />
        <FloatingToggle />
      </div>
    </>
  );
};

Main.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
};

Main.defaultProps = {
  children: null,
  title: null,
  description: null,
  image: null,
};

export default Main;
