import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import Markdown from "markdown-to-jsx";
import { Link } from "react-router-dom";
import { entityLabel } from "../../data/askConfig";
import { isExternal, linkDomain, normaliseUrl, sanitiseAnswer } from "../../lib/askFormat";

// Renders one answer: markdown for emphasis and lists, links as highlighted
// chips, pictures from the archive inline, and [1]/[2] citation markers turned
// into links to the source they point at.
//
// Everything is filtered through sanitiseAnswer first: a streamed answer
// arrives a token at a time, before the worker's own clean-up, so a URL that
// no retrieved item contains must never render even for a moment.

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
    .replace(/\[(\d{1,2})\](?!\()/g, (whole, n) => {
      const source = sources[Number(n) - 1];
      return source?.url ? `[${n}](${source.url})` : whole;
    });
}

const chip = "inline-flex items-baseline gap-1 rounded-md px-1.5 py-px font-medium no-underline transition-colors";

const makeLink = (sources) => {
  const AnswerLink = ({ href, children }) => {
    const url = normaliseUrl(href);
    const isCitation = /^\d{1,2}$/.test(String(children));
    if (isCitation) {
      const cls = "mx-0.5 rounded bg-stone-200 dark:bg-stone-800 px-1 text-[11px] no-underline";
      return isExternal(url)
        ? <a href={url} target="_blank" rel="noreferrer" className={cls}>{children}</a>
        : <Link to={url} className={cls}>{children}</Link>;
    }

    if (isExternal(url)) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={`${chip} bg-stone-200/80 text-stone-900 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700`}
        >
          {children}
          <span className="text-[10px] font-normal opacity-70">{`${linkDomain(url)} ↗`}</span>
        </a>
      );
    }

    const source = sources.find((s) => normaliseUrl(s.url) === url);
    return (
      <Link
        to={url}
        className={`${chip} bg-secondary/10 text-secondary hover:bg-secondary/20`}
      >
        {children}
        {source && (
          <span className="text-[10px] font-normal uppercase tracking-wide opacity-70">
            {entityLabel(source.entity_type)}
          </span>
        )}
      </Link>
    );
  };
  AnswerLink.propTypes = { href: PropTypes.string, children: PropTypes.node };
  AnswerLink.defaultProps = { href: "", children: null };
  return AnswerLink;
};

// A picture from the archive, linked to the page it belongs to. One that fails
// to load disappears instead of leaving a broken frame in the answer.
export const AnswerImage = ({ src, alt, href }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;
  const img = (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="block w-full max-h-64 object-cover rounded-lg"
    />
  );
  const external = isExternal(href || "");
  return (
    <figure className="my-2 max-w-sm">
      {href && !external && <Link to={href}>{img}</Link>}
      {href && external && <a href={href} target="_blank" rel="noreferrer">{img}</a>}
      {!href && img}
      {alt && <figcaption className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{alt}</figcaption>}
    </figure>
  );
};

AnswerImage.propTypes = { src: PropTypes.string, alt: PropTypes.string, href: PropTypes.string };
AnswerImage.defaultProps = { src: "", alt: "", href: "" };

/** Thumbnails of the cited sources, for answers that placed no picture inline. */
export const MediaStrip = ({ media }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
    {media.map((m) => {
      const img = (
        <img
          src={m.url}
          alt={m.alt || ""}
          loading="lazy"
          decoding="async"
          className="h-20 w-28 shrink-0 rounded-lg object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      );
      if (!m.href) return <span key={m.url}>{img}</span>;
      return isExternal(m.href)
        ? <a key={m.url} href={m.href} target="_blank" rel="noreferrer" title={m.alt}>{img}</a>
        : <Link key={m.url} to={m.href} title={m.alt}>{img}</Link>;
    })}
  </div>
);

MediaStrip.propTypes = {
  media: PropTypes.arrayOf(PropTypes.shape({
    url: PropTypes.string.isRequired,
    alt: PropTypes.string,
    href: PropTypes.string,
  })).isRequired,
};

// An ![alt](src) in the answer, linked to the source that owns the picture.
const MarkdownImage = ({ src, alt, sources }) => {
  const owner = sources.find((s) => normaliseUrl(s.image) === normaliseUrl(src));
  return <AnswerImage src={src} alt={alt} href={owner?.url || ""} />;
};

MarkdownImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  sources: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string, image: PropTypes.string })),
};
MarkdownImage.defaultProps = { src: "", alt: "", sources: [] };

const AnswerBody = ({ text, sources }) => {
  const options = useMemo(() => ({
    forceBlock: true,
    overrides: {
      // The answer lives in a chat bubble — headings would break it.
      h1: { component: "strong" },
      h2: { component: "strong" },
      h3: { component: "strong" },
      img: { component: MarkdownImage, props: { sources } },
      a: { component: makeLink(sources) },
      ul: { props: { className: "list-disc pl-5 my-1" } },
      ol: { props: { className: "list-decimal pl-5 my-1" } },
      p: { props: { className: "mb-2 last:mb-0 leading-relaxed" } },
    },
  }), [sources]);

  if (!text) return null;
  return (
    <Markdown options={options}>
      {linkCitations(sanitiseAnswer(text, sources), sources)}
    </Markdown>
  );
};

AnswerBody.propTypes = {
  text: PropTypes.string,
  sources: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string, image: PropTypes.string })),
};

AnswerBody.defaultProps = { text: "", sources: [] };

export default AnswerBody;
