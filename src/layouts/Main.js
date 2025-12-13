import React from 'react';
import PropTypes from 'prop-types';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import Navigation from '../components/Template/Navigation';
import SideBar from '../components/Template/SideBar';
import ScrollToTop from '../components/Template/ScrollToTop';
import DarkModeToggle from '../components/Template/DarkModeToggle';

const Main = (props) => (
  <HelmetProvider>
    <ScrollToTop />
    <Helmet
      titleTemplate="%s | Sanket Tambare"
      defaultTitle="Sanket Tambare"
      defer={false}
    >
      {props.title && <title>{props.title}</title>}
      <meta name="description" content={props.description} />
      {/* Standard Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="keywords" content="Sanket Tambare, personal website, portfolio, AI, data science, developer" />
      <meta name="author" content="Sanket Tambare" />
      {/* Open Graph Tags */}
      <meta property="og:title" content={props.title ? `${props.title} | Sanket Tambare` : "Sanket Tambare"} />
      <meta property="og:description" content={props.description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/images/me.jpg" />
      <meta property="og:site_name" content="Sanket Tambare" />
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@i_daredavil" />
      <meta name="twitter:creator" content="@i_daredavil" />
      <meta name="twitter:title" content={props.title ? `${props.title} | Sanket Tambare` : "Sanket Tambare"} />
      <meta name="twitter:description" content={props.description} />
      <meta name="twitter:image" content="/images/me.jpg" />
    </Helmet>
    <div id="wrapper">
      <Navigation />
      <div id="main">{props.children}</div>
      {props.fullPage ? null : <SideBar />}
      <DarkModeToggle />
    </div>
  </HelmetProvider>
);

Main.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  fullPage: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string,
};

Main.defaultProps = {
  children: null,
  fullPage: false,
  title: null,
  description: "Sanket Tambare's personal website.",
};

export default Main;
