import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { tagPath } from "../../lib/api/tags";

// A detail page's tags, each linking to its /tags/:name page.
const TagLinks = ({ tags, className }) => {
  if (!tags?.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Link
          key={tag}
          to={tagPath(tag)}
          className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-xs border border-stone-100 dark:border-stone-800 hover:border-secondary/40 hover:text-secondary transition-colors no-underline"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
};

TagLinks.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};

TagLinks.defaultProps = {
  tags: [],
  className: "",
};

export default TagLinks;
