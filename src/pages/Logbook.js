import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import Cover from "../components/Logbook/Cover";
import Prologue from "../components/Logbook/Prologue";
import {
  Chapter, ChapterDock, Contents, chapterById, sectionId, useCurrentChapter,
} from "../components/Logbook/Chapters";
import AtlasLens from "../components/Logbook/AtlasLens";
import SkyLens from "../components/Logbook/SkyLens";
import FingerprintLens from "../components/Logbook/FingerprintLens";
import PhrasesLens from "../components/Logbook/PhrasesLens";
import LettersLens from "../components/Logbook/LettersLens";
import PoemMachine from "../components/Logbook/PoemMachine";
import EntryIndex from "../components/Logbook/EntryIndex";
import EntrySheet from "../components/Logbook/EntrySheet";
import { prefersReducedMotion } from "../components/Logbook/shared";
import { startsLikeSentence } from "../lib/logbook";
import "../components/Logbook/logbook.css";

// /logbook — every essay read as data, bound as a field journal: a cover, a
// five-step prologue, a contents page, six chapters (Atlas, Sky, Fingerprint,
// Phrases, Letters, Found poems), an index, and any essay opened as a page of
// its own. public/data/logbook.json is built by `npm run logbook` from the
// post text and the /ask embeddings; this page only draws it.
//
// The open essay lives in ?post=, the chapter last jumped to in ?lens= (the
// old tab name, so earlier links still land), the poem in ?poem= and ?lock=
// — all merged into the existing params so ?view= (the shell switch) survives.

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Tiro+Devanagari+Marathi:ital@0;1&display=swap";

const INTROS = {
  atlas: "Essays sit beside the ones that say similar things — placed by the same multilingual embeddings the Ask page searches, laid flat — so an English essay and a Marathi one about the same hills share a coast. Hover to read a first line; open one to see its three nearest neighbours.",
  sky: "Every essay's first sentence, drawn after Nicholas Rougeux's Literary Constellations: one star per word, larger for longer words, turning hardest where the words carry meaning. No two openings make the same shape.",
  fingerprint: "Take the words away and an essay still has a shape. Its punctuation, laid along a spiral in reading order — full stops in ink, commas in pencil, exclamation marks in red, questions in teal — after Stefanie Posavec and Between the Words.",
  phrases: "The phrases I reach for without noticing. A phrase only counts once it turns up in several different essays, so these are habits, not subjects.",
  letters: "A sentence from years ago, and the recent sentence closest to it in meaning. Nobody chose these pairs: the embeddings matched them, at least eighteen months apart, sometimes across languages.",
  poem: "Five sentences from five essays, shuffled until they read as one poem. Keep the lines you like and shuffle the rest; the address bar is always a link to the poem in front of you.",
};

// Chapters re-render only when their own inputs change, not on every page turn.
const Atlas = memo(AtlasLens);
const Sky = memo(SkyLens);
const Fingerprint = memo(FingerprintLens);
const Phrases = memo(PhrasesLens);
const Letters = memo(LettersLens);
const Index = memo(EntryIndex);

const EMPTY = [];

// The sentence rule is applied again here, so a file built before the rule
// was tightened never deals a fragment into the game or a poem.
const useLogbook = () => {
  const [state, setState] = useState({ data: null, error: false });
  useEffect(() => {
    let alive = true;
    fetch("/data/logbook.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw) => {
        const data = { ...raw, lines: (raw.lines || []).filter((l) => startsLikeSentence(l.s)) };
        if (alive) setState({ data, error: false });
      })
      .catch(() => { if (alive) setState({ data: null, error: true }); });
    return () => { alive = false; };
  }, []);
  return state;
};

const scrollToId = (id, smooth = true) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto", block: "start" });
};

