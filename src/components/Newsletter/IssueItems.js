import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { itemTitle } from "../../lib/newsletterIssue";
import { getMicroblogPost } from "../../lib/api/microblog";
import ShareImageModal from "../share/ShareImageModal";
import { detailPath } from "./issueHooks";

// The rows of one issue section, used by both layouts. Items that came from the
// archive link to their own page (which has the full story and its own share
// buttons); hand-typed items link out, or not at all.

const fmtDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso || ""))) return "";
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const metaFor = (key, item) => [
  fmtDate(item.date),
  key === "running" && item.distance ? `${item.distance} km` : null,
  key === "running" ? item.time : null,
  key === "running" ? item.note : null,
  key === "blogs" ? item.platform : null,
  key === "certificates" ? item.org : null,
].filter(Boolean).join(" · ");

const BLURB_KEYS = new Set(["events", "projects", "blogs"]);

const TitleLink = ({ to, href, children }) => {
  const cls = "font-body text-[15px] font-semibold text-stone-900 dark:text-stone-100 hover:text-secondary dark:hover:text-secondary transition-colors no-underline";
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <span className="font-body text-[15px] font-semibold text-stone-900 dark:text-stone-100">{children}</span>;
};

TitleLink.propTypes = { to: PropTypes.string, href: PropTypes.string, children: PropTypes.node };
TitleLink.defaultProps = { to: null, href: null, children: null };

const SHARE_KINDS = {
  sport: "sport", trek: "trek", book: "book", blog: "blog", microblog: "microblog",
};

// "Share as image" for one archive item, reusing that item's own share card.
// Micro-posts are fetched on click — they are not in the content cache.
export const ItemShare = ({ item, find }) => {
  const [open, setOpen] = useState(null);
  const kind = SHARE_KINDS[item?.ref?.type];
  if (!kind) return null;
  const start = async () => {
    const row = kind === "microblog"
      ? await getMicroblogPost(item.ref.id).catch(() => null)
      : find(item.ref);
    if (row) setOpen(row);
  };
  return (
    <>
      <button
        type="button"
        onClick={start}
        title="Share as image"
        aria-label="Share as image"
        className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full text-stone-400 hover:text-secondary hover:bg-secondary/[0.06] transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">ios_share</span>
      </button>
      {open && <ShareImageModal kind={kind} item={open} onClose={() => setOpen(null)} />}
    </>
  );
};

ItemShare.propTypes = { item: PropTypes.shape({ ref: PropTypes.shape({ type: PropTypes.string }) }).isRequired, find: PropTypes.func.isRequired };

const MicroItem = ({ item, to }) => (
  <div className="flex flex-col gap-2">
    {item.imageUrl && (
      <img src={item.imageUrl} alt="" loading="lazy" className="w-full max-w-xs rounded-lg border border-stone-200 dark:border-stone-800" />
    )}
    {item.text && (
      <p className="font-body text-sm text-stone-700 dark:text-stone-300 whitespace-pre-line line-clamp-5 mb-0">{item.text}</p>
    )}
    {to && (
      <Link to={to} className="font-label text-[10px] uppercase tracking-widest font-bold text-secondary no-underline hover:underline self-start">
        Read the post →
      </Link>
    )}
  </div>
);

MicroItem.propTypes = { item: PropTypes.shape({ imageUrl: PropTypes.string, text: PropTypes.string }).isRequired, to: PropTypes.string };
MicroItem.defaultProps = { to: null };

// A busy month has twenty short posts; the issue shows six and folds the rest.
const COLLAPSED = { micro: 6 };

const IssueItems = ({ sectionKey, items, find }) => {
  const [expanded, setExpanded] = useState(false);
  const limit = COLLAPSED[sectionKey];
  const folded = !!limit && items.length > limit;
  const shown = folded && !expanded ? items.slice(0, limit) : items;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-5 list-none p-0 m-0">
        {shown.map((item, i) => {
          // Website updates and misc are plain strings.
          if (typeof item === "string") {
            return (
          // eslint-disable-next-line react/no-array-index-key -- strings may repeat; order is the identity
          <li key={i} className="font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed pl-4 border-l-2 border-secondary/30">
            {item}
          </li>
            );
          }
          const to = detailPath(item.ref);
          const meta = metaFor(sectionKey, item);
          const blurb = BLURB_KEYS.has(sectionKey) ? item.description : null;
          return (
        // eslint-disable-next-line react/no-array-index-key -- hand-typed rows have no id
        <li key={item.ref ? `${item.ref.type}-${item.ref.id}` : i} className="flex gap-3 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {sectionKey === "micro"
              ? <MicroItem item={item} to={to} />
              : <TitleLink to={to} href={item.url || item.link}>{itemTitle(sectionKey, item)}</TitleLink>}
            {meta && (
              <p className="font-label text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-0">{meta}</p>
            )}
            {blurb && (
              <p className="font-body text-sm text-stone-600 dark:text-stone-400 line-clamp-2 mb-0">{blurb}</p>
            )}
          </div>
          {find && <ItemShare item={item} find={find} />}
        </li>
          );
        })}
      </ul>
      {folded && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="self-start font-label text-[10px] uppercase tracking-widest font-bold text-secondary hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
};

IssueItems.propTypes = {
  sectionKey: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})])).isRequired,
  find: PropTypes.func,
};
IssueItems.defaultProps = { find: null };

export default IssueItems;
