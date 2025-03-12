import React from "react";
import sportsData from "../../data/sports";
import Sport from "./Sport";

const Sports = () => (
  <article className="Post">
    <text className="Post-title" style={{ fontSize: "50px" }}>
      Till date, I have ran numerous marathons and here are some of them!
    </text>
    <br />
    <text className="Post-subtitle" style={{ fontSize: "30px" }}>
      Additional details can be found in the posts below.
    </text>
    {sportsData.map((p) => (
      <Sport data={p} />
    ))}
  </article>
);

export default Sports;
