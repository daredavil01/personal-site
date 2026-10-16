import React, { Suspense, lazy, useState } from "react";
import PropTypes from "prop-types";
import { fmt, langProps, shortDate, textLang } from "./shared";

const AskChat = lazy(() => import("../Ask/AskChat"));

// The selected essay: what it is, its opening line, its three nearest
// neighbours by meaning, and a chat pinned to it. The chat sends the essay's
// own chunks (and its neighbours') as `focus`, the mechanism a newsletter
// issue uses to ask about itself — no worker change was needed.

const PostDrawer = ({ post, byId, onSelect, onClose }) => {
  const [asking, setAsking] = useState(false);

  if (!post) {
    return (
      <aside className="lb-panel p-5 xl:sticky xl:top-20 flex flex-col gap-2">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">The logbook entry</p>
        <p className="font-body text-sm lb-soft m-0">Pick any essay on any lens to open it here, see its nearest neighbours and ask the archive about it.</p>
      </aside>
    );
  }

  const near = (post.near || []).map((id) => byId.get(id)).filter(Boolean);
  const platform = post.platform === "Wordpress" ? "WordPress" : post.platform;
  const lang = langProps(post.lang);
  const titleLang = langProps(textLang(post.title));

  return (
    <aside aria-label="Selected essay" className="lb-panel p-5 xl:sticky xl:top-20 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">
          {[shortDate(post.date), post.lang === "mr" ? "Marathi" : "English", fmt(post.words) && `${fmt(post.words)} words`].filter(Boolean).join(" · ")}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="lb-chip text-xs leading-none px-2 py-1">✕</button>
      </div>
      <p className={`font-headline text-xl font-bold lb-ink m-0 leading-snug ${titleLang.className || ""}`} lang={titleLang.lang}>{post.title}</p>
      {post.opening && (
        <blockquote className={`m-0 pl-3 border-l-2 font-body text-sm lb-soft italic ${lang.className || ""}`} style={{ borderColor: "var(--lb-accent)" }} lang={lang.lang}>
          {post.opening}
        </blockquote>
      )}
      {post.tags.length > 0 && (
        <p className="font-body text-xs lb-soft m-0">{post.tags.map((t) => `#${t}`).join("  ")}</p>
      )}
      <a href={post.url} target="_blank" rel="noopener noreferrer" className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5 self-start no-underline">
        {`Read on ${platform} ↗`}
      </a>

      {near.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] lb-soft m-0">Nearest in meaning</p>
          {near.map((n) => (
            <button key={n.id} type="button" onClick={() => onSelect(n.id)} className="text-left font-body text-sm lb-ink hover:underline bg-transparent border-0 p-0 cursor-pointer">
              <span {...langProps(textLang(n.title))}>{n.title}</span>
              <span className="lb-soft text-xs">{` · ${n.date.slice(0, 4)}`}</span>
            </button>
          ))}
        </div>
      )}

      {!asking ? (
        <button type="button" onClick={() => setAsking(true)} className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5 self-start">
          Ask about this essay
        </button>
      ) : (
        <div className="rounded-xl border p-3 max-h-[28rem] flex flex-col" style={{ borderColor: "var(--lb-faint)" }}>
          <Suspense fallback={<p className="font-body text-sm lb-soft m-0">Waking up…</p>}>
            <AskChat
              compact
              focus={{ type: post.ref.type, id: post.ref.id, refs: near.map((n) => n.ref) }}
              starters={[
                `What is "${post.title}" about?`,
                "What else have I written on this?",
                "How has my view on this changed over the years?",
              ]}
            />
          </Suspense>
        </div>
      )}
    </aside>
  );
};

PostDrawer.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string,
    ref: PropTypes.shape({ type: PropTypes.string, id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) }),
    title: PropTypes.string,
    date: PropTypes.string,
    url: PropTypes.string,
    platform: PropTypes.string,
    lang: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    words: PropTypes.number,
    opening: PropTypes.string,
    near: PropTypes.arrayOf(PropTypes.string),
  }),
  byId: PropTypes.instanceOf(Map).isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

PostDrawer.defaultProps = { post: null };

export default PostDrawer;
