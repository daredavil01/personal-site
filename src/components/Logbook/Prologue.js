import React, { useEffect, useMemo, useRef, useState } from "react";
import ChartBase from "./ChartBase";
import { prologueLayouts, yearOf, yearTicks } from "./model";
import { fmt, langColor, monthYear, useWidth } from "./shared";

// The prologue: one dot per essay and five arrangements of them, told as the
// reader scrolls. The steps are prose in their own column (on a phone they
// slide up over the figure); the figure stays put and the dots glide —
// a ledger in writing order, a timeline, two language lanes, the map of
// meaning, and how loud each essay is. The dots open their essays.

const STEP_IDS = ["ledger", "surge", "tongues", "meaning", "loud"];

function useStepObserver(refs, setStep) {
  useEffect(() => {
    const els = refs.current.filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setStep(Number(e.target.dataset.step));
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [refs, setStep]);
}

const Prologue = ({ data, onSelect, onDone }) => {
  const { posts, totals: t, byYear, clusters } = data;
  const rootRef = useRef(null);
  const figRef = useRef(null);
  const stepRefs = useRef([]);
  const [step, setStep] = useState(0);
  useStepObserver(stepRefs, setStep);

  const rootW = useWidth(rootRef, 900);
  const wide = rootW >= 820;
  const W = useWidth(figRef, 560);
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const H = Math.round(wide ? Math.min(520, W * 0.78) : Math.min(W * 0.82, vh * 0.44));
  const pad = Math.max(20, Math.min(34, W * 0.05));
  const { layouts, x, base, mid } = useMemo(() => prologueLayouts(posts, W, H, { pad }), [posts, W, H, pad]);

  const peak = byYear.reduce((a, y) => (y.posts > a.posts ? y : a), byYear[0]);
  const before = byYear.filter((y) => y.year < peak.year).reduce((s, y) => s + y.posts, 0);
  const offload = posts.filter((p) => yearOf(p) === peak.year && p.tags.some((tag) => /100.?days/i.test(tag))).length;
  const per1000 = t.words ? Math.round((t.exclaims / t.words) * 1000) : null;
  const loudest = byYear.reduce((a, y) => (y.words && y.exclaims / y.words > a.exclaims / a.words ? y : a), byYear[0]);
  const longest = posts.reduce((a, p) => (p.words > a.words ? p : a), posts[0]);
  const shortest = posts.reduce((a, p) => (p.words < a.words ? p : a), posts[0]);

  const steps = [
    {
      kicker: "The ledger",
      text: `${fmt(t.posts)} entries, ${t.firstYear} to ${t.lastYear}. Every mark is one essay, in the order it was written; the bigger the mark, the longer the essay. The longest runs ${fmt(longest.words)} words, the shortest ${fmt(shortest.words)}.`,
    },
    {
      kicker: "The surge",
      text: `For years they came a few at a time: ${before} essays before ${peak.year}. Then ${peak.year} happened — ${peak.posts} in a single year${offload ? `, ${offload} of them for the 100 Days To Offload challenge` : ""}.`,
    },
    {
      kicker: "Two tongues",
      text: `${fmt(t.en)} in English, ${fmt(t.mr)} in Marathi. The English essays argue with screens, attention and AI; the Marathi ones climb forts and walk the forests of the Sahyadri and the Satpuda.`,
    },
    {
      kicker: "Placed by meaning",
      text: `Now forget the dates. Each essay moves beside the ones that say similar things, whatever language they say it in. ${clusters.length} territories emerge on their own: the map of what I keep writing about.`,
    },
    {
      kicker: "The exclamation mark",
      text: per1000
        ? `${fmt(t.exclaims)} exclamation marks — about ${per1000} in every thousand words. The bigger the dot, the louder the essay. The loudest year, word for word, was ${loudest.year}!`
        : "Every dot swells by the exclamation marks its essay holds.",
    },
  ];

  const dots = layouts[step];
  const fill = (p) => {
    if (step === 0) return "var(--lb-ink)";
    if (step === 1) return yearOf(p) === peak.year ? "var(--lb-accent)" : "var(--lb-ink)";
    if (step === 4) return "var(--lb-accent)";
    return langColor(p.lang);
  };
  const jump = (i) => {
    const el = stepRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const peakX = x(Date.parse(`${peak.year}-07-01`));
  const fall = H - pad;

  const figure = (
    <div ref={figRef} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block w-full h-auto"
        role="img"
        aria-label={`Every essay as a dot. ${steps[step].kicker}: ${steps[step].text}`}
      >
        <g className="lb-fade" style={{ opacity: step >= 3 ? 1 : 0 }}>
          <ChartBase
            posts={posts}
            clusters={clusters}
            width={W}
            height={H}
            pad={pad + 10}
            uid="lb-pro"
            graticule={false}
            labels={step === 3}
            labelSize={wide ? 14 : 12}
          />
        </g>

        <g className="lb-fade" style={{ opacity: step === 1 || step === 2 ? 1 : 0 }} aria-hidden="true">
          <line x1={pad} x2={W - pad} y1={step === 1 ? base + 6 : mid} y2={step === 1 ? base + 6 : mid} stroke="var(--lb-faint)" />
          {yearTicks(byYear.map((y) => y.year), (yr) => Math.max(pad + 14, x(Date.parse(`${yr}-01-01`)))).map(({ year: yr, x: yx }) => (
            <text key={yr} x={yx} y={step === 1 ? base + 20 : mid + 4} textAnchor="middle" fontSize="10.5" className="lb-svg-label" fill={step === 1 && yr === peak.year ? "var(--lb-accent)" : "var(--lb-soft)"} stroke="var(--lb-paper)" strokeWidth="3" paintOrder="stroke">
              {yr}
            </text>
          ))}
        </g>
        <g className="lb-fade" style={{ opacity: step === 1 ? 1 : 0 }} aria-hidden="true">
          <text x={Math.min(peakX, W - pad - 60)} y={pad + 4} textAnchor="middle" className="lb-svg-italic" fontSize={wide ? 22 : 17} fill="var(--lb-accent)">
            {`${peak.posts} in ${peak.year}`}
          </text>
        </g>
        <g className="lb-fade" style={{ opacity: step === 2 ? 1 : 0 }} aria-hidden="true">
          <text x={pad} y={pad + 6} className="lb-svg-label" fontSize="10.5" fill="var(--lb-en)">ENGLISH ↑</text>
          <text x={pad} y={H - pad} className="lb-mr-text" fontSize="14" fill="var(--lb-mr)" lang="mr">मराठी ↓</text>
        </g>
        <g className="lb-fade" style={{ opacity: step === 0 ? 1 : 0 }} aria-hidden="true">
          <text x={layouts[0][0].x} y={layouts[0][0].y - layouts[0][0].r - 6} className="lb-svg-label" fontSize="9.5" fill="var(--lb-soft)">
            {monthYear(posts[0].date).toUpperCase()}
          </text>
          <text x={layouts[0][posts.length - 1].x + layouts[0][posts.length - 1].r} y={layouts[0][posts.length - 1].y + layouts[0][posts.length - 1].r + 14} textAnchor="end" className="lb-svg-label" fontSize="9.5" fill="var(--lb-soft)">
            {monthYear(posts[posts.length - 1].date).toUpperCase()}
          </text>
        </g>

        {posts.map((p, i) => (
          <circle
            key={p.id}
            className="lb-dot"
            cx={0}
            cy={0}
            r={dots[i].r}
            opacity={step === 4 ? 0.72 : 0.92}
            style={{ transform: `translate(${dots[i].x}px, ${dots[i].y}px)`, cursor: "pointer" }}
            fill={fill(p)}
            stroke="var(--lb-paper)"
            strokeWidth={step >= 3 ? 1 : 0}
            onClick={() => onSelect(p.id)}
          >
            <title>{`${p.title} (${p.date.slice(0, 4)})`}</title>
          </circle>
        ))}

        {step === 4 && per1000 && Array.from({ length: 16 }, (_, i) => (
          <text
            key={i}
            className="lb-rain lb-svg-display"
            x={pad + ((i * 97) % Math.max(1, W - pad * 2))}
            y={0}
            fontSize="20"
            fill="var(--lb-accent)"
            style={{ animationDelay: `${(i * 0.37) % 2.6}s`, "--lb-fall": `${fall}px` }}
            aria-hidden="true"
          >
            !
          </text>
        ))}
      </svg>
      <div className="lb-pro-dots mt-1" role="group" aria-label="Prologue steps">
        {steps.map((s, i) => (
          <button key={s.kicker} type="button" onClick={() => jump(i)} aria-label={s.kicker} aria-current={i === step ? "step" : undefined}>
            <span />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section ref={rootRef} id="lb-prologue" aria-label="Prologue: the logbook in five pictures" className={`lb-prologue lb-chapter ${wide ? "lb-prologue--wide" : "lb-prologue--narrow"}`}>
      <div className="lb-pro-figure lb-paper" style={wide ? { top: `calc(50vh - ${Math.round((H + 60) / 2)}px)` } : undefined}>
        {figure}
      </div>
      <div className="lb-pro-steps">
        {steps.map((s, i) => (
          <div
            key={s.kicker}
            id={`lb-step-${STEP_IDS[i]}`}
            ref={(el) => { stepRefs.current[i] = el; }}
            data-step={i}
            data-active={i === step}
            className="lb-pro-step"
          >
            <div className="lb-pro-card">
              <p className="lb-kicker lb-accent m-0">{`${i + 1} / ${steps.length} · ${s.kicker}`}</p>
              <p className="lb-display text-[26px] md:text-[30px] leading-[1.15] m-0 mt-3">{s.text}</p>
            </div>
          </div>
        ))}
        <div className="flex justify-center py-10">
          <button type="button" onClick={onDone} className="lb-btn lb-btn--ink">
            Now read it yourself
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Prologue;
