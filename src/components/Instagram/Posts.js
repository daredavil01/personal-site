import React from "react";
import posts from "../../data/instagram";
import Post from "./Post";

const Posts = () => (
  <article className="w-full flex flex-col gap-8">
    <div>
      <h1 className="font-headline text-3xl md:text-5xl font-bold text-stone-900 dark:text-stone-100 mb-4">
        Some Good Posts!
      </h1>
      <p className="font-body text-stone-500 dark:text-stone-400 text-base md:text-xl">
        Adding posts here since Instagram Account is now Deleted!
      </p>
    </div>
    {posts.map((p) => (
      <Post key={p.title} data={p} />
    ))}
  </article>
);

export default Posts;
