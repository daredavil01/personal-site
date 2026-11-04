import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Printer, FileText, Globe, MapPin, ArrowRight,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import aboutMd from "../../data/aboutContent";
import { useProjects, useResume, useSports, useTreks } from "../../context/ContentContext";
import useSiteStats from "../Stats/useSiteStats";
import {
  groupPositions, professionalMonths, projectEvidence, skillsWithEvidence, groupSkills,
  stackBeyondSkills, sortCertifications, splitSkillLine, skillsInText, resumeText, onePageResume, leadHighlight,
} from "../../lib/resumeModel";
import {
  buildUpdates, parseUpdates, parseAbout, hobbiesWithEvidence,
} from "../../lib/aboutModel";
import { IDENTITY, LOCATION_LABEL } from "../../data/identity";
import contact from "../../data/contact";
import { SITE_URL } from "../../data/pageMeta";
import LatestLog from "../common/LatestLog";
import {
  CopyButton, OwnerLink, CommandHint, useIsOwner,
} from "../common/OwnerTools";
import { ErrorBlock } from "../common/AsyncStates";
import ResumePrint from "./ResumePrint";
import "./resume.css";

// /resume — every row is from the four resume tables plus the projects table;
// the summary numbers, durations, groupings and skill evidence are computed by
// src/lib/resumeModel.js. Edit at /admin/resume or with `npm run resume`.

const NOTES = parseUpdates(aboutMd);
// Hobbies are words in about.md (`npm run about -- set "Hobbies" …`); their
// counts are the live stats.
const { hobbies: HOBBIES, printSkip: PRINT_SKIP } = parseAbout(aboutMd);

