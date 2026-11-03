import React, { useMemo } from "react";
import PropTypes from "prop-types";
import StickFigure from "./StickFigure";
import { useInView } from "./shared";
import { formatDistance, formatDuration } from "../../lib/strava";
import { sportFamily } from "../../lib/training";

// A session that goes nowhere — strength, yoga, a pool — told without a
// line along the ground: one figure doing the thing, moving time on a dial,
// and, from the file's own record, the heart rate through the session with
// the sets laid under it (each set a block as long as it lasted and as tall
// as its reps; the gaps are the rests).

const SESSION_POSES = {
  WeightTraining: "lift", Yoga: "yoga", Swim: "swim", Workout: "lift", Crossfit: "lift", Pilates: "yoga",
};

const W = 640;
const HR_H = 110;
const SET_H = 54;

const SessionStory = ({ activity }) => {
  const [ref, seen] = useInView(0.25);
  const family = sportFamily(activity.sport);
  const pose = SESSION_POSES[activity.sport]
    || ({
      run: "run", walk: "walk", hike: "hike", ride: "ride", swim: "swim",
    })[family] || "stand";
  const moving = activity.movingTime || 0;
  const elapsed = Math.max(activity.elapsedTime || 0, moving);
  const share = elapsed ? moving / elapsed : 0;
  const c = 2 * Math.PI * 70;
  const profile = activity.profile || null;
  const sets = (profile?.sets || []).filter((s) => s.start != null && s.duration);
  const active = sets.filter((s) => s.type === "active");
  const reps = active.reduce((a, s) => a + (s.reps || 0), 0);

  const hr = useMemo(() => {
    if (!profile?.h || profile.by !== "time") return null;
    const pts = profile.t.map((t, k) => [t, profile.h[k]]).filter(([, h]) => h != null);
    if (pts.length < 3) return null;
    const lo = Math.min(...pts.map((p) => p[1]));
    const hi = Math.max(...pts.map((p) => p[1]));
    return {
      pts, lo, hi, end: Math.max(profile.t[profile.t.length - 1], ...sets.map((s) => s.start + s.duration)),
    };
  }, [profile, sets]);

  const end = hr?.end || Math.max(1, ...sets.map((s) => s.start + s.duration));
  const x = (t) => 8 + (t / end) * (W - 16);
  const maxReps = Math.max(1, ...active.map((s) => s.reps || 0));

  return (
    <section ref={ref} className="tr-root rounded-2xl border border-stone-200 dark:border-stone-800 bg-gradient-to-b from-amber-50/70 to-white dark:from-stone-900 dark:to-stone-950 p-5 md:p-6" aria-label="The session">
      <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">The session</p>
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <svg viewBox="0 0 180 180" className="w-44 h-44 mx-auto" role="img" aria-label={`${formatDuration(moving)} moving of ${formatDuration(elapsed)}`}>
          <circle cx="90" cy="90" r="70" fill="none" stroke="var(--tr-line)" strokeWidth="10" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="#e8a317" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={seen ? c * (1 - share) : c} transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)" }} />
          <g className={`text-stone-900 dark:text-stone-100 ${seen ? "tr-bob" : ""}`}>
            <StickFigure pose={pose} x={pose === "swim" ? 92 : 88} y={pose === "swim" ? 100 : 118} scale={1.05} />
          </g>
        </svg>
        <dl className="grid grid-cols-2 gap-4 mb-0">
          <div>
            <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Moving</dt>
            <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{formatDuration(moving) || "—"}</dd>
            {elapsed > moving + 30 && <dd className="text-xs text-stone-500 mb-0">{`of ${formatDuration(elapsed)}`}</dd>}
          </div>
          {activity.averageHeartrate && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Heart</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{`${Math.round(activity.averageHeartrate)} bpm`}</dd>
              {activity.maxHeartrate && <dd className="text-xs text-stone-500 mb-0">{`average, peaking at ${Math.round(activity.maxHeartrate)}`}</dd>}
            </div>
          )}
          {active.length > 0 && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Sets</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">
                {active.length}
                {reps > 0 && <span className="text-base text-stone-500">{` · ${reps} reps`}</span>}
              </dd>
            </div>
          )}
          {activity.calories > 0 && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Energy</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{`${Math.round(activity.calories)} kcal`}</dd>
            </div>
          )}
          {activity.distance > 0 && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Distance</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{formatDistance(activity.distance)}</dd>
            </div>
          )}
        </dl>
      </div>

      {(hr || sets.length > 0) && (
        <figure className="mt-5 mb-0">
          <svg viewBox={`0 0 ${W} ${(hr ? HR_H : 0) + (sets.length ? SET_H + 10 : 0) + 18}`} className="block w-full h-auto" role="img" aria-label={`Heart rate through the session${active.length ? ` and ${active.length} sets` : ""}`}>
            <defs>
              <clipPath id={`tr-sess-${activity.id}`}>
                <rect x="0" y="0" height="400" width={seen ? W : 0} style={{ transition: "width 2.4s cubic-bezier(.16,1,.3,1)" }} />
              </clipPath>
            </defs>
            <g clipPath={`url(#tr-sess-${activity.id})`}>
              {hr && (() => {
                const y = (h) => 8 + (1 - (h - hr.lo) / ((hr.hi - hr.lo) || 1)) * (HR_H - 16);
                const d = hr.pts.map(([t, h], k) => `${k ? "L" : "M"}${x(t).toFixed(1)} ${y(h).toFixed(1)}`).join("");
                return (
                  <g>
                    <path d={`${d}L${x(hr.pts[hr.pts.length - 1][0])} ${HR_H}L${x(hr.pts[0][0])} ${HR_H}Z`} fill="#dc2626" fillOpacity="0.1" />
                    <path d={d} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" />
                    <text x="8" y="14" fontSize="11" fill="var(--tr-muted)">{`♥ ${Math.round(hr.lo)}–${Math.round(hr.hi)} bpm`}</text>
                  </g>
                );
              })()}
              {sets.map((s, k) => {
                const top = (hr ? HR_H + 10 : 0);
                if (s.type === "rest") {
                  return <rect key={k} x={x(s.start)} y={top + SET_H - 3} width={Math.max(1, x(s.start + s.duration) - x(s.start))} height="3" fill="var(--tr-line)" />; // eslint-disable-line react/no-array-index-key
                }
                const h = 10 + ((s.reps || 0) / maxReps) * (SET_H - 10);
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <g key={k}>
                    <rect x={x(s.start)} y={top + SET_H - h} width={Math.max(2, x(s.start + s.duration) - x(s.start) - 1)} height={h} rx="2" fill="#e8a317">
                      <title>{`${s.category || "Set"}: ${s.reps ? `${s.reps} reps, ` : ""}${formatDuration(s.duration)}${s.weight ? `, ${s.weight} kg` : ""}`}</title>
                    </rect>
                  </g>
                );
              })}
            </g>
            <text x="8" y={(hr ? HR_H : 0) + (sets.length ? SET_H + 10 : 0) + 14} fontSize="11" fill="var(--tr-muted)">0:00</text>
            <text x={W - 8} y={(hr ? HR_H : 0) + (sets.length ? SET_H + 10 : 0) + 14} fontSize="11" textAnchor="end" fill="var(--tr-muted)">{formatDuration(end)}</text>
          </svg>
          {sets.length > 0 && (
            <figcaption className="font-label text-[10px] uppercase tracking-widest text-stone-400 mt-1">
              {`Sets as the watch logged them — taller is more reps${[...new Set(active.map((s) => s.category).filter(Boolean))].length ? ` · ${[...new Set(active.map((s) => s.category).filter(Boolean))].join(", ")}` : ""}`}
            </figcaption>
          )}
        </figure>
      )}
    </section>
  );
};

SessionStory.propTypes = {
  activity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    sport: PropTypes.string,
    movingTime: PropTypes.number,
    elapsedTime: PropTypes.number,
    averageHeartrate: PropTypes.number,
    maxHeartrate: PropTypes.number,
    calories: PropTypes.number,
    distance: PropTypes.number,
    profile: PropTypes.shape({}),
  }).isRequired,
};

export default SessionStory;
