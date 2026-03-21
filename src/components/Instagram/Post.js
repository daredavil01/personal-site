import React from "react";
import PropTypes from "prop-types";

import ImageSlider from "./ImageSlider";

const Post = ({ data }) => {
  return (
    <article className="border-2 border-stone-200 dark:border-stone-800 m-2 md:m-5 p-4 md:p-8 rounded-xl bg-white dark:bg-stone-900 shadow-sm transition-colors">
      <header>
        <h2 className="text-xl md:text-3xl font-black mb-2 md:mb-4 uppercase tracking-widest text-stone-800 dark:text-stone-100">
          {data.title}
        </h2>
      </header>
      <div className="text-sm md:text-lg mb-2 md:mb-4 leading-relaxed text-stone-600 dark:text-stone-300">
        {data.caption}
      </div>
      <div className="mb-2 md:mb-4 text-sm md:text-base font-body">
        <span className="font-bold text-stone-500 dark:text-stone-400">Tags: </span>
        {data.tags.map((tag, index) => (
          <span key={tag} className="italic mr-1 text-blue-500 dark:text-blue-400">
            {tag}
            {index !== data.tags.length - 1 && ","}
          </span>
        ))}
      </div>
      <div className="w-full mt-6 rounded-lg overflow-hidden">
        <ImageSlider data={data.slideImages} />
      </div>
    </article>
  );
};

Post.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    caption: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default Post;
