// The film's running order: which segments exist, how long each runs, what it
// says, and where its sounds fall. Segments are rendered once and spliced two
// ways — the whole film, and one short episode per sheet for posting as a
// series (title card, the sheet, the end card).

import { captionAt, frame, prog } from "./draw.mjs";
import { cover, endCard, episodeCard } from "./scenes/cover.mjs";
import { plan } from "./scenes/plan.mjs";
import { section } from "./scenes/section.mjs";
import { circuit, stepTime } from "./scenes/circuit.mjs";
import { unfurl, CYCLE as UNFURL_CYCLE, START as UNFURL_START } from "./scenes/unfurl.mjs";
import { shell, VISIT, START as SHELL_START } from "./scenes/shell.mjs";
import { loom, loomLayout } from "./scenes/loom.mjs";

const pad = (k) => String(k).padStart(2, "0");
const shellName = (s) => (s === "atlas" ? "the Atlas" : "Classic");

// "Life: 472 micro posts, 7 blog posts" — a tag's threads, in words.
const threadsOf = (layout, tagName, plural) => layout.threads
  .filter((th) => th.tag === tagName)
  .sort((a, b) => b.n - a.n)
  .slice(0, 3)
  .map((th) => `${th.n.toLocaleString("en-IN")} ${plural(th.type)}`)
  .join(", ");

/**
 * @param {object} d  everything the drawings show, gathered by
 *   scripts/generate-blueprint-film.mjs from the live site and the source.
 */
