import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link } from "react-router-dom";
import RelatedContent from "../components/Ask/RelatedContent";
import PageShell from "../atlas/PageShell";
import { buildSportMeta } from "../data/pageMeta";
import { firstSlideImage } from "../lib/og/paths";
import { useSports } from "../context/ContentContext";
import { useWorld } from "../atlas/world/WorldContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import ShareImageButton from "../components/share/ShareImageButton";
import PhotoViewer from "../components/common/PhotoViewer";
import TagLinks from "../components/common/TagLinks";
import RaceActivity from "../components/Training/RaceActivity";
import {
  ArenaFonts, Fig, Plate, Readout, useSeen,
} from "../components/Arena/Arena";
import { Bib } from "../components/Sports/BibWall";
import {
  distanceName, enrichRaces, formatDelta, formatDuration, formatPace, formatRaceDay, ordinal, raceIso, raceStanding,
} from "../lib/raceLog";

// /sports/:id — one race (v27). A stage with the race's own photo, shown
// whole, the bib pinned under it, the finish time and the pace. Then where this finish stands among every other
// at its distance, the watch's record of the day kilometre by kilometre
// (RaceActivity), the photographs and the certificate. Every comparison is
// raceStanding() in src/lib/raceLog.js.

const toolLink = "inline-flex items-center gap-1.5 ar-kicker no-underline text-white/70 hover:text-white transition-colors";

