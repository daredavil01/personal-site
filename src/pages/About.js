import React from "react";
import Main from "../layouts/Main";
import AboutDocument from "../components/About/AboutDocument";

const About = () => (
  <Main
    title="About"
    description="Full-stack software developer, ultra-marathoner, fort-trekker, and writer. Read about Sanket Tambare's background, interests, and what drives him."
    image="https://daredavil.pages.dev/images/me.jpg"
  >
    <AboutDocument />
  </Main>
);

export default About;
