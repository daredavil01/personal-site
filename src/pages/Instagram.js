import React from "react";
import Main from "../layouts/Main";
import Posts from "../components/Instagram/Posts";

const Instagram = () => {
  return (
    <Main
      title="Instagram"
      description="Adding posts here since Instagram Account is now Deleted!"
    >
      <article className="post" id="instagram">
        <header>
          <div className="title">
            <h2 className="font-headline"><a href="/instagram">Instagram</a></h2>
            <p>Here are archived Instagram posts...</p>
          </div>
        </header>
        <Posts />
      </article>
    </Main>
  );
};

export default Instagram;