export function buildFilm(d) {
  const feature = (id) => d.features.find((f) => f.id === id);
  const total = 6;

  // --- the six sheets ---------------------------------------------------------

  const tour = [
    { at: 5.0, id: "archives" }, { at: 7.8, id: "ask" }, { at: 10.6, id: "atlas" }, { at: 13.2, id: "admin" },
  ];
  const archivesArea = d.areaOf(feature("archives"));
  const atlasArea = d.areaOf(feature("atlas"));

  const ask = feature("ask");
  const changelog = feature("changelog");
  const floors = (f) => Object.keys(f.layers).length;

  const { steps } = d.sequence;
  const failIndex = steps.findIndex((s) => s.failed);
  const searchIndex = steps.findIndex((s) => s.nodes.includes("keyword"));
  const sanitiseIndex = steps.findIndex((s) => s.nodes.includes("sanitise"));
  const answerIndex = failIndex + 1;

  const withMicro = loomLayout(d.tags, d.types, true, d.colorForTag);
  const withoutMicro = loomLayout(d.tags, d.types, false, d.colorForTag);
  const topA = withMicro.rows[0];
  const topB = withoutMicro.rows[0];
  const links = d.tags.reduce((s, tag) => s + Object.values(tag.counts || {}).reduce((a, b) => a + Number(b || 0), 0), 0);

  const visitors = [
    { who: "Opens a link with ?view=atlas", inputs: { param: "atlas", defaultView: d.defaultView } },
    { who: "Has asked for reduced motion", inputs: { reducedMotion: true, defaultView: d.defaultView } },
    { who: "Brings no preference at all", inputs: { defaultView: d.defaultView } },
  ].map((v) => ({ ...v, decision: d.decide(v.inputs) }));

  const sheets = [
    {
      id: "site-plan",
      sheet: "A-01",
      title: "Site plan",
      line: "Every feature of the site, drawn as a room.",
      duration: 16,
      poster: 6.2,
      render: plan({
        features: d.features, collections: d.collections, areaOf: d.areaOf, tour,
      }),
      beats: [
        { at: 0.4, text: `Every feature of the site, drawn as a room: ${d.features.length} of them, measured live.` },
        { at: 5.0, text: archivesArea ? `Archives: eight collections, ${archivesArea}, one table each.` : "Archives: eight collections, one table each." },
        { at: 7.8, text: "Ask the Archive: plain-language questions, answered with the pages they came from." },
        { at: 10.6, text: atlasArea ? `The Atlas: the same pages as an illustrated world, in ${atlasArea}.` : "The Atlas: the same pages as an illustrated world." },
        { at: 13.2, text: "Admin is staff only. Row-level security in Postgres is the lock." },
      ],
      sfx: tour.map((s) => ({ at: s.at, name: "stamp" })),
    },
    {
      id: "section",
      sheet: "A-02",
      title: "Section",
      line: "One feature, traced down through the stack.",
      duration: 14.5,
      poster: 6.6,
      render: section({
        layers: d.layers,
        risers: [{ feature: ask, at: 2.6, until: 8.1 }, { feature: changelog, at: 8.6, until: 99 }],
      }),
      beats: [
        { at: 0.3, text: "A section through the site: the shells under the roof, the scripts in the plant room." },
        { at: 2.6, text: `Ask the Archive touches all ${floors(ask)} floors, from the launcher on every page to the nightly index.` },
        { at: 8.6, text: `The changelog skips the edge entirely: ${floors(changelog)} floors, the browser reading Postgres directly.` },
      ],
      sfx: [{ at: 2.6, name: "stamp" }, { at: 8.6, name: "stamp" }],
    },
    {
      id: "ask-circuit",
      sheet: "A-03",
      title: "The Ask circuit",
      line: "A question, wired end to end.",
      duration: Math.ceil(stepTime(steps.length - 1) + 2.4),
      poster: stepTime(answerIndex) + 0.6,
      render: circuit({
        question: d.question, sequence: d.sequence, rungs: d.rungs, down: d.down,
      }),
      beats: [
        { at: 0.3, text: `A question goes in: "${d.question}"` },
        { at: stepTime(searchIndex), text: "Keyword and meaning search run side by side, then fuse by rank." },
        { at: stepTime(failIndex) - 0.55, text: "The first model is down. The current falls through to the next rung." },
        { at: stepTime(sanitiseIndex), text: "Only links the archive supplied survive, and the sources stream first." },
      ],
      sfx: [{ at: stepTime(failIndex) - 0.55, name: "stamp" }, { at: stepTime(answerIndex), name: "chime" }],
    },
    {
      id: "unfurl-bench",
      sheet: "A-04",
      title: "Unfurl bench",
      line: "What a shared link turns into.",
      duration: UNFURL_START + d.shares.length * UNFURL_CYCLE + 0.4,
      poster: UNFURL_START + 2.9,
      render: unfurl({ shares: d.shares, domain: d.domain }),
      beats: [
        { at: 0.4, text: "Paste a link anywhere: the edge writes the tags before any JavaScript runs." },
        { at: UNFURL_START + UNFURL_CYCLE, text: `${d.pageCards} pages, each with its own committed 1200×630 card. Nothing renders on demand.` },
        { at: UNFURL_START + 2 * UNFURL_CYCLE, text: "A browser runs the app instead, and writes the very same tags." },
      ],
      sfx: d.shares.map((_, i) => ({ at: UNFURL_START + i * UNFURL_CYCLE + 1.45, name: "stamp" })),
    },
    {
      id: "shell-switch",
      sheet: "A-05",
      title: "Shell switch",
      line: "Atlas or Classic, and who decides.",
      duration: SHELL_START + visitors.length * VISIT + 0.6,
      poster: SHELL_START + 2.9,
      render: shell({ rules: d.rules, decide: d.decide, visitors }),
      beats: [
        { at: 0.2, text: "Two shells, one content. Five rules, first match wins, decide which a visitor gets." },
        ...visitors.map((v, i) => {
          const { index, rule, shell: to } = v.decision;
          return {
            at: SHELL_START + i * VISIT + 1.2,
            text: index === d.rules.length - 1
              ? `No rule has an opinion, so ${rule.label} sends them to ${shellName(to)}.`
              : `Rule ${index + 1}, ${rule.label}, sends them to ${shellName(to)}.`,
          };
        }),
      ],
      sfx: visitors.map((_, i) => ({ at: SHELL_START + i * VISIT + 2.2, name: "stamp" })),
    },
    {
      id: "tag-loom",
      sheet: "A-06",
      title: "Tag loom",
      line: "One vocabulary across every shelf.",
      duration: 14.2,
      poster: 6.0,
      render: loom({
        plural: d.plural,
        passes: [
          { layout: withMicro, at: 0.3, until: 7.7, focus: { at: 5.0, tag: topA.name } },
          { layout: withoutMicro, at: 7.9, until: 99, focus: { at: 11.4, tag: topB.name } },
        ],
      }),
      beats: [
        { at: 0.3, text: `One vocabulary for every shelf: ${d.tags.length} tags, ${links.toLocaleString("en-IN")} links.` },
        { at: 5.0, text: `${topA.displayName || topA.name}: ${threadsOf(withMicro, topA.name, d.plural)}.` },
        { at: 7.6, text: "Lift the micro-blog off the loom…" },
        { at: 11.4, text: `…and ${topB.displayName || topB.name} leads: ${threadsOf(withoutMicro, topB.name, d.plural)}.` },
      ],
      sfx: [{ at: 5.0, name: "stamp" }, { at: 11.4, name: "stamp" }],
    },
  ];

  // --- segments -------------------------------------------------------------
  //
  // Each segment renders a frame at time t in either layout, and carries its
  // captions as cues ([{ at, until, text }]) for the subtitle files.

  const cuesOf = (beats, duration) => beats.map((b, i) => ({
    at: b.at, until: beats[i + 1] ? beats[i + 1].at : duration, text: b.text,
  }));

  const chrome = (s, k) => (t, layout) => frame({
    body: s.render(t),
    sheet: s.sheet,
    title: s.title,
    series: `Episode ${pad(k)} / ${pad(total)}`,
    rev: d.rev,
    caption: captionAt(s.beats, t, s.duration),
    headerIn: prog(t, 0, 0.4),
  }, layout);

  const coverRender = cover({ layers: d.layers, riserLayers: Object.keys(ask.layers) });
  const coverBeats = [{ at: 2.2, text: "Six floors, one site: from the page you see to the scripts that build it." }];
  const segments = [{
    id: "cover",
    duration: 7,
    poster: 6.4,
    sfx: [{ at: 5.2, name: "chime" }],
    cues: [{ at: 0.5, until: 2.2, text: "The Blueprint: how sankettambare.in is built, drawn as six sheets." }, ...cuesOf(coverBeats, 7)],
    render: (t, layout) => frame({
      body: coverRender(t), rev: d.rev, border: prog(t, 0, 1.2), caption: captionAt(coverBeats, t, 7),
    }, layout),
  }];

  sheets.forEach((s, i) => {
    const card = episodeCard({
      no: i + 1, total, sheet: s.sheet, title: s.title, line: s.line,
    });
    segments.push({
      id: `card-${s.id}`,
      duration: 2.2,
      poster: 0,
      sfx: [{ at: 0, name: "whoosh" }],
      cues: [{ at: 0, until: 2.2, text: `Episode ${pad(i + 1)}, ${s.title}: ${s.line}` }],
      chapter: { sheet: s.sheet, title: s.title },
      render: (t, layout) => frame({ body: card(t), rev: d.rev }, layout),
    });
    segments.push({
      id: s.id, duration: s.duration, poster: s.poster, sfx: s.sfx, cues: cuesOf(s.beats, s.duration), render: chrome(s, i + 1),
    });
  });

  const end = endCard({ date: d.date, releases: d.releases, rev: d.rev });
  segments.push({
    id: "end",
    duration: 5,
    poster: 3,
    sfx: [{ at: 0, name: "whoosh" }, { at: 1.2, name: "chime" }],
    cues: [{ at: 0.3, until: 5, text: "Every drawing is live: sankettambare.in/blueprint" }],
    render: (t, layout) => frame({ body: end(t), rev: d.rev }, layout),
  });

  // --- the cuts -------------------------------------------------------------

  const cuts = [
    { file: "the-blueprint", title: "The Blueprint", segments: segments.map((s) => s.id), poster: "cover" },
    ...sheets.map((s, i) => ({
      file: `the-blueprint-${pad(i + 1)}-${s.id}`,
      title: `The Blueprint ${pad(i + 1)}: ${s.title}`,
      segments: [`card-${s.id}`, s.id, "end"],
      poster: s.id,
    })),
  ];

  return { segments, cuts };
}
