/* eslint-disable jsx-a11y/media-has-caption */
import React from "react";

import first from "../../static/reels/1.mp4";
import third from "../../static/reels/3.mp4";
import fifth from "../../static/reels/5.mp4";

const Videos = () => (
  <article className="Post">
    <text className="Post-title" style={{ fontSize: "50px" }}>
      Some Good Reels!
    </text>
    <br />
    <text className="Post-subtitle" style={{ fontSize: "30px" }}>
      Adding Reels here since Instagram Account is now Deleted!
    </text>
    <video src={first} width="750" height="500" controls />
    <video src={third} width="750" height="500" controls />
    <video src={fifth} width="750" height="500" controls />
  </article>
);

export default Videos;
