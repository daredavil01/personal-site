import React, { useEffect, useMemo, useState } from "react";
import {
  applyFilters,
  download,
  EMPTY_FILTERS,
  filterOptions,
  getIndexCoverage,
  listAskMessages,
  summariseExchanges,
  toChats,
  toCsv,
  toEvalsJsonl,
  toExchanges,
} from "../../lib/api/askConversations";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { Input, Select } from "./ui/Input";
import { Download } from "./ui/icons";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { faintText, hairline, labelClass, mutedText } from "./ui/tokens";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 40;

const ms = (v) => (v === null || v === undefined ? "—" : `${v.toLocaleString()} ms`);
const time = (v) => (v ? new Date(v).toLocaleString() : "—");
const localDay = (d) => d.toLocaleDateString("en-CA");
const entries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

const Stat = ({ label, value, hint }) => (
  <div className={`border ${hairline} rounded-xl px-3 py-2`}>
    <p className={`text-[11px] ${mutedText} mb-0`}>{label}</p>
    <p className="text-[18px] font-semibold mb-0 tabular-nums">{value}</p>
    {hint && <p className={`text-[11px] ${faintText} mb-0`}>{hint}</p>}
  </div>
);

// A labelled count list: "gemini 41 · search-only 3".
const Breakdown = ({ label, data, empty = "—" }) => {
  const list = entries(data);
  return (
    <div className="min-w-0">
      <p className={`text-[11px] uppercase tracking-wide ${mutedText} mb-1`}>{label}</p>
      {list.length ? (
        <div className="flex flex-wrap gap-1.5">
          {list.map(([k, v]) => (
            <Badge key={k}>{`${k} · ${v}`}</Badge>
          ))}
        </div>
      ) : (
        <p className={`text-[13px] ${faintText} mb-0`}>{empty}</p>
      )}
    </div>
  );
};

