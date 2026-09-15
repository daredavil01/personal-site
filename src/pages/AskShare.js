import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Main from "../layouts/Main";
import AnswerBody from "../components/Ask/AnswerBody";
import { entityLabel } from "../data/askConfig";
import { bumpShareView, getShare } from "../lib/api/askShares";

// A conversation someone pressed Share on, frozen at the moment they sent it.
//
// The per-answer permalink re-asks its question instead of storing an answer,
// because the archive moves under it. A whole conversation cannot work that way
// — the point is to send the exchange you actually had — so the honesty lives on
// the page: it says when it was asked and offers to ask it again, live.

const fullDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch (_) {
    return "";
  }
};

const SourceCard = ({ source, index }) => {
  const body = (
    <>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-300 dark:bg-stone-700 text-[10px] font-semibold">
        {index}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium truncate group-hover:underline">
          {source.title || "Untitled"}
        </span>
        <span className="block text-[11px] text-stone-500 dark:text-stone-400">
          {entityLabel(source.entity_type)}
          {source.date ? ` · ${source.date}` : ""}
          {source.domain ? ` · ${source.domain} ↗` : ""}
        </span>
      </span>
    </>
  );
  const className = "group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 hover:border-stone-400 dark:hover:border-stone-600 transition-colors";
  return source.external ? (
    <a href={source.url} target="_blank" rel="noreferrer" className={className}>{body}</a>
  ) : (
    <Link to={source.url || "/"} className={className}>{body}</Link>
  );
};

const AskShare = () => {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, share: null });

  useEffect(() => {
    let live = true;
    getShare(token)
      .then((share) => live && setState({ loading: false, share }))
      .catch(() => live && setState({ loading: false, share: null }));
    // Counted from the page only — an unfurl by a chat app is not a reader.
    bumpShareView(token);
    return () => { live = false; };
  }, [token]);

  const { loading, share } = state;
  const turns = share?.thread || [];
  const lastQuestion = [...turns].reverse().find((t) => t.role === "user")?.content || "";

  // A revoked share and a mistyped token read the same on purpose: the page has
  // no business confirming that a given token once existed.
  const body = () => {
    if (loading) {
      return <p className="text-[14px] text-stone-500 dark:text-stone-400">Loading…</p>;
    }
    if (!share) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] mb-0">This conversation is no longer shared.</p>
          <Link
            to="/ask"
            className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-[13px] font-medium"
          >
            Ask the archive yourself
          </Link>
        </div>
      );
    }
    return (
      <>
        <div className="flex flex-col gap-5">
          {turns.map((turn, i) => (
            <div
              // Turns are a frozen, ordered snapshot — index is the identity.
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={`flex flex-col gap-2 ${turn.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  turn.role === "user"
                    ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 whitespace-pre-wrap"
                    : "bg-stone-100 dark:bg-stone-900"
                }`}
              >
                {turn.role === "user" ? turn.content : (
                  <AnswerBody text={turn.content} sources={turn.sources} linkable={share.linkable} />
                )}
              </div>

              {!!turn.sources?.length && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {turn.sources.map((s, j) => (
                    <SourceCard key={`${s.entity_type}-${s.entity_id}-${j}`} source={s} index={j + 1} />
                  ))}
                </div>
              )}

              {turn.role === "assistant" && (turn.feedback?.rating || turn.widened) && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0">
                  {turn.feedback?.rating === 1 && "Marked helpful by the reader. "}
                  {turn.feedback?.rating === -1 && "Marked unhelpful by the reader. "}
                  {turn.widened && `Searched everything — nothing in ${turn.scope} matched.`}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start gap-3 border-t border-stone-200 dark:border-stone-800 pt-5">
          <p className="text-[13px] text-stone-600 dark:text-stone-300 mb-0">
            The archive has changed since this was asked. Ask it again and see.
          </p>
          <Link
            to={lastQuestion ? `/ask?q=${encodeURIComponent(lastQuestion)}` : "/ask"}
            className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-[13px] font-medium"
          >
            Continue this yourself
          </Link>
        </div>
      </>
    );
  };

  return (
    <Main
      title={share?.title ? `${share.title} · Ask the archive` : "A shared conversation"}
      description={share?.summary || "A conversation with Sanket Tambare's archive."}
    >
      <article className="flex flex-col gap-6 max-w-3xl">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold">A conversation with the archive</h1>
          {share && (
            <p className="text-[13px] text-stone-500 dark:text-stone-400 mb-0">
              {`Asked on ${fullDate(share.createdAt)} · ${share.turnCount} turns`}
              {share.types?.length ? ` · scoped to ${share.types.map(entityLabel).join(", ")}` : ""}
            </p>
          )}
        </header>
        {body()}
      </article>
    </Main>
  );
};

export default AskShare;
