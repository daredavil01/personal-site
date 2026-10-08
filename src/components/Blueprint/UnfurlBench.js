import React, { useMemo, useState } from "react";
import { ROUTE_MANIFEST } from "../../data/routeManifest";
import {
  OG_IMAGE, PAGE_META, SITE_URL, composeTitle,
} from "../../data/pageMeta";
import { cardUrlForOrigin, isCardImage } from "../../lib/og/paths";

// Sheet A-04: what happens when a link to this site is pasted somewhere.
// Pick a route and who opens it. Both get the same HTML — the edge middleware
// injects the og: tags into every page — and then they part: a preview bot
// reads the tags and fetches the card, a browser runs the app, whose Helmet
// tags are identical tag for tag. The card shown is the real committed PNG,
// re-hosted onto this origin exactly the way the middleware does it.

const ROUTES = ROUTE_MANIFEST
  .filter((r) => r.og.strategy === "page" && r.indexable && PAGE_META[r.path])
  .map((r) => ({ path: r.path, meta: PAGE_META[r.path] }));

const DEFAULT_PATH = ROUTES.some((r) => r.path === "/blueprint") ? "/blueprint" : ROUTES[0].path;
const DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

const Node = ({
  x, y, w, title, sub, lit,
}) => (
  <g>
    <rect x={x} y={y} width={w} height="46" className={`${lit ? "bp-fill-red-soft bp-stroke-red" : "bp-fill-paper bp-stroke-faint"}`} strokeWidth={lit ? 2 : 1.4} />
    <text x={x + w / 2} y={y + 20} textAnchor="middle" className={`bp-svg-label ${lit ? "bp-fill-red" : "bp-fill-soft"}`} fontSize="11">{title}</text>
    <text x={x + w / 2} y={y + 36} textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="10">{sub}</text>
  </g>
);

const Pipe = ({ d, lit }) => (
  <path d={d} fill="none" className={lit ? "bp-stroke-red bp-flow" : "bp-stroke-faint"} strokeWidth={lit ? 2.4 : 1.5} />
);

const Flow = ({ path, slug, actor }) => {
  const bot = actor === "bot";
  const shown = path.length > 22 ? `${path.slice(0, 21)}…` : path;
  return (
    <svg viewBox="0 0 440 470" className="w-full h-auto block" role="img" aria-label={`How ${path} is served to ${bot ? "a link-preview bot" : "a reader's browser"}`}>
      <Pipe d="M220,56 V84" lit />
      <Pipe d="M220,130 V158" lit />
      <Pipe d="M220,204 V232 H115 V262" lit={bot} />
      <Pipe d="M220,232 H325 V262" lit={!bot} />
      <Pipe d="M115,308 V336" lit={bot} />
      <Pipe d="M325,308 V336" lit={!bot} />
      <Pipe d="M115,382 V410" lit={bot} />
      <Pipe d="M325,382 V410" lit={!bot} />
      <circle cx="220" cy="232" r="4" className="bp-fill-ink" />

      <Node x={100} y={10} w={240} title={`GET ${shown}`} sub="any client, same response" lit />
      <Node x={100} y={84} w={240} title="Cloudflare Pages" sub="serves the SPA's index.html" lit />
      <Node x={100} y={158} w={240} title="_middleware.js" sub="HTMLRewriter adds the og: tags" lit />

      <Node x={20} y={262} w={190} title="Preview bot" sub="reads the tags, runs no JS" lit={bot} />
      <Node x={20} y={336} w={190} title={`/og/${slug}.png`} sub={`${OG_IMAGE.width} × ${OG_IMAGE.height}, committed`} lit={bot} />
      <Node x={20} y={410} w={190} title="Link preview" sub="card, title, description" lit={bot} />

      <Node x={230} y={262} w={190} title="Browser" sub="loads the bundle" lit={!bot} />
      <Node x={230} y={336} w={190} title="React + PageMeta" sub="Helmet: the same tags" lit={!bot} />
      <Node x={230} y={410} w={190} title="The page" sub="either shell" lit={!bot} />
    </svg>
  );
};

const ChatPreview = ({ url, image, title, description, alt, thumb }) => (
  <div className="bp-fade-in flex flex-col gap-1.5 rounded-xl p-2 bp-panel" style={{ maxWidth: thumb ? 300 : 440, width: "100%" }}>
    <p className="bp-mono text-[11px] bp-red m-0 px-1 break-all">{url}</p>
    <div className="rounded-lg overflow-hidden border bp-rule">
      <img src={image} alt={alt} width={OG_IMAGE.width} height={OG_IMAGE.height} className="block w-full h-auto" loading="lazy" />
      <div className="p-2.5 flex flex-col gap-0.5">
        <p className="bp-mono text-[9px] uppercase tracking-[0.2em] bp-soft m-0">{DOMAIN}</p>
        <p className="font-body text-sm font-bold bp-ink m-0 leading-snug">{title}</p>
        <p className="font-body text-xs bp-soft m-0 leading-snug line-clamp-2">{description}</p>
      </div>
    </div>
  </div>
);