// The control inside gets an id so the label points at it.
const Filter = ({ label, children }) => {
  const id = `ask-filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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
    {options.map((o) => {
      const [v, text] = Array.isArray(o) ? o : [o, o];
      return <option key={v} value={v}>{text}</option>;
    })}
  </Select>
);

const YES_NO = [["yes", "Yes"], ["no", "No"]];

// One question and its answer, with everything needed to judge it.
const Exchange = ({ exchange, onSession }) => {
  const a = exchange.answer;
  return (
    <div className={`border-t ${hairline} pt-3 first:border-t-0 first:pt-0 flex flex-col gap-2`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium mb-0 whitespace-pre-wrap">{exchange.question || "(no question recorded)"}</p>
        <span className={`text-[11px] ${faintText} shrink-0`}>{time(exchange.askedAt)}</span>
      </div>
      <p className={`text-[13px] whitespace-pre-wrap mb-0 ${mutedText}`}>{a.content}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        {a.feedback === 1 && <Badge tone="success">Liked</Badge>}
        {a.feedback === -1 && <Badge tone="danger">Disliked</Badge>}
        {a.feedbackTags.map((t) => <Badge key={t} tone="warning">{t}</Badge>)}
        <Badge tone="accent">{a.tier || "no tier"}</Badge>
        {a.model && <Badge>{a.model}</Badge>}
        {a.degraded && <Badge tone="warning">degraded</Badge>}
        {a.keywordOnly && <Badge tone="warning">keyword-only</Badge>}
        {!a.sourceCount && <Badge tone="danger">no sources</Badge>}
        {a.streamed && <Badge>streamed</Badge>}
        <span className={`text-[11px] ${faintText}`}>
          {`total ${ms(a.totalMs)} · embed ${ms(a.embedMs)} · retrieval ${ms(a.retrievalMs)} · generation ${ms(a.generationMs)}`}
        </span>
      </div>

      {a.feedbackComment && (
        <p className="text-[13px] mb-0 border-l-2 border-amber-400 pl-2 italic">{a.feedbackComment}</p>
      )}

      {!!a.sources.length && (
        <p className={`text-[11px] ${faintText} mb-0`}>
          {a.sources.map((s, i) => `[${i + 1}] ${s.title || "Untitled"} (${s.entity_type})`).join(" · ")}
        </p>
      )}

      {!!a.tierErrors.length && (
        <p className="text-[11px] text-red-600 dark:text-red-400 mb-0">{a.tierErrors.join(" · ")}</p>
      )}

      {exchange.sessionId && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSession(exchange.sessionId)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSession(exchange.sessionId); }}
          className={`self-start cursor-pointer text-[11px] ${faintText} hover:underline`}
        >
          {`session ${exchange.sessionId.slice(0, 8)} — show only this browser`}
        </div>
      )}
    </div>
  );
};

const AskConversations = () => {
  const today = new Date();
  const [from, setFrom] = useState(localDay(new Date(today.getTime() - 29 * DAY_MS)));
  const [to, setTo] = useState(localDay(today));
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const toast = useToast();

  // The date range is the one server-side filter; everything else is instant.
  useEffect(() => {
    setMessages(null);
    setError(null);
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(new Date(`${to}T00:00:00`).getTime() + DAY_MS);
    listAskMessages({ from: start.toISOString(), to: end.toISOString() })
      .then(setMessages)
      .catch(setError);
  }, [from, to]);

  useEffect(() => {
    getIndexCoverage().then(setCoverage).catch(() => setCoverage(null));
  }, []);

  const exchanges = useMemo(() => toExchanges(messages || []), [messages]);
  const options = useMemo(() => filterOptions(exchanges), [exchanges]);
  const filtered = useMemo(() => applyFilters(exchanges, filters), [exchanges, filters]);
  const summary = useMemo(() => summariseExchanges(filtered), [filtered]);
  const chats = useMemo(() => toChats(filtered), [filtered]);

  const setFilter = (key) => (value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setShown(PAGE_SIZE);
  };
  const active = Object.values(filters).some(Boolean);

  const exportAs = (format) => {
    const stamp = `${from}_to_${to}`;
    if (format === "csv") download(`ask-exchanges-${stamp}.csv`, toCsv(filtered), "text/csv");
    else if (format === "json") download(`ask-exchanges-${stamp}.json`, JSON.stringify(filtered, null, 2), "application/json");
    else {
      const jsonl = toEvalsJsonl(filtered);
      if (!jsonl) {
        toast.error("Nothing to export: none of these answers has a rating or comment.");
        return;
      }
      download(`ask-evals-${stamp}.jsonl`, `${jsonl}\n`, "application/x-ndjson");
    }
    toast.success(`Exported ${filtered.length} exchanges.`);
  };

  if (error) return <ErrorState error={error} title="Couldn't load conversations" />;

  const { latency, stages } = summary;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Ask · Conversations"
        description="Every question asked of the second brain, what answered it, how long it took, and what readers thought of it."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={Download} disabled={!filtered.length} onClick={() => exportAs("csv")}>CSV</Button>
            <Button size="sm" icon={Download} disabled={!filtered.length} onClick={() => exportAs("json")}>JSON</Button>
            <Button size="sm" icon={Download} disabled={!filtered.length} onClick={() => exportAs("evals")}>Evals JSONL</Button>
          </div>
        )}
      />

      <Card
        title="Filters"
        description={messages
          ? `${filtered.length} of ${exchanges.length} exchanges between ${from} and ${to}.`
          : "Loading…"}
        actions={active && (
          <Button size="sm" variant="ghost" onClick={() => { setFilters(EMPTY_FILTERS); setShown(PAGE_SIZE); }}>
            Clear filters
          </Button>
        )}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <Filter label="From">
            <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </Filter>
          <Filter label="To">
            <Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </Filter>
          <Filter label="Search question, answer or comment">
            <Input type="search" value={filters.search} placeholder="marathon" onChange={(e) => setFilter("search")(e.target.value)} />
          </Filter>
          <Filter label="Feedback">
            <Choice
              value={filters.feedback}
              onChange={setFilter("feedback")}
              options={[["liked", "Liked"], ["disliked", "Disliked"], ["commented", "Has a comment"], ["rated", "Rated"], ["unrated", "Not rated"]]}
            />
          </Filter>
          <Filter label="Feedback reason">
            <Choice value={filters.feedbackTag} onChange={setFilter("feedbackTag")} options={options.feedbackTags} />
          </Filter>
          <Filter label="Tier">
            <Choice value={filters.tier} onChange={setFilter("tier")} options={options.tiers} />
          </Filter>
          <Filter label="Model">
            <Choice value={filters.model} onChange={setFilter("model")} options={options.models} />
          </Filter>
          <Filter label="Provider">
            <Choice value={filters.provider} onChange={setFilter("provider")} options={options.providers} />
          </Filter>
          <Filter label="Cited content type">
            <Choice value={filters.sourceType} onChange={setFilter("sourceType")} options={options.sourceTypes} />
          </Filter>
          <Filter label="Degraded">
            <Choice value={filters.degraded} onChange={setFilter("degraded")} options={YES_NO} />
          </Filter>
          <Filter label="Keyword-only search">
            <Choice value={filters.keywordOnly} onChange={setFilter("keywordOnly")} options={YES_NO} />
          </Filter>
          <Filter label="Model errors">
            <Choice value={filters.errors} onChange={setFilter("errors")} options={YES_NO} />
          </Filter>
          <Filter label="No sources found">
            <Choice value={filters.noSources} onChange={setFilter("noSources")} options={YES_NO} />
          </Filter>
          <Filter label="Session id">
            <Input value={filters.session} placeholder="any browser" onChange={(e) => setFilter("session")(e.target.value.trim())} />
          </Filter>
        </div>
      </Card>

      {!messages ? <Spinner /> : (
        <>
          <Card title="Summary" description="For the exchanges matching the filters above.">
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <Stat label="Questions" value={summary.questions} />
                <Stat label="Chats" value={summary.chats} hint={`${summary.sessions} browsers`} />
                <Stat
                  label="Satisfaction"
                  value={summary.satisfaction === null ? "—" : `${summary.satisfaction}%`}
                  hint={`${summary.liked} liked · ${summary.disliked} disliked`}
                />
                <Stat label="Comments" value={summary.commented} />
                <Stat label="Median answer" value={ms(latency.p50)} />
                <Stat label="95th percentile" value={ms(latency.p95)} hint={`slowest ${ms(latency.max)}`} />
                <Stat label="Avg embed" value={ms(stages.embed)} />
                <Stat label="Avg retrieval" value={ms(stages.retrieval)} />
                <Stat label="Avg generation" value={ms(stages.generation)} />
                <Stat label="Degraded" value={summary.degraded} hint={`${summary.keywordOnly} keyword-only`} />
                <Stat label="Model errors" value={summary.withErrors} />
                <Stat label="No sources" value={summary.noSources} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Breakdown label="Answered by tier" data={summary.byTier} />
                <Breakdown label="Model" data={summary.byModel} />
                <Breakdown label="Feedback reasons" data={summary.feedbackTags} empty="No reasons given yet." />
                <Breakdown label="Content types cited" data={summary.sourceTypes} />
                <Breakdown label="Questions per day" data={summary.perDay} />
                <Breakdown
                  label="Index coverage (items per content type)"
                  data={coverage}
                  empty="Unavailable — apply migration 0016 and run npm run ask:index."
                />
              </div>
            </div>
          </Card>

          <Card
            title="Chats"
            description="Newest first. A browser's questions are one chat until it goes quiet for 30 minutes; each chat lists its exchanges in order."
          >
            {!chats.length && <p className={`text-[13px] ${mutedText} mb-0`}>Nothing matches these filters.</p>}
            <div className="flex flex-col gap-4">
              {chats.slice(0, shown).map((chat) => (
                <div key={chat.id} className={`border ${hairline} rounded-xl px-4 py-3 flex flex-col gap-3`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold mb-0">
                      {`${time(chat.startedAt)} · ${chat.exchanges.length} question${chat.exchanges.length === 1 ? "" : "s"}`}
                    </p>
                    <p className={`text-[11px] ${faintText} mb-0 truncate max-w-full`}>{chat.userAgent || ""}</p>
                  </div>
                  {chat.exchanges.map((e) => (
                    <Exchange key={e.id} exchange={e} onSession={setFilter("session")} />
                  ))}
                </div>
              ))}
            </div>
            {chats.length > shown && (
              <div className="pt-4">
                <Button size="sm" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                  {`Show ${Math.min(PAGE_SIZE, chats.length - shown)} more of ${chats.length - shown}`}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AskConversations;
