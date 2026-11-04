import React, {
  lazy, Suspense, useCallback, useMemo, useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Briefcase, Hammer, Footprints, Code2, Mountain, BookOpen, PenLine, MessageCircle,
} from "lucide-react";
import aboutMd from "../../data/aboutContent";
import {
  parseAbout, principlesWithEvidence, buildTimeline, timelineByYear, buildUpdates, wordCount, readingSeconds, hobbiesWithEvidence,
} from "../../lib/aboutModel";
import { professionalMonths, projectEvidence, parseDaterange } from "../../lib/resumeModel";
import {
  useProjects, useResume, useSports, useTreks,
} from "../../context/ContentContext";
import useSiteStats from "../Stats/useSiteStats";
import OneMinuteIntro from "../common/OneMinuteIntro";
import ContactIcons from "../Contact/ContactIcons";
import LatestLog from "../common/LatestLog";
import {
  CopyButton, OwnerLink, UpdateComposer, CommandHint, useIsOwner,
} from "../common/OwnerTools";
import { IDENTITY } from "../../data/identity";
import "./about.css";

const AskChat = lazy(() => import("../Ask/AskChat"));

// /about, read at the depth the visitor chooses. Four tiers, each a superset
// of the one before: 10 seconds, 1 minute, 5 minutes, 10 minutes. The words
// come from src/data/about.md (edit with `npm run about`), every number from
// /api/stats or the content tables, and anything without a value is left out.

export const DEPTHS = [
  { key: "10s", mark: "00:10", label: "10 sec", long: "10 seconds", name: "The line", angle: 40 },
  { key: "1m", mark: "01:00", label: "1 min", long: "a minute", name: "The gist", angle: 130 },
  { key: "5m", mark: "05:00", label: "5 min", long: "5 minutes", name: "The story", angle: 235 },
  { key: "10m", mark: "10:00", label: "10 min", long: "10 minutes", name: "Everything", angle: 340 },
];

const ABOUT = parseAbout(aboutMd);

const fmt = (n) => (n == null ? null : Number(n).toLocaleString("en-IN"));
const has = (n) => n != null && n !== 0 && n !== "" && n !== "-";
const trimTime = (t) => (t ? String(t).replace(/^0(\d)/, "$1") : null);

// --- the dial ------------------------------------------------------------------

const polar = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};

const Dial = ({ depthIndex }) => {
  const { angle } = DEPTHS[depthIndex];
  // Ring well inside the 100-unit box so the time labels never leave it.
  const R = 36;
  const C = 2 * Math.PI * R;
  return (
    <div className="ab-dial" aria-hidden="true">
      <img src="/images/me.jpg" alt="" width="180" height="180" loading="eager" />
      <svg viewBox="0 0 100 100">
        <circle className="ab-dial-track" cx="50" cy="50" r={R} />
        <circle
          className="ab-dial-arc"
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - angle / 360)}
          transform="rotate(-90 50 50)"
        />
        {DEPTHS.map((d, i) => {
          const [x1, y1] = polar(d.angle, R - 3);
          const [x2, y2] = polar(d.angle, R + 3);
          const [lx, ly] = polar(d.angle, R + 9.5);
          return (
            <g key={d.key}>
              <line className="ab-dial-tick" x1={x1} y1={y1} x2={x2} y2={y2} />
              <text className="ab-dial-label" x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" data-on={i <= depthIndex}>{d.mark}</text>
            </g>
          );
        })}
        <line className="ab-dial-hand" x1="50" y1="50" x2="50" y2={50 - R + 4} style={{ transform: `rotate(${angle}deg)` }} />
      </svg>
    </div>
  );
};

// --- small pieces ----------------------------------------------------------------

const TierMark = ({ depth }) => (
  <div className="ab-mark" aria-hidden="true">
    <span className="ab-mark-time">{depth.mark}</span>
    <span className="ab-mark-label">{depth.name}</span>
  </div>
);

const Tier = ({
  depth, title, note, children,
}) => (
  <section className="ab-tier" id={`read-${depth.key}`} aria-labelledby={`read-${depth.key}-h`}>
    <TierMark depth={depth} />
    <div className="ab-tier-body">
      <header className="ab-tier-head">
        <p className="ab-kicker">{`If you have ${depth.long}`}</p>
        <h2 id={`read-${depth.key}-h`}>{title}</h2>
        {note && <p>{note}</p>}
      </header>
      {children}
    </div>
  </section>
);

