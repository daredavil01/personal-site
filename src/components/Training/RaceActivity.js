import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Fig, Plate } from "../Arena/Arena";
import { getActivityForRace } from "../../lib/api/training";
import {
  formatDistance, formatDuration, formatEffortSpeed, isPaceSport,
} from "../../lib/strava";
import SplitChart from "./SplitChart";

// On a /sports race page: the watch's record of that race — the session
// linked to it (sport_id, set at /admin/training/races) or, failing that, the
// run of the same day and distance. The splits kilometre by kilometre, then
// what the watch measured: heart, steps, cadence, climb. Renders nothing when
// there is no such session, or when it is not public.

const int = (n) => Math.round(n).toLocaleString("en-GB");

const RaceActivity = ({ sportId, date, km }) => {
  const [a, setA] = useState(null);

  useEffect(() => {
    let live = true;
    setA(null);
    getActivityForRace(sportId, { date, km }).then((d) => live && setA(d)).catch(() => live && setA(null));
    return () => { live = false; };
  }, [sportId, date, km]);

  if (!a) return null;
  // eslint-disable-next-line no-underscore-dangle
  const stats = a.extra?._stats || {};
  const half = stats.negSplit;
  return (
    <Plate
      night
      kicker="From the watch"
      title="The race, kilometre by kilometre"
      sub={`${a.name}${a.deviceName ? `, recorded on a ${a.deviceName}` : ""}. Chip time and watch time differ by the walk to the start line.`}
      action={(
        <Link to={`/training/${a.id}`} className="ar-chip no-underline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
          The full session
          <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
        </Link>
      )}
    >
      <SplitChart splits={a.splits} sport={a.sport} night />
      <div className="ar-figs ar-figs-4 mt-7">
        <Fig label="Watch distance" value={formatDistance(a.distance)} note={`${formatDuration(a.movingTime)} moving`} />
        <Fig label={isPaceSport(a.sport) ? "Average pace" : "Average speed"} value={formatEffortSpeed(a.sport, a.averageSpeed)} note={half != null && half !== 0 ? `second half ${Math.abs(half)} s/km ${half < 0 ? "quicker" : "slower"}` : null} />
        <Fig label="Heart rate" value={a.averageHeartrate ? `${Math.round(a.averageHeartrate)} bpm` : null} note={a.maxHeartrate ? `peaked at ${Math.round(a.maxHeartrate)}` : null} />
        <Fig label="Steps" value={stats.steps ? int(stats.steps) : null} note={a.averageCadence ? `${Math.round(a.averageCadence * 2)} a minute` : null} />
        <Fig label="Climbed" value={a.elevationGain ? `${int(a.elevationGain)} m` : null} />
        <Fig label="Energy" value={a.calories ? `${int(a.calories)} kcal` : null} />
        <Fig label="Heart drift" value={stats.drift != null ? `${stats.drift > 0 ? "+" : ""}${stats.drift}%` : null} note="second half against the first, pace held equal" />
        <Fig label="Temperature" value={stats.tMax != null ? `${stats.tMin}–${stats.tMax} °C` : null} note="at the wrist" />
      </div>
    </Plate>
  );
};

RaceActivity.propTypes = {
  sportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  /** The race day, "YYYY-MM-DD", and the course in km: used when no session is linked by hand. */
  date: PropTypes.string,
  km: PropTypes.number,
};
RaceActivity.defaultProps = { date: null, km: null };

export default RaceActivity;
