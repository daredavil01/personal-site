import React, {
  Suspense, lazy, useEffect, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import ChartBase, { chartScales } from "./ChartBase";
import {
  SPIRAL_BOX, perThousand, readingMinutes, rhythmStats, spiralPaths, titleCase,
} from "./model";
import {
  fmt, langName, langProps, shortDate, textLang, useModal, useWidth, yearOf,
} from "./shared";

const AskChat = lazy(() => import("../Ask/AskChat"));

// One essay's page in the logbook, slid in over whatever chapter opened it
// (a sheet from the bottom on a phone). Its photo, duotoned like every card
// on the site; its opening line; its fingerprint and rhythm; where it sits on
// the chart and its three nearest neighbours; and a chat pinned to it — the
// essay's own chunks (and its neighbours') go to /api/ask as `focus`, the
// mechanism a newsletter issue uses to ask about itself.
//
// A dialog: focus moves in and is kept in, Esc closes, ← and → turn the page
// in writing order, and focus returns to whatever opened it.

const MiniChart = ({ post, data, near }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 400);
  const height = Math.round(width * 0.5);
  const pad = 18;
  const { x, y } = chartScales(width, height, pad);
  return (
    <div ref={ref} className="lb-inset overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block w-full h-auto" aria-hidden="true">
        <ChartBase posts={data.posts} clusters={data.clusters} width={width} height={height} pad={pad} uid="lb-sheet" labels={false} graticule={false} landScale={1.3} focusRegion={post.cluster} />
        {data.posts.filter((p) => p.xy).map((p) => (
          <circle key={p.id} cx={x(p.xy[0])} cy={y(p.xy[1])} r="1.8" fill="var(--lb-ink)" opacity="0.25" />
        ))}
        {near.map((n) => (
          <g key={n.id}>
            <line x1={x(post.xy[0])} y1={y(post.xy[1])} x2={x(n.xy[0])} y2={y(n.xy[1])} stroke="var(--lb-accent)" strokeDasharray="3 3" />
            <circle cx={x(n.xy[0])} cy={y(n.xy[1])} r="3.5" fill="var(--lb-paper)" stroke="var(--lb-accent)" strokeWidth="1.5" />
          </g>
        ))}
        <circle cx={x(post.xy[0])} cy={y(post.xy[1])} r="10" fill="none" stroke="var(--lb-accent)" strokeWidth="1.5" className="lb-pulse" />
        <circle cx={x(post.xy[0])} cy={y(post.xy[1])} r="5" fill="var(--lb-accent)" stroke="var(--lb-paper)" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

const Section = ({ title, children }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="lb-kicker lb-soft m-0">{title}</h3>
    {children}
  </section>
);

const EntrySheet = ({
  post, data, byId, index, onSelect, onClose,
}) => {
  const sheetRef = useRef(null);
  const bodyRef = useRef(null);
  const closeRef = useRef(null);
  const [asking, setAsking] = useState(false);
  const [imageOk, setImageOk] = useState(true);
  const { posts } = data;
  const prev = posts[index - 1] || null;
  const next = posts[index + 1] || null;
  const modalKeys = useModal(sheetRef, onClose);

  // A new essay: back to the top of the page, a fresh chat, the photo retried.
  useEffect(() => {
    setAsking(false);
    setImageOk(true);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    // Focus moves in on open, or when the button that had it went away
    // (a neighbour's link); a page turn by ‹ › keeps it where it is.
    const inside = sheetRef.current && sheetRef.current.contains(document.activeElement);
    if (closeRef.current && !inside) closeRef.current.focus({ preventScroll: true });
  }, [post.id]);

  const onKeyDown = (e) => {
    if (modalKeys(e)) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (!typing && e.key === "ArrowLeft" && prev) {
      e.preventDefault();
      onSelect(prev.id);
    } else if (!typing && e.key === "ArrowRight" && next) {
      e.preventDefault();
      onSelect(next.id);
    }
  };

  const near = (post.near || []).map((id) => byId.get(id)).filter(Boolean);
  const platform = post.platform === "Wordpress" ? "WordPress" : post.platform;
  const lp = langProps(post.lang);
  const tp = langProps(textLang(post.title));
  const st = rhythmStats(post.rhythm || []);
  const paths = spiralPaths(post.punct || "");
  const region = data.clusters.find((c) => c.id === post.cluster);
  const rate = perThousand(post.exclaims || 0, post.words);
  const facts = [
    ["Words", fmt(post.words)],
    ["Reading", `${readingMinutes(post.words)} min`],
    ["Avg sentence", st.avg != null ? `${st.avg} w` : null],
    ["! per 1,000", rate != null ? String(rate) : null],
  ].filter(([, v]) => v);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="lb-root lb-sheet-layer" onKeyDown={onKeyDown}>
      <div className="lb-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <aside ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="lb-entry-title" className="lb-sheet">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b" style={{ borderColor: "var(--lb-faint)" }}>
          <p className="lb-kicker m-0 lb-num">
            <span className="lb-accent">{`Entry № ${index + 1}`}</span>
            <span className="lb-soft">{` of ${posts.length}`}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => prev && onSelect(prev.id)} disabled={!prev} aria-label={prev ? `Previous entry: ${prev.title}` : "No earlier entry"}>‹</button>
            <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => next && onSelect(next.id)} disabled={!next} aria-label={next ? `Next entry: ${next.title}` : "No later entry"}>›</button>
            <button ref={closeRef} type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={onClose} aria-label="Close entry">✕</button>
          </div>
        </header>

        <div ref={bodyRef} className="lb-sheet-body">
          {post.image && imageOk && (
            <div className="lb-duotone h-44 sm:h-52">
              <img src={post.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageOk(false)} />
            </div>
          )}
          <div className="px-5 sm:px-7 py-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="lb-meta lb-soft m-0">
                {[shortDate(post.date), langName(post.lang), platform].filter(Boolean).join(" · ")}
              </p>
              <h2 id="lb-entry-title" className={`lb-display text-[34px] sm:text-[40px] leading-[1.04] m-0 ${tp.className || ""}`} lang={tp.lang}>{post.title}</h2>
              {post.opening && (
                <blockquote className={`lb-quote text-[21px] lb-ink-2 m-0 pl-4 border-l-2 ${lp.className || ""}`} style={{ borderColor: "var(--lb-accent)" }} lang={lp.lang}>
                  {post.opening}
                </blockquote>
              )}
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="lb-btn lb-btn--ink self-start mt-1">
                {`Read it on ${platform}`}
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <dl className="grid grid-cols-4 gap-2 m-0 border-y py-3" style={{ borderColor: "var(--lb-faint)" }}>
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="lb-meta lb-soft text-[10.5px]">{k}</dt>
                  <dd className="lb-display text-[22px] leading-none m-0 mt-1 lb-num">{v}</dd>
                </div>
              ))}
            </dl>

            <Section title="Fingerprint">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 items-center">
                <svg viewBox={`0 0 ${SPIRAL_BOX} ${SPIRAL_BOX}`} width="96" height="96" aria-hidden="true">
                  <path d={paths.comma} stroke="var(--lb-soft)" strokeWidth="1.8" strokeLinecap="round" />
                  <path d={paths.stop} stroke="var(--lb-ink)" strokeWidth="2.4" strokeLinecap="round" />
                  <path d={paths.ask} stroke="var(--lb-ask)" strokeWidth="3.2" strokeLinecap="round" />
                  <path d={paths.bang} stroke="var(--lb-accent)" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <svg viewBox={`0 0 ${Math.max(1, (post.rhythm || []).length) * 3} 40`} preserveAspectRatio="none" className="block w-full h-10" aria-hidden="true">
                    {(post.rhythm || []).map((n, i) => {
                      const h = (Math.min(n, 40) / 40) * 19;
                      return <rect key={i} x={i * 3 + 0.4} y={20 - h} width="2.2" height={h * 2} fill={post.lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)"} opacity="0.8" />;
                    })}
                  </svg>
                  <p className="font-body text-[12.5px] lb-soft m-0">
                    {st.longest != null ? `Sentence by sentence; the longest runs ${st.longest} words.` : "Its punctuation, in reading order, from the centre out."}
                  </p>
                </div>
              </div>
            </Section>

            {post.xy && (
              <Section title={region ? `On the chart · ${titleCase(region.label)}` : "On the chart"}>
                <MiniChart post={post} data={data} near={near.filter((n) => n.xy)} />
              </Section>
            )}

            {near.length > 0 && (
              <Section title="Nearest in meaning">
                <ol className="list-none p-0 m-0 flex flex-col">
                  {near.map((n) => {
                    const ntp = langProps(textLang(n.title));
                    return (
                      <li key={n.id}>
                        <button type="button" onClick={() => onSelect(n.id)} className="lb-index-row" style={{ gridTemplateColumns: "3rem minmax(0, 1fr) auto" }}>
                          <span className="lb-italic text-[18px] lb-accent lb-num">{yearOf(n)}</span>
                          <span className={`lb-display text-[19px] leading-snug lb-index-title ${ntp.className || ""}`} lang={ntp.lang}>{n.title}</span>
                          <span aria-hidden="true" className="lb-soft">→</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Section>
            )}

            <Section title="Ask the archive">
              {!asking ? (
                <button type="button" onClick={() => setAsking(true)} className="lb-btn self-start">
                  Ask about this essay
                </button>
              ) : (
                <div className="lb-card p-3 max-h-[28rem] flex flex-col">
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
            </Section>

            {post.tags.length > 0 && (
              <p className="lb-meta lb-soft m-0 flex flex-wrap gap-x-3 gap-y-1">
                {post.tags.map((t) => <span key={t} {...langProps(textLang(t))}>{`#${t}`}</span>)}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default EntrySheet;
