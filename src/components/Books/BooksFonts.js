import React from "react";
import { Helmet } from "react-helmet-async";
import "./books.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..900,0..100;1,9..144,400..900,0..100&family=Tiro+Devanagari+Marathi:ital@0;1&display=swap";

/** Fraunces and Tiro Devanagari Marathi, on the books pages only. */
const BooksFonts = () => (
  <Helmet>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href={FONTS} />
  </Helmet>
);

export default BooksFonts;