const BrowserPreview = ({ url, title }) => (
  <div className="bp-fade-in bp-panel rounded-xl overflow-hidden w-full" style={{ maxWidth: 440 }}>
    <div className="flex items-center gap-2 px-3 py-2 border-b bp-rule">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full border bp-rule" />)}
      </span>
      <span className="font-body text-xs bp-ink truncate border bp-rule rounded-lg px-2 py-0.5 max-w-[70%]">{title}</span>
    </div>
    <p className="bp-mono text-[11px] bp-soft m-0 px-3 py-1.5 border-b bp-rule break-all">{url}</p>
    <div className="p-3 flex flex-col gap-2" aria-hidden="true">
      <span className="block h-3 w-2/3" style={{ background: "var(--bp-ink-faint)" }} />
      <span className="block h-2 w-full" style={{ background: "var(--bp-ink-faint)" }} />
      <span className="block h-2 w-5/6" style={{ background: "var(--bp-ink-faint)" }} />
      <span className="block h-16 w-full border border-dashed bp-rule" />
    </div>
    <p className="bp-mono text-[10px] bp-soft m-0 px-3 pb-3">
      The app boots and PageMeta writes the very same tags, so a later share from inside the
      app can never contradict the first one.
    </p>
  </div>
);

const UnfurlBench = () => {
  const [path, setPath] = useState(DEFAULT_PATH);
  const [actor, setActor] = useState("bot");
  const [thumb, setThumb] = useState(false);

  const { meta } = ROUTES.find((r) => r.path === path) || ROUTES[0];
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  const image = cardUrlForOrigin(meta.image, origin, SITE_URL);
  const title = composeTitle(meta.title);
  const canonical = `${SITE_URL}${path === "/" ? "" : path}`;

  const tags = useMemo(() => [
    { text: `<title>${title}</title>` },
    { text: `<meta property="og:title" content="${title}">` },
    { text: `<meta property="og:description" content="${meta.description}">` },
    { text: `<meta property="og:url" content="${canonical}">` },
    { text: `<meta property="og:image" content="${image}">`, key: true },
    ...(isCardImage(image) ? [
      { text: `<meta property="og:image:width" content="${OG_IMAGE.width}">` },
      { text: `<meta property="og:image:height" content="${OG_IMAGE.height}">` },
    ] : []),
    { text: `<meta property="og:type" content="${meta.type}">` },
    { text: '<meta name="twitter:card" content="summary_large_image">' },
  ], [title, meta, canonical, image]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel flex flex-wrap items-center gap-3 p-3">
        <label htmlFor="bp-unfurl-route" className="flex items-center gap-3">
          <span className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-red">Share</span>
          <select
            id="bp-unfurl-route"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="bp-mono text-xs bp-ink bg-transparent border bp-rule px-2 py-1.5 min-w-[11rem]"
          >
            {ROUTES.map((r) => (
              <option key={r.path} value={r.path}>{r.path}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-1" role="group" aria-label="Who opens the link">
          {[{ id: "bot", label: "Preview bot" }, { id: "reader", label: "Reader" }].map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={actor === a.id}
              onClick={() => setActor(a.id)}
              className="bp-chip bp-chip-red bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5"
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={thumb}
          onClick={() => setThumb((v) => !v)}
          disabled={actor !== "bot"}
          className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 disabled:opacity-40"
        >
          {`${thumb ? "●" : "○"} 300 px thumbnail`}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        <Flow path={path} slug={meta.ogSlug} actor={actor} />
        <div className="flex flex-col gap-4 items-start min-w-0">
          {actor === "bot"
            ? (
              <ChatPreview
                key={`${path}-${thumb}`}
                url={canonical}
                image={image}
                title={title}
                description={meta.description}
                alt={meta.imageAlt || meta.description}
                thumb={thumb}
              />
            )
            : <BrowserPreview key={path} url={canonical} title={title} />}

          <div className="w-full min-w-0">
            <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink mb-1.5">
              What both of them receive in &lt;head&gt;
            </p>
            <pre className="bp-panel bp-mono text-[10.5px] leading-relaxed p-3 m-0 whitespace-pre-wrap break-all">
              {tags.map((t) => (
                <span key={t.text} className={`block ${t.key ? "bp-red" : "bp-ink"}`}>{t.text}</span>
              ))}
            </pre>
            <p className="font-body text-xs bp-soft mt-2 mb-0">
              PNG at {OG_IMAGE.width}×{OG_IMAGE.height}, because WhatsApp, Facebook, LinkedIn, X, Slack and
              iMessage all reject SVG. The size is declared only for these cards, never for a row's own
              photo. Switch on the thumbnail: a card has to survive being shown 300 px wide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnfurlBench;