const KeepReading = ({ next, words, onMore }) => (
  <button type="button" className="ab-more" onClick={onMore}>
    <span className="ab-more-time">{next.mark}</span>
    <span className="ab-more-text">
      {`Have ${next.long}? Keep reading`}
      <small>{`${next.name}${words ? ` · about ${words.toLocaleString("en-IN")} more words` : ""}`}</small>
    </span>
    <ArrowRight size={18} aria-hidden="true" />
  </button>
);

const Numbers = ({ items }) => {
  const shown = items.filter((i) => has(i.value));
  if (!shown.length) return null;
  return (
    <div className="ab-numbers">
      {shown.map((i) => (i.to ? (
        <Link key={i.label} to={i.to} className="ab-number">
          <b>{i.value}</b>
          <span>{i.label}</span>
        </Link>
      ) : (
        <div key={i.label} className="ab-number">
          <b>{i.value}</b>
          <span>{i.label}</span>
        </div>
      )))}
    </div>
  );
};

// --- tiers ------------------------------------------------------------------------

const ChapterIcons = {
  "the-engineer": Code2, "the-runner": Footprints, "the-trekker": Mountain, "the-reader-and-writer": BookOpen, "the-citizen": MessageCircle,
};

function chapterExtras(key, { s, micro, years, orgs }) {
  switch (key) {
    case "the-engineer":
      return {
        to: "/projects",
        link: "See the projects",
        stats: [
          { value: years ? `${years}+` : null, label: "years at work" },
          { value: fmt(s.projectCount), label: "projects" },
          { value: fmt(s.certCount), label: "certifications" },
        ],
      };
    case "the-runner":
      return {
        to: "/sports",
        link: "Every race",
        stats: [
          { value: fmt(s.totalRaces), label: "races" },
          { value: fmt(s.totalKmRun), label: "km raced" },
          { value: trimTime(s.bestHmTime), label: "half PB" },
        ],
      };
    case "the-trekker":
      return {
        to: "/treks",
        link: "Every fort",
        stats: [
          { value: fmt(s.totalTreks), label: "forts" },
          { value: fmt(s.hardTreks), label: "rated hard" },
          { value: fmt(s.trekYearsActive), label: "years on trails" },
        ],
      };
    case "the-reader-and-writer":
      return {
        to: "/writing-ledger",
        link: "The writing ledger",
        stats: [
          { value: fmt(s.booksCount), label: "books" },
          { value: fmt(s.offloadCount), label: "100-days posts" },
          { value: fmt(micro?.total), label: "short posts" },
        ],
      };
    case "the-citizen":
      return {
        to: "/presentations",
        link: "Talks and decks",
        stats: [
          { value: orgs ? fmt(orgs) : null, label: "organisations built for" },
          { value: fmt(s.presentationCount), label: "decks" },
        ],
      };
    default:
      return { stats: [] };
  }
}

const KIND_LABELS = {
  study: "Study", work: "Work", research: "Research", campus: "Campus", race: "Race", trek: "Trek", build: "Built",
};

