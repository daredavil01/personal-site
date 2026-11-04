import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./latest.css";
import { Pencil, Plus, Terminal, Copy, Check } from "lucide-react";
import useSession from "../../pages/admin/useSession";

// Owner-only editing affordances for public pages. Nothing here is a security
// boundary — Supabase RLS is (`is_owner()` on every write). They only save the
// owner a trip through /admin: a pencil beside a row opens that row's form
// (`?edit=<id>`), a plus opens a blank one (`?new=1`), and content that lives in
// the repo shows the one command that changes it.

/** True once a Supabase session exists. Visitors never have one. */
export function useIsOwner() {
  const session = useSession();
  return !!session;
}

export const OwnerLink = ({
  to, label, kind = "edit", className = "",
}) => {
  const Icon = kind === "add" ? Plus : Pencil;
  return (
    <Link to={to} className={`owner-link no-underline ${className}`} title={label} data-owner-only>
      <Icon size={13} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
};

export const CopyButton = ({ text, label = "Copy", done = "Copied", className = "" }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={copy} className={`owner-copy ${className}`} aria-live="polite">
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span>{copied ? done : label}</span>
    </button>
  );
};

/** A command line the owner can copy: `npm run about -- update "…"`. */
export const CommandHint = ({ command, note }) => (
  <div className="owner-cmd" data-owner-only>
    <Terminal size={14} aria-hidden="true" />
    <code>{command}</code>
    <CopyButton text={command} />
    {note && <span className="owner-cmd-note">{note}</span>}
  </div>
);

// Shell-quote for the copied command: double quotes, with the few characters
// a POSIX shell expands inside them escaped.
export const shellQuote = (s) => `"${String(s).replace(/(["\\$`])/g, "\\$1")}"`;

/**
 * A tiny composer: type the update, get the exact command to run. about.md is
 * a committed file, so a browser cannot save it — this makes the command the
 * one step left.
 */
export const UpdateComposer = ({ career = false }) => {
  const [text, setText] = useState("");
  const [isCareer, setCareer] = useState(career);
  const cmd = `npm run about -- update ${shellQuote(text || "What happened")}${isCareer ? " --career" : ""}`;
  return (
    <div className="owner-composer" data-owner-only>
      <label className="owner-composer-row" htmlFor="owner-update-text">
        <span>New update</span>
        <input
          id="owner-update-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ran the Pune half in 1:55"
          maxLength={160}
        />
      </label>
      <label className="owner-composer-check" htmlFor="owner-update-career">
        <input id="owner-update-career" type="checkbox" checked={isCareer} onChange={(e) => setCareer(e.target.checked)} />
        <span>Also show on /resume</span>
      </label>
      <CommandHint command={cmd} note="Run it, commit src/data/about.md. Certifications, roles, projects, races and forts appear here on their own." />
    </div>
  );
};
