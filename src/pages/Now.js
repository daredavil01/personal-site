import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Markdown from "markdown-to-jsx";

import Main from "../layouts/Main";

const Now = () => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    import("../data/now.md")
      .then((res) => {
        fetch(res.default)
          .then((r) => r.text())
          .then(setMarkdown);
      })
      .catch(console.error);
  });

  const count = markdown
    .split(/\s+/)
    .map((s) => s.replace(/\W/g, ""))
    .filter((s) => s.length).length;

  return (
    <Main title="Now" description="What I am upto this month">
      <article className="post markdown" id="now">
        <header>
          <div className="title">
            <h2>
              <Link to="/now">Now</Link>
            </h2>
            <p>(in about {count} words)</p>
          </div>
        </header>
        <Markdown>{markdown}</Markdown>
      </article>
    </Main>
  );
};

export default Now;
