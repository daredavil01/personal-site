import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import Scrolly from "../components/Logbook/Scrolly";
import AtlasLens from "../components/Logbook/AtlasLens";
import SkyLens from "../components/Logbook/SkyLens";
import FingerprintLens from "../components/Logbook/FingerprintLens";
import PhrasesLens from "../components/Logbook/PhrasesLens";
import LettersLens from "../components/Logbook/LettersLens";
import PoemMachine from "../components/Logbook/PoemMachine";
import PostDrawer from "../components/Logbook/PostDrawer";
import { fmt, langProps, shortDate, textLang } from "../components/Logbook/shared";
import "../components/Logbook/logbook.css";

// /logbook — every essay read as data. public/data/logbook.json is built by
// `npm run logbook` from the post text and the /ask embeddings; this page only
// draws it. The lens and the selected essay live in ?lens= and ?post=, merged
// into the existing params so ?view= (the shell switch) survives.

const LENSES = [
  { id: "atlas", label: "Atlas", what: "What I write about, as a map", Lens: AtlasLens },
  { id: "sky", label: "Sky", what: "Opening lines as constellations", Lens: SkyLens },
  { id: "fingerprint", label: "Fingerprint", what: "Each essay's punctuation and rhythm", Lens: FingerprintLens },
  { id: "phrases", label: "Phrases", what: "The words I keep reaching for", Lens: PhrasesLens },
  { id: "letters", label: "Letters", what: "My past self, answered", Lens: LettersLens },
  { id: "poem", label: "Found poems", what: "Lines cut from the archive", Lens: PoemMachine },
];

const useLogbook = () => {
  const [state, setState] = useState({ data: null, error: false });
  useEffect(() => {
    let alive = true;
    fetch("/data/logbook.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => { if (alive) setState({ data, error: false }); })
      .catch(() => { if (alive) setState({ data: null, error: true }); });
    return () => { alive = false; };
  }, []);
  return state;
};

const Logbook = () => {
  const { data, error } = useLogbook();
  const [searchParams, setSearchParams] = useSearchParams();
  const explorerRef = useRef(null);

  const lensId = LENSES.some((l) => l.id === searchParams.get("lens")) ? searchParams.get("lens") : "atlas";
  const lens = LENSES.find((l) => l.id === lensId);
  const byId = useMemo(() => new Map(((data && data.posts) || []).map((p) => [p.id, p])), [data]);
  const selected = byId.get(searchParams.get("post")) || null;

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value == null) params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
  };
  const select = (id) => setParam("post", id);
  const explore = (id = lensId) => {
    setParam("lens", id);
    if (explorerRef.current) explorerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const t = data ? data.totals : null;

  return (
    <PageShell region="writer">
      <div className="lb-root flex flex-col gap-10 w-full">
        <header className="lb-sheet px-6 py-8 md:px-12 md:py-12 flex flex-col gap-4">
          <p className="font-label text-[10px] uppercase tracking-[0.3em] font-bold lb-accent m-0">Scriptorium · Logbook</p>
          <h1 className="font-headline text-4xl md:text-6xl font-black lb-ink m-0 leading-none">Wanderer&apos;s Logbook</h1>
          <p className="font-body text-base md:text-lg lb-ink m-0 max-w-2xl">
            {t
              ? `${fmt(t.posts)} essays and ${fmt(t.words)} words, ${t.firstYear} to ${t.lastYear}, in English and Marathi, read the way a machine reads them: by shape, by rhythm and by meaning. Every mark below is an essay, and every one opens.`
              : "Every essay I have published, in English and Marathi, read the way a machine reads them: by shape, by rhythm and by meaning."}
          </p>
          <nav aria-label="Lenses" className="flex flex-wrap gap-2 mt-1">
            {LENSES.map((l) => (
              <button key={l.id} type="button" onClick={() => explore(l.id)} className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5">
                {l.label}
              </button>
            ))}
          </nav>
        </header>

        {error && (
          <p role="status" className="lb-panel font-body text-sm lb-soft px-4 py-3 m-0">
            The logbook data did not load. The essays themselves are on the <a href="/100-days-to-offload">100 Days page</a>.
          </p>
        )}

        {data && <Scrolly data={data} onExplore={() => explore("atlas")} />}

        {data && (
          <section ref={explorerRef} id="lb-explorer" aria-label="Explore the logbook" className="flex flex-col gap-4 scroll-mt-20">
            <div role="tablist" aria-label="Lens" className="flex flex-wrap gap-2">
              {LENSES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={l.id === lensId}
                  aria-controls="lb-lens"
                  onClick={() => setParam("lens", l.id)}
                  className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="font-body text-sm lb-soft m-0">{lens.what}</p>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
              <div id="lb-lens" role="tabpanel" aria-label={lens.label} className="min-w-0">
                <lens.Lens data={data} byId={byId} selected={selected} onSelect={select} />
              </div>
              <PostDrawer key={selected ? selected.id : "none"} post={selected} byId={byId} onSelect={select} onClose={() => select(null)} />
            </div>
          </section>
        )}

        {data && (
          <details className="lb-panel px-4 py-3">
            <summary className="font-label text-[11px] uppercase tracking-wider lb-soft cursor-pointer">
              {`Every essay as a list (${data.posts.length})`}
            </summary>
            <ol className="list-none p-0 m-0 mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[...data.posts].reverse().map((p) => (
                <li key={p.id} className="flex items-baseline gap-2 font-body text-sm">
                  <span className="lb-soft text-xs whitespace-nowrap">{shortDate(p.date)}</span>
                  <button type="button" onClick={() => select(p.id)} className="text-left lb-ink hover:underline bg-transparent border-0 p-0 cursor-pointer">
                    <span {...langProps(textLang(p.title))}>{p.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}

        <p className="font-body text-xs lb-soft m-0 max-w-3xl">
          How this is made: the text of every post on Substack and WordPress is read at build time and reduced to
          counts, punctuation, sentence lengths, recurring phrases and single sentences that each link back to the
          essay. The map places essays by the same multilingual embeddings the Ask page searches, projected flat with
          UMAP, so an English and a Marathi essay about the same hills sit side by side. Rebuilt with{" "}
          <code>npm run logbook</code>.
        </p>
      </div>
    </PageShell>
  );
};

export default Logbook;
