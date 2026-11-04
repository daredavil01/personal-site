import React, { useMemo, useRef } from "react";
import PropTypes from "prop-types";
import {
  Tip, fmt, langColor, platformColor, useTip, useWidth,
} from "./shared";

// The week as a rose: seven petals, each as long as the posts published on
// that weekday. The busiest day is drawn in the redline.
export const WeekRose = ({ weekdays }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 420);
  const { tip, show, hide } = useTip();
  const size = Math.min(width, 360);
  const c = size / 2;
  const rMax = c - 34;
  const rMin = 26;
  const max = Math.max(...weekdays.map((d) => d.posts), 1);
  const top = weekdays.reduce((a, b) => (b.posts > a.posts ? b : a));
  const step = (Math.PI * 2) / 7;
  const arc = (i, r) => {
    const a0 = -Math.PI / 2 + i * step + 0.06;
    const a1 = a0 + step - 0.12;
    const p = (a, rr) => `${(c + Math.cos(a) * rr).toFixed(1)},${(c + Math.sin(a) * rr).toFixed(1)}`;
    return `M${p(a0, rMin)} L${p(a0, r)} A${r},${r} 0 0 1 ${p(a1, r)} L${p(a1, rMin)} A${rMin},${rMin} 0 0 0 ${p(a0, rMin)} Z`;
  };
  return (
    <div className="wl-card">
      <p className="wl-card-title">Which day gets written</p>
      <div ref={ref} className="wl-fig" style={{ display: "flex", justifyContent: "center" }}>
        <svg width={size} height={size} role="img" aria-label={`Posts by weekday; ${top.day} is busiest with ${top.posts}`}>
          {[0.33, 0.66, 1].map((f) => (
            <circle key={f} cx={c} cy={c} r={rMin + (rMax - rMin) * f} fill="none" className="wl-grid" stroke="var(--wl-rule)" strokeDasharray="2 4" />
          ))}
          {weekdays.map((d, i) => {
            const r = rMin + (rMax - rMin) * (d.posts / max);
            const mid = -Math.PI / 2 + i * step + step / 2;
            const lr = rMax + 18;
            return (
              <g key={d.day} className="wl-mark" onMouseMove={(e) => show(e, <><b>{d.day}</b>{d.posts} posts · {fmt(d.words)} words</>)} onMouseLeave={hide}>
                <path d={arc(i, r)} fill={d.day === top.day ? "var(--wl-hi)" : "var(--wl-s1)"} fillOpacity={d.day === top.day ? 1 : 0.55 + 0.45 * (d.posts / max)} />
                <text x={c + Math.cos(mid) * lr} y={c + Math.sin(mid) * lr + 4} textAnchor="middle" className="wl-tick" style={{ fontWeight: d.day === top.day ? 800 : 500 }}>{d.short}</text>
              </g>
            );
          })}
          <text x={c} y={c - 2} textAnchor="middle" className="wl-dlabel" style={{ fontSize: 13 }}>{top.short}</text>
          <text x={c} y={c + 13} textAnchor="middle" className="wl-tick">{top.posts} posts</text>
        </svg>
        <Tip tip={tip} />
      </div>
    </div>
  );
};

WeekRose.propTypes = { weekdays: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

const BUCKETS = [
  { label: "< 250", lo: 0, hi: 250 },
  { label: "250–499", lo: 250, hi: 500 },
  { label: "500–999", lo: 500, hi: 1000 },
  { label: "1,000–1,499", lo: 1000, hi: 1500 },
  { label: "1,500–1,999", lo: 1500, hi: 2000 },
  { label: "2,000+", lo: 2000, hi: Infinity },
];

// How long a post runs, as a ruler: one bar per length band, each post a
// tick inside it, so the bar is literally made of the posts it counts.
export const LengthRuler = ({ posts }) => {
  const rows = useMemo(() => BUCKETS.map((b) => ({
    ...b,
    posts: posts.filter((p) => p.words >= b.lo && p.words < b.hi),
  })), [posts]);
  const max = Math.max(...rows.map((r) => r.posts.length), 1);
  const top = rows.reduce((a, b) => (b.posts.length > a.posts.length ? b : a));
  return (
    <div className="wl-card">
      <p className="wl-card-title">How long a post runs</p>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "88px 1fr 34px", alignItems: "center", gap: 10 }}>
            <span className="wl-num" style={{ fontSize: 12, color: "var(--wl-ink-2)", fontFamily: "var(--wl-mono)" }}>{r.label}</span>
            <span style={{ display: "flex", gap: 1.5, height: 22, width: `${(r.posts.length / max) * 100}%`, minWidth: r.posts.length ? 3 : 0 }}>
              {r.posts.map((p) => (
                <i
                  key={p.url || p.title + p.date}
                  title={`${p.title} · ${fmt(p.words)} words`}
                  style={{ flex: 1, borderRadius: 2, background: r === top ? "var(--wl-hi)" : platformColor(p.platform), opacity: r === top ? 1 : 0.8 }}
                />
              ))}
            </span>
            <b className="wl-num" style={{ fontSize: 13, textAlign: "right" }}>{r.posts.length}</b>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "var(--wl-ink-2)", margin: "14px 0 0" }}>
        Most posts land between <b>{top.label}</b> words — a ten-minute read, not a treatise.
      </p>
    </div>
  );
};

LengthRuler.propTypes = { posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

const PALETTES = {
  platform: (l) => platformColor(l),
  language: (l) => langColor(l),
  format: (l, i) => ["var(--wl-s1)", "var(--wl-s2)", "var(--wl-hi)", "var(--wl-mr)"][i % 4],
};

// The archive's make-up as 100% bars: platform, language, format.
export const Mix = ({ groups }) => (
  <div className="wl-card">
    <p className="wl-card-title">What the ledger is made of</p>
    {groups.map(({ key, title, rows }) => {
      const total = rows.reduce((s, r) => s + r.posts, 0) || 1;
      return (
        <div className="wl-mix" key={key}>
          <div className="k"><b>{title}</b><span>{rows.map((r) => `${r.label} ${r.posts}`).join(" · ")}</span></div>
          <div className="wl-mixbar" role="img" aria-label={`${title}: ${rows.map((r) => `${r.label} ${r.posts}`).join(", ")}`}>
            {rows.map((r, i) => (
              <span key={r.label} style={{ width: `${(r.posts / total) * 100}%`, background: PALETTES[key](r.label, i) }} title={`${r.label}: ${r.posts} posts, ${fmt(r.words)} words`}>
                {(r.posts / total) > 0.14 ? `${r.label} ${Math.round((r.posts / total) * 100)}%` : ""}
              </span>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

Mix.propTypes = { groups: PropTypes.arrayOf(PropTypes.shape({})).isRequired };
