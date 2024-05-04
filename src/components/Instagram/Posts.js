import React from "react";
import posts from "../../data/instagram";
import Post from "./Post";

const Posts = () => (
  <article className="Post">
    <text className="Post-title" style={{ fontSize: "50px" }}>
      Some Good Posts!
    </text>
    <br />
    <text className="Post-subtitle" style={{ fontSize: "30px" }}>
      Adding posts here since Instagram Account is now Deleted!
    </text>
    {posts.map((p) => (
      <Post data={p} />
    ))}
  </article>
);

export default Posts;
