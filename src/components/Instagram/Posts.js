import React from "react";
import Post from "./Post";
import { useInstagram } from "../../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../common/AsyncStates";

const Posts = () => {
  const { data: posts, loading, error } = useInstagram();

  return (
    <article className="w-full flex flex-col gap-8">
      <div data-tour="instagram-hero">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-stone-900 dark:text-stone-100 mb-4">
          Some Good Posts!
        </h1>
        <p className="font-body text-stone-500 dark:text-stone-400 text-base md:text-xl">
          Adding posts here since Instagram Account is now Deleted!
        </p>
      </div>
      {loading && <LoadingBlock label="Loading posts…" />}
      {error && <ErrorBlock />}
      {!loading && !error && posts.map((p) => (
        <Post key={p.title} data={p} />
      ))}
    </article>
  );
};

export default Posts;