const Logbook = () => {
  const { data, error } = useLogbook();
  const [searchParams, setSearchParams] = useSearchParams();
  const setRef = useRef(setSearchParams);
  setRef.current = setSearchParams;

  const posts = data ? data.posts : EMPTY;
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const order = useMemo(() => new Map(posts.map((p, i) => [p.id, i])), [posts]);
  const selected = byId.get(searchParams.get("post")) || null;

  const setParam = useCallback((key, value) => {
    setRef.current((prev) => {
      const params = new URLSearchParams(prev);
      if (value == null) params.delete(key);
      else params.set(key, value);
      return params;
    }, { replace: true });
  }, []);
  const select = useCallback((id) => setParam("post", id), [setParam]);
  const close = useCallback(() => setParam("post", null), [setParam]);
  const jump = useCallback((id) => {
    setParam("lens", id);
    scrollToId(sectionId(id));
  }, [setParam]);
  const random = useCallback(() => {
    if (posts.length) select(posts[Math.floor(Math.random() * posts.length)].id);
  }, [posts, select]);

  // An old ?lens= link lands on its chapter once the chapters are drawn.
  const landed = useRef(false);
  useEffect(() => {
    if (!data || landed.current) return;
    landed.current = true;
    const lens = new URLSearchParams(window.location.search).get("lens");
    if (chapterById(lens)) window.requestAnimationFrame(() => scrollToId(sectionId(lens), false));
  }, [data]);

  const current = useCurrentChapter(!!data);

  return (
    <PageShell region="writer">
      <Helmet>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </Helmet>
      <div className="lb-root flex flex-col gap-16 md:gap-24 w-full pb-16">
        <Cover
          data={data}
          onBegin={() => scrollToId("lb-prologue")}
          onContents={() => scrollToId("lb-contents")}
          onRandom={random}
        />

        {error && (
          <p role="status" className="lb-card font-body text-sm lb-soft px-4 py-3 m-0">
            The logbook did not load. The essays themselves are on the <a href="/100-days-to-offload" className="lb-link">100 Days page</a>.
          </p>
        )}
        {!data && !error && (
          <p role="status" className="lb-italic text-2xl lb-soft text-center m-0">Opening the logbook…</p>
        )}

        {data && (
          <>
            <Prologue data={data} onSelect={select} onDone={() => scrollToId("lb-contents")} />
            <Contents data={data} onJump={jump} />

            <Chapter id="atlas" intro={INTROS.atlas}>
              <div className="lb-cq"><Atlas data={data} selected={selected} onSelect={select} /></div>
            </Chapter>
            <Chapter id="sky" intro={INTROS.sky}>
              <div className="lb-cq"><Sky data={data} onSelect={select} /></div>
            </Chapter>
            <Chapter id="fingerprint" intro={INTROS.fingerprint}>
              <div className="lb-cq"><Fingerprint data={data} onSelect={select} /></div>
            </Chapter>
            <Chapter id="phrases" intro={INTROS.phrases}>
              <div className="lb-cq"><Phrases data={data} byId={byId} onSelect={select} /></div>
            </Chapter>
            <Chapter id="letters" intro={INTROS.letters}>
              <div className="lb-cq"><Letters data={data} byId={byId} onSelect={select} /></div>
            </Chapter>
            <Chapter id="poem" intro={INTROS.poem}>
              <div className="lb-cq"><PoemMachine data={data} byId={byId} onSelect={select} /></div>
            </Chapter>
            <Chapter id="index">
              <div className="lb-cq"><Index data={data} onSelect={select} /></div>
            </Chapter>

            <footer className="flex flex-col gap-3 max-w-3xl">
              <div className="lb-orn"><span className="lb-italic text-lg">Colophon</span></div>
              <p className="font-body text-[13px] leading-relaxed lb-soft m-0">
                The text of every post on Substack and WordPress is read at build time and reduced to counts,
                punctuation, sentence lengths, recurring phrases, and single sentences that each link back to their
                essay — never a paragraph. The chart places essays by the same multilingual embeddings the Ask page
                searches, projected flat with UMAP, so an English and a Marathi essay about the same hills sit side by
                side; its territories are k-means regions named by their tags. Set in Instrument Serif and Tiro
                Devanagari Marathi. Rebuilt with <code>npm run logbook</code>.
              </p>
            </footer>
          </>
        )}
      </div>

      {data && <ChapterDock current={current} hidden={!!selected} onJump={jump} />}
      {selected && (
        <EntrySheet
          post={selected}
          data={data}
          byId={byId}
          index={order.get(selected.id)}
          onSelect={select}
          onClose={close}
        />
      )}
    </PageShell>
  );
};

export default Logbook;
