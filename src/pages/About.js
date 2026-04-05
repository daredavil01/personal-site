import React, { useState, useEffect } from "react";
import Main from "../layouts/Main";
import AboutDocument from "../components/About/AboutDocument";

const About = () => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    import("../data/about.md")
      .then((res) => {
        fetch(res.default)
          .then((r) => r.text())
          .then(setMarkdown);
      })
      .catch(console.error);
  }, []);

  const count = markdown
    .split(/\s+/)
    .map((s) => s.replace(/\W/g, ""))
    .filter((s) => s.length).length;

  return (
    <Main title="About" description="Full-stack software engineer, marathoner, and digital thinker. Read about Sanket Tambare's background, interests, and what drives him.">
      <AboutDocument markdown={markdown} count={count} />
    </Main>
  );
};

export default About;
