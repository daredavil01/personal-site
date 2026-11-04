import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./latest.css";
import {
  Award, Briefcase, Hammer, Mountain, Footprints, PenLine, GraduationCap, Sparkles,
} from "lucide-react";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The dated "Latest" log shared by /about and /resume. Its rows come from
// buildUpdates() (src/lib/aboutModel.js): hand-written lines in about.md plus
// whatever the tables say happened. New rows need no design work — a kind
// without its own icon still renders.

const ICONS = {
  cert: Award, role: Briefcase, career: Sparkles, build: Hammer, trek: Mountain, race: Footprints, study: GraduationCap, life: PenLine,
};

const LABELS = {
  cert: "Certified", role: "New role", career: "Career", build: "Shipped", trek: "Trek", race: "Race", study: "Study", life: "Note",
};

export const formatUpdateDate = (date) => {
  const [y, m, d] = String(date).split("-").map(Number);
  if (!y) return "";
  const mon = m ? MONTH_SHORT[m - 1] : "";
  return [d || null, mon, y].filter(Boolean).join(" ");
};

const Row = ({ u }) => {
  const Icon = ICONS[u.kind] || PenLine;
  const body = (
    <>
      <span className="latest-icon" data-kind={u.kind} aria-hidden="true"><Icon size={14} /></span>
      <span className="latest-text">
        <span className="latest-title">{u.text}</span>
        {u.detail && <span className="latest-detail">{u.detail}</span>}
      </span>
      <span className="latest-meta">
        <span className="latest-kind">{LABELS[u.kind] || "Update"}</span>
        <time dateTime={u.date}>{formatUpdateDate(u.date)}</time>
      </span>
    </>
  );
  if (u.to) return <li><Link to={u.to} className="latest-row no-underline">{body}</Link></li>;
  if (u.url) return <li><a href={u.url} target="_blank" rel="noopener noreferrer" className="latest-row no-underline">{body}</a></li>;
  return <li><div className="latest-row">{body}</div></li>;
};

const LatestLog = ({
  updates, initial = 4, title = "Latest", children,
}) => {
  const [open, setOpen] = useState(false);
  if (!updates || !updates.length) return null;
  const shown = open ? updates : updates.slice(0, initial);
  return (
    <section className="latest" aria-label={title}>
      <div className="latest-head">
        <h2 className="latest-heading"><span className="latest-pulse" aria-hidden="true" />{title}</h2>
        {children}
      </div>
      <ol className="latest-list">
        {shown.map((u) => <Row key={`${u.date}-${u.text}`} u={u} />)}
      </ol>
      {updates.length > initial && (
        <button type="button" className="latest-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Show fewer" : `Show ${updates.length - initial} more`}
        </button>
      )}
    </section>
  );
};

export default LatestLog;
