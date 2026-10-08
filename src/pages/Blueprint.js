import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import useSiteStats from "../components/Stats/useSiteStats";
import { getChangelogMajors, getMajorHeadlines } from "../lib/api/changelog";
import { ROUTE_MANIFEST } from "../data/routeManifest";
import { SITE_NAME, SITE_URL } from "../data/pageMeta";
import { FEATURES, featureById, fmt } from "../components/Blueprint/features";
import SheetFrame from "../components/Blueprint/SheetFrame";
import Axonometric from "../components/Blueprint/Axonometric";
import SitePlan from "../components/Blueprint/SitePlan";
import RoomSpec from "../components/Blueprint/RoomSpec";
import SectionRiser from "../components/Blueprint/SectionRiser";
import AskCircuit from "../components/Blueprint/AskCircuit";
import UnfurlBench from "../components/Blueprint/UnfurlBench";
import ShellResolver from "../components/Blueprint/ShellResolver";
import TagLoom from "../components/Blueprint/TagLoom";
import RevisionBlock from "../components/Blueprint/RevisionBlock";
import FilmPlayer from "../components/Blueprint/FilmPlayer";
import "../components/Blueprint/blueprint.css";

// /blueprint — the site, drawn as a set of architectural sheets. A cover with
// the stack exploded, a plan of every feature as a room, a section tracing a
// room down through the stack, and four detail sheets for the parts worth
// taking apart. The selected room lives in ?room= so a drawing can be linked
// to with its redline on.

const DEFAULT_ROOM = "ask";

const SHEETS = [
  { id: "a-01", no: "A-01", title: "Site plan", what: "Every feature as a room" },
  { id: "a-02", no: "A-02", title: "Section", what: "One room, traced through the stack" },
  { id: "a-03", no: "A-03", title: "The Ask circuit", what: "A question, wired end to end" },
  { id: "a-04", no: "A-04", title: "Unfurl bench", what: "What a shared link becomes" },
  { id: "a-05", no: "A-05", title: "Shell switch", what: "Atlas or Classic, and who decides" },
  { id: "a-06", no: "A-06", title: "Tag loom", what: "One vocabulary across every shelf" },
  { id: "a-07", no: "A-07", title: "The film", what: "All six sheets, animated" },
];

