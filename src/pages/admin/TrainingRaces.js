import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { Activity } from "./ui/icons";
import { hairline, mutedText } from "./ui/tokens";
import { supabase } from "../../lib/supabaseClient";
import training, { patchActivity } from "../../lib/api/training";
import { formatDistance, matchRace } from "../../lib/strava";

// /admin/training/races — activities that look like a /sports race (same day,
// same distance) but are not linked yet, each one press away from being
// linked. Linking puts the activity's splits on the race page.
//
// Activities themselves arrive only from `npm run strava:import` (a Strava bulk
// export); there is no sync button, because Strava's API needs a paid plan.

const dt = (iso) => (iso ? new Date(iso).toLocaleString() : "never");

const TrainingRaces = () => {
  const [rows, setRows] = useState(null);
  const [sports, setSports] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, sportRows] = await Promise.all([
        training.list(),
        supabase.from("sports").select("id,title,date,distance").then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      ]);
      setRows(list);
      setSports(sportRows);
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = rows || [];
    return {
      total: list.length,
      hidden: list.filter((r) => !r.visible || r.private).length,
      linked: list.filter((r) => r.sportId).length,
      lastImport: list.reduce((max, r) => (r.syncedAt && r.syncedAt > max ? r.syncedAt : max), ""),
    };
  }, [rows]);

  // Unlinked activities that match exactly one race not yet claimed.
  const suggestions = useMemo(() => {
    if (!rows) return [];
    const claimed = new Set(rows.map((r) => r.sportId).filter(Boolean));
    const open = sports.filter((s) => !claimed.has(s.id));
    return rows
      .filter((r) => !r.sportId)
      .map((r) => ({ activity: r, sportId: matchRace(r, open) }))
      .filter((s) => s.sportId)
      .map((s) => ({ ...s, race: sports.find((x) => x.id === s.sportId) }));
  }, [rows, sports]);

  const link = async ({ activity, race }) => {
    try {
      await patchActivity(activity.id, { sport_id: race.id });
      toast.success(`Linked "${activity.name}" to ${race.title}.`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Link races"
        description="Strava activities on the same day and distance as a /sports race. Linking shows the activity's pace and splits on the race page."
        actions={(
          <Button variant="ghost" icon={Activity} onClick={() => navigate("/admin/training")}>Edit activities</Button>
        )}
      />

      {loadError && <ErrorState error={loadError} action={<Button onClick={load}>Retry</Button>} />}
      {!loadError && !rows && <Spinner label="Reading activities…" />}

      {rows && (
        <Card title="Import">
          <p className={`text-sm ${mutedText} mb-2`}>
            {`${stats.total} activities stored (${stats.hidden} hidden, ${stats.linked} linked to races). Last import ${dt(stats.lastImport)}.`}
          </p>
          <p className={`text-sm ${mutedText} mb-0`}>
            New activities: request your archive on strava.com, unzip it into
            {" "}
            <code>knowledge_base/strava-export/</code>
            , then run
            {" "}
            <code>npm run strava:import</code>
            . Re-running is safe; your visibility, race links and tags are kept.
          </p>
        </Card>
      )}

      {rows && (
        <Card title="Races to link">
          {suggestions.length === 0 ? (
            <p className={`text-sm ${mutedText} mb-0`}>Nothing to link.</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-0">
              {suggestions.map((s) => (
                <li key={s.activity.id} className={`flex flex-wrap items-center gap-3 rounded-md border p-2 ${hairline}`}>
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {`${s.activity.name} · ${formatDistance(s.activity.distance)} · ${s.activity.date}`}
                  </span>
                  <span className={`text-xs ${mutedText}`}>{`→ ${s.race.title}`}</span>
                  <Button size="xs" variant="secondary" onClick={() => link(s)}>Link</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default TrainingRaces;