const contactOf = (label) => contact.find((c) => c.label === label) || {};
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const Dots = ({ n }) => (
  <span className="rs-dots" role="img" aria-label={`${n} of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} data-on={i <= n} />)}
  </span>
);

const SectionHead = ({
  title, note, children,
}) => (
  <div className="rs-h">
    <h2>{title}</h2>
    <div className="rs-h-r">
      {note && <small>{note}</small>}
      {children}
    </div>
  </div>
);

const ResumeDocument = () => {
  const { data: resume, loading, error } = useResume();
  const { data: projects } = useProjects();
  const { data: sports } = useSports();
  const { data: treks } = useTreks();
  const { data: snapshot } = useSiteStats();
  const isOwner = useIsOwner();
  const [skillFilter, setSkillFilter] = useState("All");
  const [allCerts, setAllCerts] = useState(false);
  const s = snapshot?.stats || {};

  const model = useMemo(() => {
    const positions = resume?.positions || [];
    const skills = resume?.skills || [];
    const groups = groupPositions(positions);
    const months = professionalMonths(positions);
    const evidence = projectEvidence(projects || []);
    const evidenced = skillsWithEvidence(skills, projects || []);
    const skillGroups = groupSkills(evidenced);
    const overview = groupSkills(evidenced, { primaryOnly: true });
    const beyond = stackBeyondSkills(skills, projects || [], { min: 2, limit: 10 });
    const certs = sortCertifications(resume?.certifications || []);
    const updates = buildUpdates({
      notes: NOTES,
      positions,
      certifications: resume?.certifications || [],
      projects: projects || [],
      sports: sports || [],
      treks: treks || [],
    }, { career: true, limit: 6, perKind: { build: 2 } });
    const stamps = ["positions", "degrees", "certifications", "skills"]
      .flatMap((k) => (resume?.[k] || []).map((r) => r.updatedAt))
      .filter(Boolean)
      .sort();
    return {
      groups, months, evidence, evidenced, skillGroups, overview, beyond, certs, updates, updated: stamps[stamps.length - 1] || null, skills,
    };
  }, [resume, projects, sports, treks]);

  const years = model.months ? Math.floor(model.months / 12) : null;
  const work = model.groups.find((g) => g.key === "work");
  const current = work?.items.find((r) => r.current) || work?.items[0];
  const currentSkills = current ? skillsInText(current.points, model.skills).slice(0, 4) : [];
  const { evidence } = model;
  const research = model.groups.find((g) => g.key === "research")?.items[0];

  const headline = `${IDENTITY.jobTitle} · ${IDENTITY.worksFor}`;
  const summary = [
    `${IDENTITY.jobTitle} at ${IDENTITY.worksFor} in ${IDENTITY.homeLocation.locality}${years ? `, with ${years}+ years across full-stack development and data engineering` : ""}.`,
    currentSkills.length ? `Day to day: ${currentSkills.join(", ")}.` : "",
    evidence.total ? `Outside work, ${evidence.total} projects shipped${evidence.live ? ` (${evidence.live} live)` : ""}${evidence.orgs.length ? `, including tools for ${evidence.orgs.length} social organisations` : ""}.` : "",
    research ? `${research.current ? "Currently" : "Formerly"} ${research.position} at ${research.company}.` : "",
  ].filter(Boolean).join(" ");

  // Icons come from src/data/contact.js (Font Awesome brands); the site itself
  // gets lucide's globe.
  const fa = (label) => {
    const c = contactOf(label);
    return c.link ? { label, href: c.link, icon: <FontAwesomeIcon icon={c.icon} /> } : null;
  };
  const contactLine = [
    fa("Email"),
    fa("LinkedIn"),
    fa("Github"),
    { label: SITE_URL.replace(/^https?:\/\//, ""), href: SITE_URL, icon: <Globe size={13} aria-hidden="true" /> },
  ].filter(Boolean);
  const contactText = contactLine.map((c) => (c.href.startsWith("mailto:") ? c.href.slice(7) : c.href));

  const kpis = [
    { value: years ? `${years}+` : null, label: "years professional" },
    { value: evidence.total || null, label: "projects shipped" },
    { value: evidence.live || null, label: "live today" },
    { value: evidence.orgs.length || null, label: "orgs built for" },
    { value: model.certs.length || null, label: "certifications" },
  ].filter((k) => k.value);

  const categories = ["All", ...model.skillGroups.map((g) => g.category)];
  const shownSkillGroups = skillFilter === "All" ? model.overview : model.skillGroups.filter((g) => g.category === skillFilter);
  const certs = allCerts ? model.certs : model.certs.slice(0, 6);
  const newestYear = model.certs[0]?.year;

  const plain = resumeText({
    name: IDENTITY.name,
    headline: `${headline} · ${LOCATION_LABEL}`,
    contact: contactText,
    summary,
    groups: model.groups,
    selected: evidence.selected,
    skillGroups: model.skillGroups,
    certifications: model.certs,
    degrees: resume?.degrees || [],
  });

  // Paper gets its own one-page layout (ResumePrint), not this sheet.
  const onePage = onePageResume({
    groups: model.groups,
    // Featured projects first, then the rest, so a skipped one has a
    // replacement.
    selected: [...evidence.selected, ...evidence.byYear.flatMap((r) => r.items)],
    skip: PRINT_SKIP,
    skillGroups: model.overview,
    certifications: model.certs,
    degrees: resume?.degrees || [],
    stack: model.beyond,
  });
  // Hobbies with their evidence, and beyond work (the outdoors) from the live
  // stats; books and posts are counted under the hobbies, not twice. A number
  // with no value is left out.
  const hobbies = hobbiesWithEvidence(HOBBIES, s);
  const beyondWork = [
    s.totalRaces ? `${s.totalRaces} races, 10K to a 50K ultra` : null,
    s.totalTreks ? `${s.totalTreks} Sahyadri forts` : null,
  ].filter(Boolean);

  if (error) return <div className="rs-root"><ErrorBlock /></div>;

  return (
    <div className="rs-root">
      <div className="rs-toolbar rs-print-hide">
        <span className="rs-toolbar-l">Resume</span>
        <div className="rs-toolbar-r">
          <button type="button" className="rs-tool rs-tool--primary" onClick={() => window.print()}>
            <Printer size={14} aria-hidden="true" />
            Print / save PDF (1 page)
          </button>
          <CopyButton text={plain} label="Copy as plain text" done="Copied — paste into any form" className="rs-tool" />
          <Link to="/about" className="rs-tool">
            <FileText size={14} aria-hidden="true" />
            The person behind it
          </Link>
          {isOwner && <OwnerLink to="/admin/resume/experience" label="Edit resume" />}
        </div>
      </div>

      <article className="rs-sheet" aria-busy={loading}>
        <header className="rs-head">
          <div>
            <h1 className="rs-name">{IDENTITY.name}</h1>
            <p className="rs-headline">
              <b>{IDENTITY.jobTitle}</b>
              {` · ${IDENTITY.worksFor} · `}
              <MapPin size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px" }} />
              {` ${LOCATION_LABEL}`}
            </p>
            <div className="rs-contact">
              {contactLine.map((c) => (
                <a key={c.label} href={c.href} target={c.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">
                  {c.icon}
                  {c.href.startsWith("mailto:") ? c.href.slice(7) : c.label}
                </a>
              ))}
            </div>
          </div>
          {model.updated && (
            <p className="rs-updated">
              <b>Last updated</b>
              {fmtDate(model.updated)}
            </p>
          )}
        </header>

        <section className="rs-summary" aria-label="Summary">
          <p>{summary}</p>
          {kpis.length > 0 && (
            <div className="rs-kpis">
              {kpis.map((k) => (
                <div className="rs-kpi" key={k.label}>
                  <b>{k.value}</b>
                  <span>{k.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {loading ? <p className="rs-loading">Loading the resume…</p> : (
          <div className="rs-body">
            <div className="rs-main">
              <section aria-label="Experience">
                <SectionHead title="Experience" note={years ? `${years}+ yrs` : null}>
                  {isOwner && <OwnerLink to="/admin/resume/experience?new=1" label="Add role" kind="add" />}
                </SectionHead>
                {model.groups.map((g) => (
                  <div className="rs-group" key={g.key}>
                    {model.groups.length > 1 && <p className="rs-group-label">{g.label}</p>}
                    <ol className="rs-roles">
                      {g.items.map((p) => {
                        const { bullets, tags } = splitSkillLine(p.points);
                        const named = skillsInText(bullets, model.skills);
                        const chips = [...new Set([...named, ...tags])].slice(0, 8);
                        return (
                          <li className="rs-role" key={p.id || p.company} data-current={p.current}>
                            <span className="rs-role-dot" aria-hidden="true" />
                            <div>
                              <div className="rs-role-top">
                                <h3>
                                  {p.position}
                                  {isOwner && p.id && <span className="rs-edit"><OwnerLink to={`/admin/resume/experience?edit=${p.id}`} label="Edit" /></span>}
                                </h3>
                                <span className="rs-role-when">
                                  {p.daterange}
                                  {p.duration && <span className="rs-pill">{p.current ? `Now · ${p.duration}` : p.duration}</span>}
                                </span>
                              </div>
                              <div className="rs-role-at">
                                {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer">{p.company}</a> : p.company}
                              </div>
                              {bullets.length > 0 && <ul className="rs-points">{bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                              {chips.length > 0 && <div className="rs-tags">{chips.map((c) => <span key={c}>{c}</span>)}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
                {isOwner && (
                  <div className="rs-owner">
                    <CommandHint command={'npm run resume -- bullet <id> "Did X, measured by Y, by doing Z"'} note="Write bullets as an outcome, its measure and how — the pattern recruiters scan for." />
                  </div>
                )}
              </section>

              {evidence.selected.length > 0 && (
                <section>
                  <SectionHead title="Selected projects" note={`${evidence.selected.length} of ${evidence.total}`}>
                    {isOwner && <OwnerLink to="/admin/projects?new=1" label="Add project" kind="add" />}
                  </SectionHead>
                  <div className="rs-projects">
                    {evidence.selected.map((p) => (
                      <Link key={p.id} to={`/projects/${p.id}`} className="rs-project">
                        <span className="rs-project-k">
                          <span>{[p.category, p.date ? String(p.date).slice(0, 4) : null].filter(Boolean).join(" · ")}</span>
                          {p.status && <em>{p.status}</em>}
                        </span>
                        <h3>{p.title}</h3>
                        {p.subtitle && <p>{p.subtitle}</p>}
                        <div className="rs-project-hl">
                          {p.org && (<><b>For</b><span>{p.org}</span></>)}
                          {(p.highlights || [])[0] && (<><b>Did</b><span>{leadHighlight(p.highlights[0])}</span></>)}
                        </div>
                        {(p.techStack || []).length > 0 && <span className="rs-project-stack">{p.techStack.slice(0, 5).join(" · ")}</span>}
                      </Link>
                    ))}
                  </div>
                  {evidence.byYear.length > 0 && (
                    <div className="rs-also">
                      <p className="rs-group-label" style={{ marginTop: "0.6rem" }}>Also built</p>
                      {evidence.byYear.map((row) => (
                        <div className="rs-also-row" key={row.year}>
                          <b>{row.year}</b>
                          <span>
                            {row.items.map((p, i) => (
                              <React.Fragment key={p.id}>
                                {i > 0 && " · "}
                                <Link to={`/projects/${p.id}`}>{p.title}</Link>
                              </React.Fragment>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="rs-aside">
              <LatestLog updates={model.updates} initial={4} title="Latest">
                {isOwner && <OwnerLink to="/admin/resume/certifications?new=1" label="Add" kind="add" />}
              </LatestLog>

              {model.skillGroups.length > 0 && (
                <section>
                  <SectionHead title="Skills" note="● level · n projects">
                    {isOwner && <OwnerLink to="/admin/resume/skills?new=1" label="Add" kind="add" />}
                  </SectionHead>
                  <div className="rs-filter" role="group" aria-label="Skill category">
                    {categories.map((c) => (
                      <button key={c} type="button" aria-pressed={skillFilter === c} onClick={() => setSkillFilter(c)}>{c}</button>
                    ))}
                  </div>
                  {shownSkillGroups.map((g) => (
                    <div className="rs-skill-group" key={g.category}>
                      <h3>{g.category}</h3>
                      {g.skills.slice(0, skillFilter === "All" ? 5 : 50).map((sk) => (
                        <div className="rs-skill" key={sk.title} title={sk.projects.map((p) => p.title).join(", ") || undefined}>
                          <span>{sk.title}</span>
                          <Dots n={sk.competency} />
                          <span className="rs-skill-n">{sk.projects.length ? `×${sk.projects.length}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {model.beyond.length > 0 && (
                    <>
                      <p className="rs-group-label" style={{ marginTop: "1.1rem" }}>Shipping with lately</p>
                      <div className="rs-stack">
                        {model.beyond.map((b) => <span key={b.name}>{b.name}<b>{`×${b.count}`}</b></span>)}
                      </div>
                      <p className="rs-note">Counted from the projects&apos; own tech stacks, not self-rated.</p>
                    </>
                  )}
                </section>
              )}

              {model.certs.length > 0 && (
                <section>
                  <SectionHead title="Certifications" note={`${model.certs.length}`}>
                    {isOwner && <OwnerLink to="/admin/resume/certifications?new=1" label="Add" kind="add" />}
                  </SectionHead>
                  <ul className="rs-list">
                    {certs.map((c) => (
                      <li className="rs-cert" key={c.id || c.name} data-new={c.year === newestYear}>
                        <span className="rs-cert-y">{c.year || "—"}</span>
                        <span>
                          {c.link ? <a href={c.link} target="_blank" rel="noopener noreferrer">{c.name}</a> : <span>{c.name}</span>}
                          <small>{c.source}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {model.certs.length > 6 && (
                    <button type="button" className="rs-more" onClick={() => setAllCerts((v) => !v)} aria-expanded={allCerts}>
                      {allCerts ? "Show fewer" : `Show all ${model.certs.length}`}
                    </button>
                  )}
                </section>
              )}

              {(resume?.degrees || []).length > 0 && (
                <section>
                  <SectionHead title="Education">
                    {isOwner && <OwnerLink to="/admin/resume/education?new=1" label="Add" kind="add" />}
                  </SectionHead>
                  <ul className="rs-list">
                    {[...resume.degrees].sort((a, b) => b.year - a.year).map((d) => (
                      <li className="rs-edu" key={d.id || d.degree}>
                        <h3>{d.degree}</h3>
                        <p>{`${d.school} · ${d.year}`}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                {hobbies.length > 0 && (
                  <>
                    <SectionHead title="Hobbies" />
                    <ul className="rs-hobbies">
                      {hobbies.map((h) => {
                        const body = (
                          <>
                            <span className="rs-hobby-name">{h.name}</span>
                            {h.count && <span className="rs-hobby-n"><b>{h.count}</b>{` ${h.unit} ${h.detail}`}</span>}
                          </>
                        );
                        return <li key={h.name}>{h.to ? <Link to={h.to}>{body}</Link> : <span>{body}</span>}</li>;
                      })}
                    </ul>
                  </>
                )}
                <SectionHead title="Beyond work" />
                <p className="rs-beyond">
                  {beyondWork.join(" · ")}
                  {" "}
                  <Link to="/about?read=5m" className="rs-print-hide">
                    More about me
                    <ArrowRight size={12} aria-hidden="true" style={{ display: "inline", verticalAlign: "-1px" }} />
                  </Link>
                </p>
              </section>

              {isOwner && (
                <div className="rs-owner">
                  <CommandHint command={'npm run resume -- add certifications --name="…" --source="…" --date="Nov 2026" --link=https://…'} />
                  <CommandHint command="npm run resume -- export" note="Writes knowledge_base/resume.yaml; edit it and `npm run resume -- import knowledge_base/resume.yaml`." />
                </div>
              )}
            </aside>
          </div>
        )}
      </article>

      {!loading && (
        <ResumePrint
          name={IDENTITY.name}
          headline={headline}
          location={LOCATION_LABEL}
          contact={contactText.map((c) => c.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}
          summary={summary}
          page={onePage}
          beyond={beyondWork}
          hobbies={hobbies}
          updated={fmtDate(model.updated)}
        />
      )}
    </div>
  );
};

export default ResumeDocument;
