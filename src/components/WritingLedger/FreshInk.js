import React from "react";
import PropTypes from "prop-types";
import { prettyDate, readingTime } from "../../lib/writingLedger";
import { fmt } from "./shared";

// The five newest posts, the newest one twice the width. Images are the
// platforms' own covers, loaded lazily; a post without one keeps a blank
// plate rather than a stand-in picture.
const FreshInk = ({ posts }) => (
  <div className="wl-fresh">
    {posts.map((p, i) => (
      <a key={p.url || p.title} href={p.url} target="_blank" rel="noopener noreferrer" className={`wl-post${i === 0 ? " is-first" : ""}`}>
        <div className="img">
          {p.image ? <img src={p.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
        </div>
        <div className="body">
          <span className="meta">{prettyDate(p.date)} · {p.platform}{p.lang === "Marathi" ? " · मराठी" : ""}</span>
          <h3 lang={p.lang === "Marathi" ? "mr" : undefined}>{p.title}</h3>
          <span className="foot">
            <span><b className="wl-num">{fmt(p.words)}</b> words</span>
            <span>{readingTime(p.words).text} read →</span>
          </span>
        </div>
      </a>
    ))}
  </div>
);

FreshInk.propTypes = { posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default FreshInk;
