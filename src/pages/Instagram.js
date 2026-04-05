import React from "react";
import Main from "../layouts/Main";
import Posts from "../components/Instagram/Posts";

const Instagram = () => {
  return (
    <Main
      title="Instagram"
      description="A curated visual archive of captured moments, textures, and stories — preserved from before the Instagram account was deleted."
    >
      <div className="flex flex-col gap-12 w-full">
        <Posts />
      </div>
    </Main>
  );
};

export default Instagram;
