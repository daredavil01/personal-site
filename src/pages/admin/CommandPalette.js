import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./ui/Modal";
import { Input } from "./ui/Input";
import { NAV_GROUPS, RESUME_SECTIONS } from "./navigation";
import { Plus } from "./ui/icons";
import { faintText, mutedText } from "./ui/tokens";

// Everything the palette can do, built once from the nav config. "New …"
// actions route to the resource with ?new=1, which the managers read to open a
// blank form on mount.
const buildActions = () => {
  const jumps = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({
    id: `go:${item.to}`,
    kind: "Go to",
    label: item.label,
    icon: item.icon,
    to: item.to,
  })));

  const resumeJumps = RESUME_SECTIONS.map((section) => ({
    id: `go:resume:${section.slug}`,
    kind: "Go to",
    label: `Résumé · ${section.label}`,
    icon: section.icon,
    to: `/admin/resume/${section.slug}`,
  }));

  const creatable = [
    ...NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.resource || i.to === "/admin/microblog"),
    ...RESUME_SECTIONS.map((s) => ({ to: `/admin/resume/${s.slug}`, label: s.label, icon: s.icon })),
  ];

  const creates = creatable.map((item) => ({
    id: `new:${item.to}`,
    kind: "Create",
    label: `New ${item.label}`,
    icon: Plus,
    to: `${item.to}?new=1`,
  }));

  return [...jumps, ...resumeJumps, ...creates];
};

// Subsequence match, so "brc" finds "Books · Recent" and "nwm" finds "Now
// Months". Returns a score (lower is better) or null.
const fuzzyScore = (haystack, needle) => {
  if (!needle) return 0;
  const text = haystack.toLowerCase();
  const term = needle.toLowerCase();
  const direct = text.indexOf(term);
  if (direct >= 0) return direct;
  let index = 0;
  let score = 100;
  for (let i = 0; i < term.length; i += 1) {
    const found = text.indexOf(term[i], index);
    if (found < 0) return null;
    score += found - index;
    index = found + 1;
  }
  return score;
};

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const actions = useMemo(buildActions, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => actions
    .map((action) => ({ action, score: fuzzyScore(`${action.kind} ${action.label}`, query.trim()) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)
    .map((entry) => entry.action), [actions, query]);

  useEffect(() => { setActive(0); }, [query]);

  const run = (action) => {
    if (!action) return;
    onClose();
    navigate(action.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Command palette" size="md">
      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a table, or create something…"
          aria-label="Command palette search"
          autoComplete="off"
        />
        <ul ref={listRef} className="flex flex-col gap-0.5 list-none pl-0 mb-0 max-h-72 overflow-y-auto">
          {results.length === 0 && (
            <li className={`px-3 py-6 text-sm text-center ${mutedText}`}>No matches</li>
          )}
          {results.map((action, index) => (
            <li key={action.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => run(action)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors ${
                  index === active
                    ? "bg-admin-50 dark:bg-admin-950/60 text-admin-700 dark:text-admin-300"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <action.icon size={15} className="shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0 truncate">{action.label}</span>
                <span className={`text-[11px] ${faintText} shrink-0`}>{action.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default CommandPalette;
