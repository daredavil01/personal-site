import React from "react";
import PageShell from "../atlas/PageShell";
import Posts from "../components/Instagram/Posts";

const Instagram = () => {
  return (
    <PageShell region="person">
      <div className="flex flex-col gap-12 w-full">
        <Posts />
      </div>
    </PageShell>
  );
};

export default Instagram;
