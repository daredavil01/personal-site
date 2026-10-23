import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";
import { Checkbox, Input } from "./ui/Input";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import {
  Clapperboard, ExternalLink, Plus, RefreshCw,
} from "./ui/icons";
import { hairline, mutedText } from "./ui/tokens";
import { useContentRefresh } from "../../context/ContentContext";
import videos, { setVideoVisible } from "../../lib/api/videos";
import { addVideo, syncChannel } from "../../lib/api/youtubeSync";
import { YOUTUBE_CHANNEL } from "../../lib/youtube";

// The "Sync now" button for /videos. The endpoint (functions/api/youtube-sync.js)
// holds the API key; this page drives its loop one page at a time and reports
// what came back. Nothing is deleted: a stored video a full run did not see is
// listed at the end, to hide by hand if it was removed or made private.

const dt = (iso) => (iso ? new Date(iso).toLocaleString() : "never");
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const YoutubeSync = () => {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [recheck, setRecheck] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const refreshContent = useContentRefresh();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await videos.list());
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = rows || [];
    const lastSync = list.reduce((max, r) => (r.syncedAt && r.syncedAt > max ? r.syncedAt : max), "");
    return {
      total: list.length,
      shorts: list.filter((r) => r.kind === "short").length,
      hidden: list.filter((r) => !r.visible).length,
      lastSync,
    };
  }, [rows]);

  // Only after a complete run: a stored, visible, synced video the channel did
  // not list. A manual add is never flagged — it may not be on this channel.
  const unseen = useMemo(() => {
    if (!result || !rows) return [];
    const seen = new Set(result.seen);
    return rows.filter((r) => r.source === "sync" && r.visible && !seen.has(r.youtubeId));
  }, [result, rows]);

  const runSync = async () => {
    setRunning(true);
    setResult(null);
    setProgress({ phase: "uploads", seen: [] });
    try {
      const summary = await syncChannel({ recheck, onProgress: setProgress });
      setResult(summary);
      toast.success(`Synced ${plural(summary.seen.length, "video")}: ${summary.added} new, ${summary.updated} updated.`);
      await load();
      refreshContent("videos");
    } catch (err) {
      toast.error(`Sync stopped: ${err.message}`);
      await load();
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    try {
      const { video, added } = await addVideo(url.trim(), { recheck });
      toast.success(`${added ? "Added" : "Updated"} "${video.title}" (${video.kind}).`);
      setUrl("");
      await load();
      refreshContent("videos");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const hide = async (row) => {
    try {
      await setVideoVisible(row.id, false);
      toast.success(`Hid "${row.title}".`);
      await load();
      refreshContent("videos");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const total = progress?.total || progress?.channel?.videoCount || null;
  const fraction = total && progress?.seen ? Math.min(1, progress.seen.length / total) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="YouTube sync"
        description="Copies the channel's public uploads into /videos: titles, descriptions, durations, view counts, thumbnails and playlists. Your tags, Short/Video overrides and hidden flags are never touched."
        actions={(
          <>
            <Button variant="ghost" icon={ExternalLink} onClick={() => window.open(YOUTUBE_CHANNEL.url, "_blank", "noopener")}>
              Channel
            </Button>
            <Button variant="ghost" icon={Clapperboard} onClick={() => navigate("/admin/videos")}>Edit videos</Button>
          </>
        )}
      />

      <Card title="Sync now">
        {loadError && <ErrorState error={loadError} action={<Button onClick={load}>Retry</Button>} />}
        {!loadError && !rows && <Spinner label="Reading stored videos…" />}
        {rows && (
          <div className="flex flex-col gap-3">
            <p className={`text-sm ${mutedText} mb-0`}>
              {`${plural(stats.total, "video")} stored (${stats.shorts} Shorts, ${stats.hidden} hidden). Last synced ${dt(stats.lastSync)}.`}
            </p>
            {/* The rule cannot see that Checkbox renders an <input>. */}
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="yt-recheck" className="flex items-center gap-2 text-sm">
              <Checkbox id="yt-recheck" checked={recheck} onChange={(e) => setRecheck(e.target.checked)} disabled={running} />
              Re-check Short / Video for videos already stored
            </label>
            <div>
              <Button variant="primary" icon={RefreshCw} loading={running} disabled={running} onClick={runSync}>
                {running ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {progress && (
              <ProgressBar
                value={progress.phase === "uploads" ? fraction : null}
                label={progress.phase === "uploads"
                  ? `Uploads: ${progress.seen.length}${total ? ` of ${total}` : ""}`
                  : "Reading playlists…"}
              />
            )}
            {result && (
              <div className={`rounded-md border p-3 text-sm flex flex-col gap-1 ${hairline}`}>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">{`${result.added} new`}</Badge>
                  <Badge>{`${result.updated} updated`}</Badge>
                  {result.skipped > 0 && <Badge tone="warning">{`${result.skipped} not public`}</Badge>}
                </div>
                <span className={mutedText}>
                  {`Short checks: ${result.probes.short} Shorts and ${result.probes.video} videos confirmed`}
                  {result.probes.unknown ? `, ${result.probes.unknown} decided by duration (check blocked)` : ""}
                  .
                </span>
                {result.playlists && (
                  <span className={mutedText}>
                    {result.playlists.truncated
                      ? "Playlists were not updated: there are more playlist pages than one request may read."
                      : `${plural(result.playlists.playlists.length, "playlist")}, ${plural(result.playlists.updated, "video")} re-filed.`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Add one video" description="An upload the sync missed, or a video that was unlisted and is public now. Paste any YouTube link.">
        <form onSubmit={add} className="flex flex-col md:flex-row gap-2 md:items-end">
          <div className="flex-1">
            <Field label="YouTube link">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={adding}
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" icon={Plus} loading={adding} disabled={adding || !url.trim()}>Add</Button>
        </form>
      </Card>

      {result && (
        <Card
          title="Not seen in this sync"
          description="Stored videos the channel no longer lists as public. Hide any that were removed or made private."
        >
          {unseen.length === 0 ? (
            <p className={`text-sm ${mutedText} mb-0`}>Every stored video was found.</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-0">
              {unseen.map((row) => (
                <li key={row.id} className={`flex items-center gap-3 rounded-md border p-2 ${hairline}`}>
                  <span className="text-sm flex-1 min-w-0 truncate">{row.title}</span>
                  <span className={`text-xs ${mutedText}`}>{row.date || ""}</span>
                  <Button size="xs" variant="secondary" onClick={() => hide(row)}>Hide</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default YoutubeSync;
