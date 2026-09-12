import React, { useEffect, useState } from "react";
import {
  download,
  getAllAskMessages,
  getAskMessages,
  getAskStats,
  listAskConversations,
  toCsv,
} from "../../lib/api/askConversations";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { Download, ChevronDown, ChevronUp } from "./ui/icons";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { hairline, mutedText } from "./ui/tokens";

const ms = (v) => (v === null || v === undefined ? "—" : `${v} ms`);
const when = (v) => (v ? new Date(v).toLocaleString() : "—");

const Stat = ({ label, value }) => (
  <div className={`border ${hairline} rounded-xl px-3 py-2`}>
    <p className={`text-[11px] ${mutedText} mb-0`}>{label}</p>
    <p className="text-[18px] font-semibold mb-0">{value}</p>
  </div>
);

// One conversation, expanded: every turn with the operational detail behind it.
const Thread = ({ conversationId }) => {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAskMessages(conversationId).then(setMessages).catch(setError);
  }, [conversationId]);

  if (error) return <ErrorState error={error} title="Couldn't load the thread" />;
  if (!messages) return <Spinner />;

  return (
    <div className="flex flex-col gap-3 pt-3">
      {messages.map((m) => (
        <div key={m.id} className={`border ${hairline} rounded-xl px-3 py-2`}>
          <p className={`text-[11px] uppercase tracking-wide ${mutedText} mb-1`}>
            {m.role}
            {m.role === "assistant" && m.model ? ` · ${m.model}` : ""}
          </p>
          <p className="text-[13px] whitespace-pre-wrap mb-0">{m.content}</p>
          {m.role === "assistant" && (
            <p className={`text-[11px] ${mutedText} mt-2 mb-0`}>
              {`tier ${m.tier || "—"} · total ${ms(m.totalMs)} `}
              {`(embed ${ms(m.embedMs)}, retrieval ${ms(m.retrievalMs)}, generation ${ms(m.generationMs)}) `}
              {`· ${m.sourceCount ?? 0} sources`}
              {m.degraded ? " · degraded" : ""}
              {m.keywordOnly ? " · keyword-only" : ""}
              {m.streamed ? " · streamed" : ""}
            </p>
          )}
          {!!m.tierErrors?.length && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 mb-0">
              {m.tierErrors.join(" · ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

const AskConversations = () => {
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    listAskConversations({ limit: 100 }).then(setRows).catch(setError);
    getAskStats(30).then(setStats).catch(() => setStats(null));
  }, []);

  const exportAll = async (format) => {
    setExporting(true);
    try {
      const messages = await getAllAskMessages();
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        download(`ask-conversations-${stamp}.csv`, toCsv(messages), "text/csv");
      } else {
        download(
          `ask-conversations-${stamp}.json`,
          JSON.stringify(messages, null, 2),
          "application/json",
        );
      }
      toast.success(`Exported ${messages.length} messages.`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (error) return <ErrorState error={error} title="Couldn't load conversations" />;
  if (!rows) return <Spinner />;

  const latency = stats?.latency_ms || {};

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Ask · Conversations"
        description="Every question asked of the second brain, with which model answered and how long each stage took."
      />

      {stats && (
        <Card title="Last 30 days">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Questions" value={stats.questions ?? 0} />
            <Stat label="Conversations" value={stats.conversations ?? 0} />
            <Stat label="Median answer" value={ms(latency.p50)} />
            <Stat label="95th percentile" value={ms(latency.p95)} />
            <Stat label="Degraded" value={stats.degraded ?? 0} />
            <Stat label="Keyword-only" value={stats.keyword_only ?? 0} />
            <Stat
              label="By tier"
              value={
                Object.entries(stats.by_tier || {})
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" · ") || "—"
              }
            />
            <Stat label="Slowest" value={ms(latency.max)} />
          </div>
        </Card>
      )}

      <Card
        title="Conversations"
        description="Newest first. Click one to read the thread."
        actions={(
          <div className="flex items-center gap-2">
            <Button size="sm" icon={Download} loading={exporting} onClick={() => exportAll("csv")}>
              CSV
            </Button>
            <Button size="sm" icon={Download} loading={exporting} onClick={() => exportAll("json")}>
              JSON
            </Button>
          </div>
        )}
      >
        {!rows.length && <p className={`text-[13px] ${mutedText} mb-0`}>Nothing asked yet.</p>}

        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.id} className={`border ${hairline} rounded-xl px-3 py-2`}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOpenId(openId === r.id ? null : r.id);
                }}
                className="flex items-start gap-3 cursor-pointer"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium truncate">
                    {r.firstQuestion || "(no question recorded)"}
                  </span>
                  <span className={`block text-[11px] ${mutedText}`}>
                    {`${when(r.lastAt)} · ${r.exchanges} exchange${r.exchanges === 1 ? "" : "s"}`}
                    {r.tiers.length ? ` · ${r.tiers.join(", ")}` : ""}
                    {r.avgTotalMs ? ` · avg ${ms(r.avgTotalMs)}` : ""}
                    {r.degradedCount ? ` · ${r.degradedCount} degraded` : ""}
                  </span>
                </span>
                {openId === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openId === r.id && <Thread conversationId={r.id} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AskConversations;
