import React from "react";
import PropTypes from "prop-types";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import Navigation from "../components/Template/Navigation";
import SideBar from "../components/Template/SideBar";
import Footer from "../components/Template/Footer";
import ScrollToTop from "../components/Template/ScrollToTop";
import FloatingToggle from "../components/Template/FloatingToggle";

const BASE_URL = "https://daredavil.pages.dev";
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/logo.png`;

const Main = (props) => {
  const { pathname } = useLocation();
  const canonicalUrl = `${BASE_URL}${pathname}`;
  const ogImage = props.image || DEFAULT_OG_IMAGE;
  const ogTitle = props.title ? `${props.title} | Sanket Tambare` : "Sanket Tambare";

  return (
    <HelmetProvider>
      <ScrollToTop />
      <Helmet
        titleTemplate="%s | Sanket Tambare"
        defaultTitle="Sanket Tambare"
        defer={false}
      >
        {props.title && <title>{props.title}</title>}
        <meta name="description" content={props.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={props.description} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={props.description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-body transition-colors duration-300">
        <Navigation />

        <div
          id="wrapper"
          className="flex flex-col lg:flex-row pt-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full gap-8"
        >
          <SideBar />
          <main id="main" className="flex-grow min-w-0 py-8 min-h-[50vh]">
            {props.children}
          </main>
        </div>

        <Footer />
        <FloatingToggle />
      </div>
    </HelmetProvider>
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
  description: "Sanket Tambare's personal website.",
  image: null,
};

export default Main;
