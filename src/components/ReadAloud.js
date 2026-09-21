import React, { useEffect, useState } from "react";
import useViewMode from "../atlas/useViewMode";
import { stopVoice } from "../atlas/audio/sfxBus";

// Devanagari, which on this site means Marathi.
const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * The language to read in, from the text itself.
 *
 * Marathi first, Hindi second: Workers AI has no Marathi voice at all (aura is
 * English and Spanish, MeloTTS is EN/ES/FR/ZH/JA/KO), which is why this feature
 * is the browser's own synthesiser rather than a generated file. Most Android
 * and iOS devices carry hi-IN even when they do not carry mr-IN, and a Marathi
 * sentence read by a Hindi voice is imperfect but intelligible — the
 * alternative for half this archive is silence.
 */
export const langFor = (text) => (DEVANAGARI.test(String(text || "")) ? ["mr", "hi"] : ["en"]);

/** The first voice matching one of `prefixes`, in order of preference. */
export const pickVoice = (voices, prefixes) => prefixes.reduce(
  (found, prefix) => found
    || (voices || []).find((v) => String(v.lang || "").toLowerCase().startsWith(prefix))
    || null,
  null,
);

/**
 * "Read this" — no model, no neurons, no endpoint.
 *
 * Renders nothing when the device has no voice for the text's language, so a
 * Marathi reader never meets a button that does nothing. Nothing is sent
 * anywhere: SpeechSynthesis is the browser's own.
 *
 * Atlas mode only. Sound belongs to the world — classic view is the quiet
 * shell and gets no audio control of any kind, the same rule that keeps the
 * guide and the ambient beds inside AtlasFrame.
 */
const ReadAloud = ({ text, className = "" }) => {
  const mode = useViewMode();
  const [voice, setVoice] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth || !String(text || "").trim()) return undefined;

    // getVoices() is empty until the list loads on most browsers, so this runs
    // once now and again on the event.
    const read = () => setVoice(pickVoice(synth.getVoices(), langFor(text)));
    read();
    synth.addEventListener("voiceschanged", read);
    return () => {
      synth.removeEventListener("voiceschanged", read);
      synth.cancel();
    };
  }, [text]);

  if (!voice || mode !== "atlas") return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    // One voice at a time: silence the guide (and any other utterance) first.
    stopVoice();
    const utterance = new window.SpeechSynthesisUtterance(String(text));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      }}
      title={`Read aloud (${voice.lang})`}
      className={`inline-flex items-center gap-1.5 cursor-pointer font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors ${className}`}
    >
      <span aria-hidden="true">{speaking ? "■" : "▶"}</span>
      {speaking ? "Stop" : "Read aloud"}
    </div>
  );
};

export default ReadAloud;
