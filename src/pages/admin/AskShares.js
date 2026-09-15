import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button, { IconButton } from "./ui/Button";
import Badge from "./ui/Badge";
import DataTable from "./ui/DataTable";
import Modal from "./ui/Modal";
import ConfirmDialog from "./ui/ConfirmDialog";
import { Select } from "./ui/Input";
import { ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { ExternalLink, Trash2 } from "./ui/icons";
import { faintText, hairline, mutedText } from "./ui/tokens";
import { entityLabel } from "../../data/askConfig";
import {
  deleteShare, listShares, setShareRevoked,
} from "../../lib/api/askShares";

// Every conversation a visitor has shared.
//
// Sharing is the one place where a visitor's action puts a page under this
// domain, so this view exists to see what is out there and pull it back. Revoke
// is reversible and keeps the record; delete is neither, which is why they are
// separate actions and only one of them asks first.

const labelClass = `text-[11px] uppercase tracking-wide ${mutedText}`;

const Filter = ({ label, children }) => {
  const id = `share-filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {React.cloneElement(children, { id })}
    </div>
  );
};

const Choice = ({ value, onChange, options, any = "Any" }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{any}</option>
    {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
  </Select>
);

const Stat = ({ label, value }) => (
  <div className={`border ${hairline} rounded-xl px-3 py-2`}>
    <p className={`text-[11px] ${mutedText} mb-0`}>{label}</p>
    <p className="text-[18px] font-semibold mb-0 tabular-nums">{value}</p>
  </div>
);

const YES_NO = [["yes", "Yes"], ["no", "No"]];
const STATUS = [["active", "Active"], ["revoked", "Revoked"]];
const OPENED = [["yes", "Opened"], ["no", "Never opened"]];
const SORTS = [["created", "Newest"], ["views", "Most viewed"], ["opened", "Recently opened"]];
const WITHIN = [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]];
const TURNS = [["2", "2+ turns"], ["4", "4+ turns"], ["6", "6+ turns"]];

const BLANK = {
  status: "",
  within: "",
  turns: "",
  opened: "",
  downvoted: "",
  scoped: "",
  refused: "",
  noSources: "",
  sort: "created",
};

const dt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const yesNo = (want, actual) => !want || (want === "yes") === !!actual;

const AskShares = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [filters, setFilters] = useState(BLANK);
  const [open, setOpen] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const toast = useToast();

  const load = (q) => {
    setRows(null);
    setError(null);
    listShares({ search: q }).then(setRows).catch(setError);
  };

  // The search box hits the tsvector, so it runs on submit rather than on every
  // keystroke; the rest of the filters are client-side over what came back.
  useEffect(() => { load(term); }, [term]);

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  const visible = useMemo(() => {
    if (!rows) return null;
    const since = filters.within
      ? Date.now() - Number(filters.within) * 86400000
      : null;
    const out = rows.filter((r) => {
      if (filters.status === "active" && r.revoked) return false;
      if (filters.status === "revoked" && !r.revoked) return false;
      if (since && new Date(r.createdAt).getTime() < since) return false;
      if (filters.turns && r.turnCount < Number(filters.turns)) return false;
      if (!yesNo(filters.opened, r.viewCount > 0)) return false;
      if (!yesNo(filters.downvoted, r.hasDownvote)) return false;
      if (!yesNo(filters.scoped, r.types.length)) return false;
      if (!yesNo(filters.refused, r.hasRefusal)) return false;
      if (!yesNo(filters.noSources, r.noSources)) return false;
      return true;
    });
    const by = {
      created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      views: (a, b) => b.viewCount - a.viewCount,
      opened: (a, b) => new Date(b.lastViewedAt || 0) - new Date(a.lastViewedAt || 0),
    };
    return [...out].sort(by[filters.sort] || by.created);
  }, [rows, filters]);

  const summary = useMemo(() => {
    if (!visible) return null;
    return {
      total: visible.length,
      views: visible.reduce((n, r) => n + r.viewCount, 0),
      revoked: visible.filter((r) => r.revoked).length,
      neverOpened: visible.filter((r) => !r.viewCount).length,
    };
  }, [visible]);

  const patch = (id, next) => setRows((prev) => prev.map(
    (r) => (r.id === id ? { ...r, ...next } : r),
  ));

  const toggleRevoked = async (row) => {
    try {
      await setShareRevoked(row.id, !row.revoked);
      patch(row.id, { revoked: !row.revoked });
      toast.success(row.revoked ? "Share is live again." : "Share revoked — the link now says so.");
    } catch (err) {
      toast.error(err.message || "Could not update that share.");
    }
  };

  const remove = async (row) => {
    try {
      await deleteShare(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setConfirming(null);
      setOpen(null);
      toast.success("Share deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete that share.");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Conversation",
      primary: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => setOpen(r)}
          className="flex flex-col gap-0.5 min-w-0 text-left hover:underline"
        >
          <span className="text-[13px] font-medium truncate">{r.title || "Untitled"}</span>
          <span className={`text-[11px] ${faintText} truncate`}>{r.summary}</span>
        </button>
      ),
    },
    { key: "createdAt", label: "Shared", width: "11rem", sortable: true, render: (r) => dt(r.createdAt) },
    { key: "turnCount", label: "Turns", width: "5rem", sortable: true },
    { key: "viewCount", label: "Views", width: "5rem", sortable: true },
    {
      key: "lastViewedAt",
      label: "Last opened",
      width: "11rem",
      sortable: true,
      render: (r) => dt(r.lastViewedAt),
    },
    {
      key: "flags",
      label: "Signals",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.revoked && <Badge tone="danger">revoked</Badge>}
          {r.hasDownvote && <Badge tone="warning">downvoted</Badge>}
          {r.hasRefusal && <Badge tone="warning">refused</Badge>}
          {r.noSources && <Badge tone="warning">no sources</Badge>}
          {!!r.types.length && <Badge tone="accent">{`scoped: ${r.types.join(", ")}`}</Badge>}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <ErrorState
        error={error}
        action={<Button size="sm" onClick={() => load(term)}>Try again</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Shared conversations"
        description="Conversations visitors have shared as a link. Revoking keeps the record and kills the link; deleting removes both."
      />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Shares" value={summary.total} />
          <Stat label="Total opens" value={summary.views} />
          <Stat label="Never opened" value={summary.neverOpened} />
          <Stat label="Revoked" value={summary.revoked} />
        </div>
      )}

      <Card title="Filters">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Filter label="Status"><Choice value={filters.status} onChange={setFilter("status")} options={STATUS} /></Filter>
          <Filter label="Shared within"><Choice value={filters.within} onChange={setFilter("within")} options={WITHIN} any="Any time" /></Filter>
          <Filter label="Length"><Choice value={filters.turns} onChange={setFilter("turns")} options={TURNS} /></Filter>
          <Filter label="Opened"><Choice value={filters.opened} onChange={setFilter("opened")} options={OPENED} /></Filter>
          <Filter label="Has a thumbs-down"><Choice value={filters.downvoted} onChange={setFilter("downvoted")} options={YES_NO} /></Filter>
          <Filter label="Chips were on"><Choice value={filters.scoped} onChange={setFilter("scoped")} options={YES_NO} /></Filter>
          <Filter label="An answer refused"><Choice value={filters.refused} onChange={setFilter("refused")} options={YES_NO} /></Filter>
          <Filter label="An answer had no sources"><Choice value={filters.noSources} onChange={setFilter("noSources")} options={YES_NO} /></Filter>
          <Filter label="Sort"><Choice value={filters.sort} onChange={setFilter("sort")} options={SORTS} any="Newest" /></Filter>
        </div>
        <div className="flex items-center gap-2 pt-3">
          <Button size="sm" onClick={() => setFilters(BLANK)}>Reset filters</Button>
          <span className={`text-[11px] ${faintText}`}>
            The search box searches every question and answer in the stored thread.
          </span>
        </div>
      </Card>

      <DataTable
        rows={visible}
        columns={columns}
        serverMode
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search inside shared conversations…"
        emptyTitle="No shared conversations"
        emptyDescription="Nothing matches these filters yet."
        toolbar={(
          <Button size="sm" onClick={() => setTerm(search)}>Search</Button>
        )}
        renderActions={(row) => (
          <div className="flex items-center gap-1">
            <a
              href={`/ask/s/${row.token}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open the shared page"
              className={`p-1.5 rounded-lg ${mutedText} hover:text-secondary`}
            >
              <ExternalLink size={16} />
            </a>
            <Button
              size="xs"
              onClick={(e) => { e.stopPropagation(); toggleRevoked(row); }}
            >
              {row.revoked ? "Restore" : "Revoke"}
            </Button>
            <IconButton
              icon={Trash2}
              label="Delete share"
              onClick={(e) => { e.stopPropagation(); setConfirming(row); }}
            />
          </div>
        )}
      />

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        size="lg"
        title={open?.title || "Shared conversation"}
        description={open ? `Shared ${dt(open.createdAt)} · ${open.turnCount} turns · ${open.viewCount} opens` : ""}
        footer={open && (
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/ask/s/${open.token}`} target="_blank" rel="noreferrer">
              <Button size="sm" icon={ExternalLink}>Open shared page</Button>
            </Link>
            <Button size="sm" onClick={() => toggleRevoked(open)}>
              {open.revoked ? "Restore" : "Revoke"}
            </Button>
            <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => setConfirming(open)}>
              Delete
            </Button>
          </div>
        )}
      >
        {open && (
          <div className="flex flex-col gap-4">
            <div className={`text-[11px] ${faintText} flex flex-wrap gap-x-4 gap-y-1`}>
              <span>{`token ${open.token}`}</span>
              <span>{`ip ${open.ipHash || "—"}`}</span>
              <span>{`last opened ${dt(open.lastViewedAt)}`}</span>
              {!!open.types.length && <span>{`chips: ${open.types.map(entityLabel).join(", ")}`}</span>}
            </div>
            {open.userAgent && (
              <p className={`text-[11px] ${faintText} mb-0 break-all`}>{open.userAgent}</p>
            )}
            {open.thread.map((turn, i) => (
              <div
                // A frozen, ordered snapshot — index is the identity.
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className={`rounded-xl border ${hairline} p-3 flex flex-col gap-2`}
              >
                <span className={labelClass}>{turn.role === "user" ? "Question" : "Answer"}</span>
                <p className="text-[13px] whitespace-pre-wrap mb-0">{turn.content}</p>
                {!!turn.sources?.length && (
                  <p className={`text-[11px] ${faintText} mb-0`}>
                    {turn.sources.map((sc, j) => `[${j + 1}] ${sc.title}`).join(" · ")}
                  </p>
                )}
                {turn.feedback?.rating === 1 && <Badge tone="success">Liked</Badge>}
                {turn.feedback?.rating === -1 && <Badge tone="danger">Disliked</Badge>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => remove(confirming)}
        title="Delete this share?"
        message="The link stops working and the record goes with it. Revoking instead kills the link but keeps the conversation here."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
};

export default AskShares;
