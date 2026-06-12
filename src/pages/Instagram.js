import React from "react";
import Main from "../layouts/Main";
import Posts from "../components/Instagram/Posts";

const Instagram = () => {
  return (
    <Main>
      <div className="flex flex-col gap-12 w-full">
        <Posts />
      </div>
    </Main>
  );
};

export default Instagram;