// The version history, for the title block and the revision block. A failure
// leaves both without it rather than showing anything invented.
const useVersionHistory = () => {
  const [state, setState] = useState({ majors: null, headlines: null });
  useEffect(() => {
    let alive = true;
    Promise.all([getChangelogMajors(), getMajorHeadlines().catch(() => [])])
      .then(([majors, headlines]) => { if (alive) setState({ majors, headlines }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return state;
};

const TitleBlock = ({ rows }) => (
  <dl className="bp-panel grid grid-cols-[auto_1fr] m-0 text-[11px] bp-mono">
    {rows.filter((r) => r.value).map((r) => (
      <React.Fragment key={r.label}>
        <dt className="border-b border-r bp-rule px-2.5 py-1.5 uppercase tracking-[0.18em] text-[10px] bp-soft">{r.label}</dt>
        <dd className="border-b bp-rule px-2.5 py-1.5 m-0 bp-ink">{r.value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const Blueprint = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get("room");
  const selectedId = featureById(roomParam) ? roomParam : DEFAULT_ROOM;
  const feature = featureById(selectedId);

  // Merged into the existing params, so ?view= (the shell switch) survives.
  const select = (id) => {
    const params = new URLSearchParams(searchParams);
    params.set("room", id);
    setSearchParams(params, { replace: true });
  };

  const { data: snapshot, loading } = useSiteStats();
  const { majors, headlines } = useVersionHistory();
  const releases = majors ? majors.reduce((sum, m) => sum + (m.count || 0), 0) : null;

  const ctx = useMemo(() => ({
    stats: snapshot ? snapshot.stats : null,
    micro: snapshot ? snapshot.micro : null,
    tags: snapshot ? snapshot.tags : null,
    releases,
  }), [snapshot, releases]);

  const titleRows = [
    { label: "Project", value: SITE_URL.replace(/^https?:\/\//, "") },
    { label: "Drawn by", value: SITE_NAME },
    { label: "Revision", value: majors && majors[0] ? majors[0].latest : null },
    { label: "Releases", value: fmt(releases) },
    { label: "Routes", value: String(ROUTE_MANIFEST.length) },
    { label: "Rooms", value: String(FEATURES.length) },
    { label: "Scale", value: "NTS: not to scale" },
  ];

  return (
    <PageShell region="creator">
      <div className="bp-root flex flex-col gap-8 w-full">
        <section className="bp-sheet w-full" aria-labelledby="bp-cover-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] p-4 md:p-8">
            <div className="flex flex-col gap-5 min-w-0">
              <p className="bp-mono text-[10px] uppercase tracking-[0.28em] bp-red m-0">Sheet A-00 · Cover</p>
              <h1 id="bp-cover-title" className="font-headline text-5xl md:text-6xl font-black bp-ink m-0 leading-none">
                The Blueprint
              </h1>
              <p className="font-body text-base md:text-lg bp-ink m-0 max-w-xl">
                How this site is put together, drawn the way an architect draws a building: a plan
                of its rooms, a section through its floors, and detail sheets for the parts worth
                taking apart. Every drawing is live. Click it.
              </p>
              <a
                href="#a-07"
                className="bp-chip bp-chip-red bp-mono text-[11px] uppercase tracking-wider px-3 py-2 self-start no-underline"
              >
                ▶ Watch the two-minute film
              </a>
              <TitleBlock rows={titleRows} />
              <nav aria-label="Drawing index">
                <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink mb-1.5">Drawing index</p>
                <ol className="list-none p-0 m-0 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                  {SHEETS.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="group flex items-baseline gap-2.5 no-underline">
                        <span className="bp-mono text-[10px] bp-red whitespace-nowrap">{s.no}</span>
                        <span className="flex flex-col">
                          <span className="font-body text-sm bp-ink group-hover:underline">{s.title}</span>
                          <span className="font-body text-xs bp-soft">{s.what}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
            <Axonometric feature={feature} />
          </div>
        </section>

        <SheetFrame
          id="a-01"
          no="A-01"
          title="Site plan"
          lede="Every feature drawn as a room. A room's floor area is a live count, and its door shows where you walk in from."
          hint="Select a room · the redline follows you to sheet A-02"
        >
          <div className="flex flex-col gap-5">
            <SitePlan selectedId={selectedId} onSelect={select} ctx={ctx} />
            <RoomSpec feature={feature} ctx={ctx} selectedId={selectedId} onSelect={select} />
          </div>
        </SheetFrame>

        <SheetFrame
          id="a-02"
          no="A-02"
          title="Section"
          lede="A cut through the building, from the shells under the roof to the scripts in the plant room. The riser shows which floors a room reaches, and what it touches on each."
          hint="Select a floor to list every room standing on it"
        >
          <SectionRiser selectedId={selectedId} onSelect={select} />
        </SheetFrame>

        <SheetFrame
          id="a-03"
          no="A-03"
          title="The Ask circuit"
          lede="What happens between a question and its answer on /ask, as a wiring diagram. The ladder's switches are yours to throw."
        >
          <AskCircuit />
        </SheetFrame>

        <SheetFrame
          id="a-04"
          no="A-04"
          title="Unfurl bench"
          lede="Paste a link to this site anywhere and this is what happens. The card is the real committed image, and the tags are what the edge actually writes."
        >
          <UnfurlBench />
        </SheetFrame>

        <SheetFrame
          id="a-05"
          no="A-05"
          title="Shell switch"
          lede="Every page renders the same content inside one of two shells. Five rules, first match wins, decide which one a visitor gets."
        >
          <ShellResolver />
        </SheetFrame>

        <SheetFrame
          id="a-06"
          no="A-06"
          title="Tag loom"
          lede="Tags are rows of their own, linked to anything. Collections on the left, the most-used tags on the right, a thread for every pairing, and its width is how many rows share it."
          hint="Hover a collection or a tag · press a tag to open it"
        >
          <TagLoom tags={ctx.tags} loading={loading} />
        </SheetFrame>

        <SheetFrame
          id="a-07"
          no="A-07"
          title="The film"
          lede="The six sheets, animated: the walls draw themselves, the riser climbs down, the circuit runs and the loom weaves. Also cut as six short episodes, square and vertical."
        >
          <FilmPlayer />
        </SheetFrame>

        {majors && majors.length > 0 && (
          <section className="bp-sheet w-full p-4 md:p-6" aria-labelledby="bp-revisions-title">
            <h2 id="bp-revisions-title" className="bp-mono text-[10px] uppercase tracking-[0.28em] bp-red mt-0 mb-3 font-normal">
              Revisions
            </h2>
            <RevisionBlock majors={majors} headlines={headlines} />
          </section>
        )}
      </div>
    </PageShell>
  );
};

export default Blueprint;
