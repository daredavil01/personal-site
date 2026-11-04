import React, {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from "react";
import { createPortal } from "react-dom";

// The one-page resume: what "Print / save PDF" (and Ctrl+P) puts on paper.
// The screen sheet is built for reading and runs to three A4 pages; this is a
// separate, denser layout over the same model (`onePageResume` in
// src/lib/resumeModel.js picks what fits). It is portalled straight under
// <body> so the print stylesheet can `display: none` every other child of
// body — hiding the site with `visibility` would keep its height and print
// blank pages after it. On screen it sits off-canvas, hidden from assistive
// tech, so it can be measured at any time: before every print it is scaled
// down — never up — until it fits one A4 page.

// A4 at 96 px/in, less the 10 mm @page margins on every side.
const PAGE_W_PX = ((210 - 20) / 25.4) * 96;
const PAGE_H_PX = ((297 - 20) / 25.4) * 96;
// Below this the type is too small to read on paper; the content is trimmed
// by onePageResume first, so it is a floor that should never be reached.
const MIN_SCALE = 0.72;

const ResumePrint = ({
  name, headline, location, contact, summary, page, updated, beyond = [], hobbies = [],
}) => {
  const ref = useRef(null);
  const [host, setHost] = useState(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "rp-portal";
    document.body.appendChild(el);
    setHost(el);
    return () => el.remove();
  }, []);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rp-scale", "1");
    const h = el.scrollHeight;
    const scale = h > PAGE_H_PX ? Math.max(MIN_SCALE, PAGE_H_PX / h) : 1;
    el.style.setProperty("--rp-scale", scale.toFixed(4));
  }, []);

  useLayoutEffect(fit, [fit, host, page, summary]);
  useEffect(() => {
    window.addEventListener("beforeprint", fit);
    return () => window.removeEventListener("beforeprint", fit);
  }, [fit]);

  const work = page.roles.filter((r) => r.group === "work");
  const research = page.roles.filter((r) => r.group === "research");

  if (!host) return null;
  return createPortal(
    <div className="rp" ref={ref} aria-hidden="true" style={{ "--rp-width": `${PAGE_W_PX}px` }}>
      <header className="rp-head">
        <div>
          <h1>{name}</h1>
          <p className="rp-title">{`${headline} · ${location}`}</p>
        </div>
        <p className="rp-contact">
          {contact.map((c) => <span key={c}>{c}</span>)}
        </p>
      </header>

      <p className="rp-summary">{summary}</p>

      <div className="rp-cols">
        <div className="rp-main">
          <section>
            <h2>Experience</h2>
            {work.map((r) => (
              <div className="rp-role" key={r.id || r.company}>
                <div className="rp-role-top">
                  <b>{`${r.position}, ${r.company}`}</b>
                  <span>{`${r.daterange}${r.duration ? ` · ${r.duration}` : ""}`}</span>
                </div>
                {r.bullets.length > 0 && <ul>{r.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
              </div>
            ))}
          </section>

          {research.length > 0 && (
            <section>
              <h2>Fellowship &amp; research</h2>
              {research.map((r) => (
                <div className="rp-role" key={r.id || r.company}>
                  <div className="rp-role-top">
                    <b>{`${r.position}, ${r.company}`}</b>
                    <span>{r.daterange}</span>
                  </div>
                  {r.bullets.length > 0 && <ul>{r.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                </div>
              ))}
            </section>
          )}

          {page.projects.length > 0 && (
            <section>
              <h2>Selected projects</h2>
              {page.projects.map((p) => (
                <div className="rp-project" key={p.id}>
                  <div className="rp-role-top">
                    <b>{p.title}</b>
                    <span>{[p.org, p.year].filter(Boolean).join(" · ")}</span>
                  </div>
                  {p.subtitle && <p>{p.subtitle}</p>}
                  {p.lines.length > 0 && (
                    <ul className="rp-did">{p.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                  )}
                  {p.stack.length > 0 && <p className="rp-stack">{p.stack.join(" · ")}</p>}
                </div>
              ))}
            </section>
          )}

          {page.leadership.length > 0 && (
            <section>
              <h2>Leadership &amp; community</h2>
              <p className="rp-line">
                {page.leadership.map((l) => `${l.title}, ${l.org} (${l.years})`).join(" · ")}
              </p>
            </section>
          )}
        </div>

        <aside className="rp-side">
          {page.skills.length > 0 && (
            <section>
              <h2>Skills</h2>
              {page.skills.map((g) => (
                <p className="rp-skill" key={g.category}>
                  <b>{g.category}</b>
                  {g.names.join(", ")}
                </p>
              ))}
              {page.stack.length > 0 && (
                <p className="rp-skill">
                  <b>Shipping with lately</b>
                  {page.stack.join(", ")}
                </p>
              )}
            </section>
          )}

          {page.certifications.length > 0 && (
            <section>
              <h2>Certifications</h2>
              <ul className="rp-list">
                {page.certifications.map((c) => (
                  <li key={c.name}>
                    <b>{c.name}</b>
                    <span>{` ${[c.source, c.year].filter(Boolean).join(" · ")}`}</span>
                  </li>
                ))}
              </ul>
              {page.moreCertifications > 0 && <p className="rp-more">{`+${page.moreCertifications} more on the web version`}</p>}
            </section>
          )}

          {page.degrees.length > 0 && (
            <section>
              <h2>Education</h2>
              <ul className="rp-list rp-edu">
                {page.degrees.map((d) => (
                  <li key={d.degree}>
                    <b>{d.degree}</b>
                    <span>{`${d.school} · ${d.year}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hobbies.length > 0 && (
            <section>
              <h2>Hobbies</h2>
              <ul className="rp-list rp-hobbies">
                {hobbies.map((h) => (
                  <li key={h.name}>
                    <b>{h.name}</b>
                    {h.count ? ` — ${h.count} ${h.unit} ${h.detail}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {beyond.length > 0 && (
            <section>
              <h2>Beyond work</h2>
              <ul className="rp-list rp-beyond">
                {beyond.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <p className="rp-foot">
        {`Full resume, projects and certificates: sankettambare.in/resume${updated ? ` · updated ${updated}` : ""}`}
      </p>
    </div>,
    host,
  );
};

export default ResumePrint;
