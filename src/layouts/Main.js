import React from "react";
import PropTypes from "prop-types";

import Navigation from "../components/Template/Navigation";
import SideBar from "../components/Template/SideBar";
import Footer from "../components/Template/Footer";
import ScrollToTop from "../components/Template/ScrollToTop";
import FloatingToggle from "../components/Template/FloatingToggle";
import PageMeta from "../components/Template/PageMeta";
import "../styles/classic.css"; // bare-element defaults, scoped to .classic-root

const Main = (props) => (
  <>
    <ScrollToTop />
    <PageMeta title={props.title} description={props.description} image={props.image} />

    <div className="classic-root flex flex-col min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-body transition-colors duration-300">
      <a href="#main" className="skip-link">Skip to main content</a>
      <Navigation />

      <div className="flex flex-col lg:flex-row-reverse pt-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full gap-8">
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
