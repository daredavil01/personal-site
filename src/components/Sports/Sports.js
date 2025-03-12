import React from "react";
import sportsData from "../../data/sports";
import Sport from "./Sport";

sportsData.sort((a, b) => b.id - a.id);

const Sports = () => (
  <article className="Post">
    <text className="Post-title" style={{ fontSize: "50px" }}>
      Marathons run till date!
    </text>
    <br />
    <text className="Post-subtitle" style={{ fontSize: "30px" }}>
      Till date, I have run 1000+ Kms in runnning practive and participated in
      <b>{sportsData.length}</b> marathons.
    </text>
    {sportsData.map((p) => (
      <Sport data={p} />
    ))}
  </article>
);

export default Sports;