const Timeline = ({ years }) => {
  if (!years.length) return null;
  const kinds = [...new Set(years.flatMap((y) => y.events.map((e) => e.kind)))];
  return (
    <div className="ab-timeline">
      <div className="ab-legend">
        {kinds.map((k) => (
          <span key={k} style={{ "--k": `var(--ab-k-${k})` }}>
            <i />
            {KIND_LABELS[k] || k}
          </span>
        ))}
      </div>
      {years.map((y) => (
        <div className="ab-year" key={y.year}>
          <b>{y.year}</b>
          <ul>
            {y.events.map((e) => {
              const inner = (
                <>
                  {e.title}
                  {e.detail && <small>{` · ${e.detail}`}</small>}
                </>
              );
              let body = <span>{inner}</span>;
              if (e.to) body = <Link to={e.to}>{inner}</Link>;
              else if (e.href) body = <a href={e.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
              return (
                <li key={`${e.kind}-${e.title}`} className="ab-event" style={{ "--k": `var(--ab-k-${e.kind})` }}>
                  <i aria-hidden="true" />
                  {body}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

// --- the page ---------------------------------------------------------------------

const AboutPage = () => {
  const [params, setParams] = useSearchParams();
  const isOwner = useIsOwner();
  // ?read= holds the depth so a link can land on it; a visitor with no
  // choice yet gets the one-minute read.
  const asked = DEPTHS.findIndex((d) => d.key === params.get("read"));
  const depth = asked >= 0 ? asked : 1;
  const [asking, setAsking] = useState(false);

  const { data: resume } = useResume();
  const { data: projects } = useProjects();
  const { data: sports } = useSports();
  const { data: treks } = useTreks();
  const { data: snapshot } = useSiteStats();
  const s = snapshot?.stats || {};
  const micro = snapshot?.micro || null;

  const positions = resume?.positions || [];
  const months = professionalMonths(positions);
  const years = months ? Math.floor(months / 12) : null;
  const evidence = useMemo(() => projectEvidence(projects || []), [projects]);
  const principles = useMemo(() => principlesWithEvidence(ABOUT.principles, projects || []), [projects]);
  const timeline = useMemo(() => timelineByYear(buildTimeline({
    positions, degrees: resume?.degrees || [], sports: sports || [], treks: treks || [], projects: projects || [],
  })), [positions, resume, sports, treks, projects]);
  const updates = useMemo(() => buildUpdates({
    notes: ABOUT.updates,
    positions,
    certifications: resume?.certifications || [],
    projects: projects || [],
    sports: sports || [],
    treks: treks || [],
  }, { limit: 10, perKind: { build: 3, race: 2, trek: 2 } }), [positions, resume, projects, sports, treks]);

  const setDepth = useCallback((i, { scroll = true } = {}) => {
    const next = new URLSearchParams(params);
    next.set("read", DEPTHS[i].key);
    setParams(next, { replace: true });
    if (scroll) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`read-${DEPTHS[i].key}`);
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    }
  }, [params, setParams]);

  // Words per tier, so the "keep reading" button can say what it costs.
  const words = {
    "1m": 150,
    "5m": wordCount(ABOUT.chapters.map((c) => c.body).join(" ")),
    "10m": wordCount(ABOUT.long.join(" ")) + wordCount(principles.map((p) => p.body).join(" ")) + wordCount(ABOUT.facts.join(" ")),
  };
  const totalSeconds = readingSeconds(ABOUT.tenSeconds) + (depth >= 1 ? 60 : 0)
    + (depth >= 2 ? readingSeconds(ABOUT.chapters.map((c) => c.body).join(" ")) + 90 : 0)
    + (depth >= 3 ? readingSeconds(ABOUT.long.join(" ")) + 120 : 0);
  const approx = totalSeconds < 60 ? `${totalSeconds} seconds` : `${Math.max(1, Math.round(totalSeconds / 60))} minute${Math.round(totalSeconds / 60) > 1 ? "s" : ""}`;

  const current = positions.find((p) => parseDaterange(p.daterange).current && !/fellow/i.test(p.position || ""));
  const latestBuild = evidence.selected[0] || null;
  const latestRace = [...(sports || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

  return (
    <article className="ab-root">
      {/* ---------------- hero ---------------- */}
      <header className="ab-hero">
        <Dial depthIndex={depth} />
        <div>
          <p className="ab-kicker">{`About ${IDENTITY.name}`}</p>
          <h1 className="ab-title">
            How long have
            {" "}
            <em>you</em>
            {" "}
            got?
          </h1>
          <div className="ab-depth" role="group" aria-label="How much to read">
            {DEPTHS.map((d, i) => (
              <button key={d.key} type="button" aria-pressed={i === depth} onClick={() => setDepth(i)}>
                <b>{d.label}</b>
                <small>{d.name}</small>
              </button>
            ))}
          </div>
          <p className="ab-depth-note">{`Showing about ${approx} of reading. Pick more any time; the page grows, nothing reloads.`}</p>
        </div>
      </header>

      {/* ---------------- 10 seconds ---------------- */}
      <Tier depth={DEPTHS[0]} title="The line">
        <p className="ab-line">{ABOUT.tenSeconds}</p>
        <div className="ab-roles">
          <span className="ab-role"><Briefcase size={13} />{`${IDENTITY.jobTitle}, ${IDENTITY.worksFor}`}</span>
          <span className="ab-role"><Footprints size={13} />Ultra runner</span>
          <span className="ab-role"><Mountain size={13} />Fort trekker</span>
          <span className="ab-role"><PenLine size={13} />Writes in English &amp; मराठी</span>
        </div>
        <LatestLog updates={updates} initial={3}>
          {isOwner && <OwnerLink to="/admin/resume/certifications?new=1" label="Add certification" kind="add" />}
        </LatestLog>
        {isOwner && <UpdateComposer />}
        {depth === 0 && <KeepReading next={DEPTHS[1]} words={words["1m"]} onMore={() => setDepth(1)} />}
      </Tier>

      {/* ---------------- 1 minute ---------------- */}
      {depth >= 1 && (
        <Tier depth={DEPTHS[1]} title="The gist" note="The same minute the home page gives you, plus the live numbers.">
          <OneMinuteIntro className="ab-prose" />
          <Numbers
            items={[
              { value: years ? `${years}+` : null, label: "years in software", to: "/resume" },
              { value: fmt(s.projectCount), label: "projects built", to: "/projects" },
              { value: fmt(s.totalRaces), label: "races run", to: "/sports" },
              { value: fmt(s.totalTreks), label: "forts climbed", to: "/treks" },
              { value: fmt(s.booksCount), label: "books read", to: "/books" },
              { value: fmt(s.offloadCount), label: "posts written", to: "/100-days-to-offload" },
            ]}
          />
          <div className="ab-now">
            {current && (
              <Link to="/resume" className="ab-now-card no-underline">
                <span className="ab-now-k"><Briefcase size={12} />Work</span>
                <strong>{`${current.position} at ${current.company}`}</strong>
                <small>{`Since ${current.daterange.split(/\s+[-–]\s+/)[0]}`}</small>
              </Link>
            )}
            {latestBuild && (
              <Link to={`/projects/${latestBuild.id}`} className="ab-now-card no-underline">
                <span className="ab-now-k"><Hammer size={12} />Latest build</span>
                <strong>{latestBuild.title}</strong>
                {latestBuild.subtitle && <small>{latestBuild.subtitle}</small>}
              </Link>
            )}
            {latestRace && (
              <Link to={`/sports/${latestRace.id}`} className="ab-now-card no-underline">
                <span className="ab-now-k"><Footprints size={12} />Latest race</span>
                <strong>{latestRace.title}</strong>
                <small>{[latestRace.distance, latestRace.time].filter(Boolean).join(" · ")}</small>
              </Link>
            )}
          </div>
          {depth === 1 && <KeepReading next={DEPTHS[2]} words={words["5m"]} onMore={() => setDepth(2)} />}
        </Tier>
      )}

      {/* ---------------- 5 minutes ---------------- */}
      {depth >= 2 && (
        <Tier depth={DEPTHS[2]} title="The story so far" note="Five sides of one person, then the years that made them.">
          <div className="ab-chapters">
            {ABOUT.chapters.map((c, i) => {
              const extra = chapterExtras(c.key, {
                s, micro, years, orgs: evidence.orgs.length,
              });
              const Icon = ChapterIcons[c.key] || PenLine;
              const stats = extra.stats.filter((x) => has(x.value)).slice(0, 3);
              return (
                <div className="ab-chapter" key={c.key}>
                  <div>
                    <span className="ab-chapter-n">{`${String(i + 1).padStart(2, "0")} / ${String(ABOUT.chapters.length).padStart(2, "0")}`}</span>
                    <h3>
                      <Icon size={18} aria-hidden="true" style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "-2px", color: "var(--ab-hi)" }} />
                      {c.title}
                    </h3>
                    <p>{c.body}</p>
                  </div>
                  <div className="ab-chapter-side">
                    {stats.length > 0 && (
                      <div className="ab-chapter-stats">
                        {stats.map((x) => (
                          <div className="ab-chapter-stat" key={x.label}>
                            <b>{x.value}</b>
                            <span>{x.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {extra.to && (
                      <Link to={extra.to} className="ab-chapter-link">
                        {extra.link}
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {timeline.length > 0 && (
            <div className="ab-panel">
              <h3>Year by year</h3>
              <Timeline years={timeline} />
            </div>
          )}
          {isOwner && <CommandHint command={'npm run about -- set "5 minutes" --file=chapters.md'} note="Chapters are ## headings under # 5 minutes in src/data/about.md. The timeline builds itself from the resume, races, treks and featured projects." />}
          {depth === 2 && <KeepReading next={DEPTHS[3]} words={words["10m"]} onMore={() => setDepth(3)} />}
        </Tier>
      )}

      {/* ---------------- 10 minutes ---------------- */}
      {depth >= 3 && (
        <Tier depth={DEPTHS[3]} title="The long version" note="How I got here, how I work, and everything else.">
          <div className="ab-prose ab-prose--drop">
            {ABOUT.long.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
          </div>

          {principles.length > 0 && (
            <div>
              <p className="ab-sub">How I work — and where you can see it</p>
              <div className="ab-principles">
                {principles.map((p) => (
                  <div className="ab-principle" key={p.title}>
                    <h3>{p.title}</h3>
                    {p.body && <p>{p.body}</p>}
                    {p.projects.length > 0 && (
                      <div className="ab-evidence">
                        <span>{`Seen in ${p.count}`}</span>
                        {p.projects.map((x) => <Link key={x.id} to={`/projects/${x.id}`}>{x.title}</Link>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ab-split">
            {ABOUT.facts.length > 0 && (
              <div className="ab-panel">
                <h3>Facts, at random</h3>
                <ol className="ab-facts">{ABOUT.facts.map((f) => <li key={f}>{f}</li>)}</ol>
              </div>
            )}
            <div className="ab-panel">
              {ABOUT.hobbies.length > 0 && (
                <>
                  <h3>Hobbies</h3>
                  <div className="ab-chips" style={{ marginBottom: "1.1rem" }}>
                    {hobbiesWithEvidence(ABOUT.hobbies, s).map((h) => (h.to ? (
                      <Link key={h.name} to={h.to}>{h.count ? `${h.name} · ${h.count} ${h.unit}` : h.name}</Link>
                    ) : <span key={h.name}>{h.name}</span>))}
                  </div>
                </>
              )}
              <h3>What I like</h3>
              <div className="ab-chips">{ABOUT.likes.map((l) => <span key={l}>{l}</span>)}</div>
              {ABOUT.podcasts.length > 0 && (
                <>
                  <p className="ab-sub">On my podcast feed</p>
                  <div className="ab-chips">
                    {ABOUT.podcasts.map((p) => (p.url
                      ? <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer">{p.label}</a>
                      : <span key={p.label}>{p.label}</span>))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="ab-sub">Press kit — a bio for every length</p>
            <div className="ab-bios">
              {[
                { name: "One line", text: ABOUT.tenSeconds },
                { name: "Short", text: ABOUT.shortBio },
                { name: "Long", text: IDENTITY.bio },
              ].filter((b) => b.text).map((b) => (
                <div className="ab-bio" key={b.name}>
                  <div className="ab-bio-head">
                    <b>
                      {b.name}
                      <small>{`${wordCount(b.text)} words`}</small>
                    </b>
                    <CopyButton text={b.text} label="Copy" />
                  </div>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ab-ask">
            <p className="ab-sub" style={{ marginTop: 0 }}>Still curious?</p>
            {!asking ? (
              <div className="ab-ask-cta">
                <button type="button" className="ab-btn" onClick={() => setAsking(true)}>
                  <MessageCircle size={15} aria-hidden="true" />
                  Ask the archive about me
                </button>
                <Link to="/resume" className="ab-btn ab-btn--ghost">The resume</Link>
                <Link to="/now" className="ab-btn ab-btn--ghost">What I&apos;m doing now</Link>
              </div>
            ) : (
              <Suspense fallback={<p className="ab-depth-note">Waking up…</p>}>
                <AskChat compact starters={ABOUT.questions} />
              </Suspense>
            )}
          </div>

          {isOwner && <CommandHint command="npm run about -- check" note="Checks every section, the reading-time budgets and that each principle still has projects behind it." />}
        </Tier>
      )}

      <footer className="ab-end">
        <b>Say hello</b>
        <p style={{ marginBottom: "1rem" }}>If any of this overlaps with what you care about, we will probably get along.</p>
        <div style={{ display: "flex", justifyContent: "center" }}><ContactIcons /></div>
      </footer>
    </article>
  );
};

export default AboutPage;
