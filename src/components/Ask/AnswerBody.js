import React from "react";
import PropTypes from "prop-types";
import Markdown from "markdown-to-jsx";
import { Link } from "react-router-dom";

// Renders one answer: markdown for emphasis and lists, and [1]/[2] citation
// markers turned into links to the source they point at.
//
// markdown-to-jsx is already a dependency (the changelog and about pages use
// it), so this costs nothing extra in the bundle.

// Citation markers are rewritten into markdown links BEFORE rendering, rather
// than post-processed out of the rendered tree — that way an answer keeps its
// bold and its lists instead of having to choose between markdown and
// citations. A number the model invented has no source, so it stays plain text
// rather than linking somewhere wrong.
function linkCitations(text, sources) {
  return String(text)
    // Models sometimes decorate a marker — "[Facts, 1]", "[Source 2]". The
    // worker normalises the finished answer, but a streamed one reaches the
    // page a token at a time, so the same tidy-up has to happen here.
    .replace(/\[(?:facts?|sources?|item)[^\]]*?(\d{1,2})\]/gi, "[$1]")
    .replace(/\[(?:facts?|sources?)\]/gi, "")
    .replace(/\[(\d{1,2})\]/g, (whole, n) => {
      const source = sources[Number(n) - 1];
      return source?.url ? `[${n}](${source.url})` : whole;
    });
}

const CiteLink = ({ href, children }) => {
  const internal = typeof href === "string" && href.startsWith("/");
  const isCitation = internal && /^\d{1,2}$/.test(String(children));
  const className = isCitation
    ? "mx-0.5 rounded bg-stone-200 dark:bg-stone-800 px-1 text-[11px] no-underline"
    : "underline underline-offset-2";

  if (internal) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
};

CiteLink.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
};

CiteLink.defaultProps = { href: "", children: null };

const MARKDOWN_OPTIONS = {
  forceBlock: true,
  overrides: {
    // The answer lives in a chat bubble — headings and images would break it.
    h1: { component: "strong" },
    h2: { component: "strong" },
    h3: { component: "strong" },
    img: { component: () => null },
    a: { component: CiteLink },
    ul: { props: { className: "list-disc pl-5 my-1" } },
    ol: { props: { className: "list-decimal pl-5 my-1" } },
    p: { props: { className: "mb-2 last:mb-0" } },
  },
};

const AnswerBody = ({ text, sources }) => {
  if (!text) return null;
  return (
    <Markdown options={MARKDOWN_OPTIONS}>{linkCitations(text, sources)}</Markdown>
  );
};

AnswerBody.propTypes = {
  text: PropTypes.string,
  sources: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
};

AnswerBody.defaultProps = { text: "", sources: [] };

export default AnswerBody;