/** Every finish at this distance on one time line; this race is the bright one. */
const Field = ({ race, field }) => {
  const [ref, seen] = useSeen(0.3);
  if (field.length < 2) return null;
  const lo = field[0].secs;
  const hi = field[field.length - 1].secs;
  const pos = (s) => (hi === lo ? 50 : 3 + ((s - lo) / (hi - lo)) * 94);
  return (
    <div ref={ref} className={seen ? "is-seen" : ""}>
      <div className="flex justify-between ar-kicker mb-2" style={{ fontSize: "0.58rem", color: "var(--ar-muted)" }} aria-hidden="true">
        <span>{`← Fastest · ${formatDuration(lo)}`}</span>
        <span>{`${formatDuration(hi)} · Slowest →`}</span>
      </div>
      <div className="relative h-14 rounded-full" style={{ background: "var(--ar-plate-2)" }}>
        {field.map((r, i) => {
          const me = r.id === race.id;
          return (
            <Link
              key={r.id}
              to={`/sports/${r.id}`}
              title={`${r.title} · ${formatDuration(r.secs)}`}
              aria-label={`${ordinal(i + 1)}: ${r.title}, ${formatDuration(r.secs)}`}
              aria-current={me ? "true" : undefined}
              className="ar-pop absolute top-1/2 rounded-full no-underline flex items-center justify-center transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              style={{
                left: `${pos(r.secs)}%`,
                width: me ? 30 : 14,
                height: me ? 30 : 14,
                marginLeft: me ? -15 : -7,
                marginTop: me ? -15 : -7,
                zIndex: me ? 2 : 1,
                background: me ? "var(--ar-accent)" : "var(--ar-faint)",
                boxShadow: me ? "0 0 0 5px color-mix(in srgb, var(--ar-accent) 22%, transparent)" : "0 0 0 2px var(--ar-plate-2)",
                "--ar-delay": `${i * 45}ms`,
              }}
            >
              {me && <span className="ar-display text-[13px] font-bold text-white">{i + 1}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
Field.propTypes = { race: PropTypes.shape({}).isRequired, field: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

const SportPost = () => {
  const { id } = useParams();
  const { data: sportsData, loading } = useSports();
  const { track } = useWorld();
  const [shareState, setShareState] = useState("idle");

  const all = useMemo(() => enrichRaces(sportsData), [sportsData]);
  const race = all.find((r) => String(r.id) === id);
  const standing = useMemo(() => (race ? raceStanding(race, all) : null), [race, all]);

  // Opening a race counts toward the Roadrunner collector quest (§4.5).
  useEffect(() => {
    if (race && race.id != null) track("race:open", String(race.id));
  }, [race, track]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: race?.title || "Race", url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  if (loading) return <PageShell region="marathons"><LoadingBlock label="Loading race…" /></PageShell>;

  if (!race) {
    return (
      <PageShell region="marathons" title="Race Not Found" noindex>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/sports" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Sports
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Race not found.</p>
        </div>
      </PageShell>
    );
  }

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  const meta = buildSportMeta({
    title: race.title,
    distance: race.distance,
    place: race.place,
    date: race.date,
    time: race.time,
    description: race.description,
    image: firstSlideImage(race.slideImages),
  });
  const photo = race.slideImages?.[0]?.url;
  const name = race.distKey != null ? distanceName(race.distKey).toLowerCase() : "race";
  const s = standing;
  const fieldSize = s.field.length;

  return (
    <PageShell region="marathons" title={meta.title} description={meta.description} image={meta.image}>
      <ArenaFonts />
      <div className="ar-root flex flex-col gap-6 w-full">
        <section className="ar-stage" aria-labelledby="race-title">
          <div className="px-5 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10 flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to="/sports" className={toolLink} style={{ fontSize: "0.64rem" }}>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
                Every finish line
              </Link>
              <div className="flex items-center gap-5 text-white/70 [&_*]:!text-inherit">
                <ShareImageButton kind="sport" item={race} />
                <button type="button" onClick={handleShare} className={toolLink} style={{ fontSize: "0.64rem" }}>
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{shareState === "idle" ? "share" : "check"}</span>
                  {{ shared: "Shared!", copied: "Copied!" }[shareState] || "Share"}
                </button>
              </div>
            </div>

            <div className="grid gap-8 items-center md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
              <div className="flex flex-col gap-4 min-w-0">
                <p className="ar-kicker mb-0 ar-stage-ember">
                  {[`Race ${s.ordinal} of ${s.total}`, formatRaceDay(race.dateObj) || race.date, race.place?.trim()].filter(Boolean).join(" · ")}
                </p>
                <h1 id="race-title" className="ar-title" style={{ fontSize: "clamp(2.4rem, 7cqw, 4.6rem)", lineHeight: 0.92 }}>{race.title}</h1>
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3 mt-2">
                  <div>
                    <p className="ar-kicker mb-1 ar-stage-muted" style={{ fontSize: "0.6rem" }}>Finish time</p>
                    <p className="ar-num mb-0 ar-stage-gold" style={{ fontSize: "clamp(4rem, 13cqw, 7.5rem)" }}>{formatDuration(race.secs) || race.time}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 pb-2">
                    {race.isBest && <span className="self-start px-3 py-1 rounded-full font-label text-[10px] font-black uppercase tracking-wider" style={{ background: "#ffc861", color: "#1c1917" }}>{`${distanceName(race.distKey)} personal best`}</span>}
                    {!race.isBest && race.wasPB && !race.firstAtDistance && <span className="self-start px-3 py-1 rounded-full bg-white/85 font-label text-[10px] font-black uppercase tracking-wider text-stone-800">A personal best on the day</span>}
                    {race.firstAtDistance && fieldSize > 1 && <span className="self-start px-3 py-1 rounded-full border border-white/40 font-label text-[10px] font-black uppercase tracking-wider text-white">{`The first ${name}`}</span>}
                    {race.pace && <span className="ar-display text-2xl font-semibold text-white">{`${formatPace(race.pace)} /km`}</span>}
                  </div>
                </div>
              </div>
              <div className="w-full max-w-[300px] justify-self-start md:justify-self-end">
                {photo && (
                  <img
                    src={photo}
                    alt={race.slideImages[0].alt || `${race.title}, race day`}
                    className="block w-full aspect-[4/5] object-cover object-top rounded-2xl border border-white/15 shadow-2xl"
                  />
                )}
                <Bib race={race} ordinal={s.ordinal} size="4.4rem" className={`rotate-2 ${photo ? "-mt-5 mx-3 relative" : ""}`} />
              </div>
            </div>
          </div>
          <Readout
            items={[
              { label: "Distance", value: race.km ? Number(race.km.toFixed(1)) : null, unit: "km", format: (v) => String(Number(v.toFixed(1))) },
              { label: `Among ${fieldSize} ${name}s`, value: s.rank && fieldSize > 1 ? ordinal(s.rank) : null, note: "fastest first" },
              { label: "Off the best", value: race.isBest || race.gapToBest == null ? null : formatDelta(race.gapToBest), note: s.best ? `${formatDuration(s.best.secs)}, ${s.best.title}` : null },
              { label: "Against the one before", value: s.previousDelta != null ? formatDelta(s.previousDelta) : null, note: s.previous?.title },
            ]}
          />
        </section>

        {race.description && (
          <p className="mb-0 px-1 ar-display text-2xl md:text-3xl font-medium leading-snug" style={{ color: "var(--ar-ink)" }}>
            <span style={{ color: "var(--ar-accent)" }} aria-hidden="true">“</span>
            {race.description}
            <span style={{ color: "var(--ar-accent)" }} aria-hidden="true">”</span>
          </p>
        )}
        <TagLinks tags={race.tags} className="px-1" />

        {race.secs && fieldSize > 1 && (
          <Plate
            kicker="Where it stands"
            title={s.rank === 1 ? `The fastest of ${fieldSize} ${name}s` : `${ordinal(s.rank)} fastest of ${fieldSize} ${name}s`}
            sub="Every finish at this distance on one line of time. The numbered dot is this race; any other dot opens its race."
          >
            <Field race={race} field={s.field} />
            <div className="ar-figs ar-figs-4 mt-7">
              <Fig label="Personal best" value={formatDuration(s.best.secs)} note={race.isBest ? "this race" : `${s.best.title} · ${formatRaceDay(s.best.dateObj)}`} to={race.isBest ? null : `/sports/${s.best.id}`} LinkAs={Link} />
              <Fig label="Off the best" value={race.isBest ? null : formatDelta(race.gapToBest)} note={race.pace && s.best.pace ? `${formatPace(race.pace - s.best.pace)} a kilometre` : null} />
              <Fig label="Broke the best by" value={race.improvedBy ? formatDuration(race.improvedBy) : null} note="against every earlier finish" />
              <Fig label="Same event, last time" value={s.sameEventDelta != null ? formatDelta(s.sameEventDelta) : null} note={s.sameEvent ? `${s.sameEvent.title} · ${formatDuration(s.sameEvent.secs)}` : null} to={s.sameEvent ? `/sports/${s.sameEvent.id}` : null} LinkAs={Link} />
              <Fig label="Against the one before" value={s.previousDelta != null ? formatDelta(s.previousDelta) : null} note={s.previous ? `${s.previous.title} · ${formatDuration(s.previous.secs)}` : null} to={s.previous ? `/sports/${s.previous.id}` : null} LinkAs={Link} />
            </div>
          </Plate>
        )}

        <RaceActivity sportId={race.id} date={raceIso(race)} km={race.km} />

        {race.slideImages?.length > 0 && (
          <Plate kicker="Race day" title={`${race.slideImages.length} ${race.slideImages.length === 1 ? "photograph" : "photographs"}`}>
            <PhotoViewer images={race.slideImages} title={race.title} />
          </Plate>
        )}

        {race.timeCertificateLink && (
          <a href={race.timeCertificateLink} target="_blank" rel="noopener noreferrer" className="ar-plate flex items-center justify-between gap-4 no-underline group">
            <span className="flex flex-col gap-1">
              <span className="ar-kicker" style={{ color: "var(--ar-accent)" }}>Official result</span>
              <span className="ar-h2" style={{ color: "var(--ar-ink)" }}>The timing certificate</span>
            </span>
            <span className="material-symbols-outlined text-3xl transition-transform group-hover:translate-x-1" style={{ color: "var(--ar-accent)" }} aria-hidden="true">arrow_outward</span>
          </a>
        )}

        <nav className="ar-grid ar-grid-2" aria-label="Neighbouring races">
          {[["Earlier", s.older, "arrow_back"], ["Later", s.newer, "arrow_forward"]].map(([label, r, icon]) => (r ? (
            <Link key={label} to={`/sports/${r.id}`} className={`ar-plate no-underline group flex items-center gap-4 ${label === "Later" ? "flex-row-reverse text-right" : ""}`}>
              <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-125" style={{ color: "var(--ar-accent)" }} aria-hidden="true">{icon}</span>
              <span className="min-w-0 flex flex-col gap-1">
                <span className="ar-fig-label">{`${label} · ${formatRaceDay(r.dateObj)}`}</span>
                <span className="ar-display text-2xl font-semibold truncate" style={{ color: "var(--ar-ink)" }}>{r.title}</span>
                <span className="ar-fig-note tabular-nums">{[r.distance, formatDuration(r.secs)].filter(Boolean).join(" · ")}</span>
              </span>
            </Link>
          ) : <span key={label} />))}
        </nav>

        <RelatedContent type="sport" id={id} />
      </div>
    </PageShell>
  );
};

export default SportPost;
