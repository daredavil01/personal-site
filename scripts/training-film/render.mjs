// The /training film: 60 seconds, vertical, narrated, rendered by Remotion.
//
//   npm run training:film                  data → voice → score → render
//   npm run training:film -- --publish     …then the web copy in public/video/
//   npm run training:film -- --stills      one still per scene, no video
//   npm run training:film -- --frame=12.5  one still at 12.5 s
//   npm run training:film -- --capture     re-shoot the page screenshots first
//
// Steps:
//   1. data.mjs reads the live table and reduces it with the page's modules.
//   2. Each scene's line is spoken (Piper / Aura, scripts/blueprint-film/voice.mjs)
//      and measured; the scenes are sized around their lines to fill 60 s.
//   3. score.mjs synthesises the music to the scene cuts (nothing to license).
//   4. Remotion bundles remotion/index.jsx and renders 1080×1920 at 30 fps.
//   5. --publish: a 720×1280 web encode, poster, captions and chapters to
//      public/video/the-training-story.{mp4,jpg,vtt,json} (committed).
//
// Working files live in gitignored knowledge_base/training-film/. The numbers
// are baked in when it renders: re-run after an import, like the share card.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadFilmData } from "./data.mjs";
import { pickVoice, speak, voiceCredit, wavSeconds } from "../blueprint-film/voice.mjs";
import { renderScore } from "./score.mjs";
import { capture } from "./capture.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const WORK = path.join(ROOT, "knowledge_base", "training-film");
const PUB = path.join(WORK, "public");
const OUT = path.join(WORK, "the-training-story.mp4");
const WEB = path.join(ROOT, "public", "video", "the-training-story");
const FPS = 30;
const SECONDS = 60;
const CHROME = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const fmt = (n) => Math.round(n).toLocaleString("en-GB");

// Numbers as a British narrator says them: Piper reads "1,431" digit-group by
// digit-group and drags, so the script spells them out.
const ONES = ["", ...WORDS.slice(1), "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under100(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}
export function say(nIn) {
  const n = Math.round(nIn);
  if (n === 0) return "zero";
  if (n < 100) return under100(n);
  // 1,100–9,999 the way people say them: "fourteen hundred and thirty-one".
  const hundreds = n >= 1100 && n < 10000 && Math.floor(n / 100) % 10 !== 0 ? Math.floor(n / 100) : null;
  if (n < 1000 || hundreds) {
    const h = hundreds || Math.floor(n / 100);
    const rest = n - h * 100;
    return `${hundreds ? under100(h) : ONES[h]} hundred${rest ? ` and ${under100(rest)}` : ""}`;
  }
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  return `${say(th)} thousand${rest ? `${rest < 100 ? " and" : ","} ${say(rest)}` : ""}`;
}
const millions = (n) => {
  const halves = Math.round(n / 5e5);
  const whole = Math.floor(halves / 2);
  return `${whole ? say(whole) : ""}${halves % 2 ? `${whole ? " and" : ""} a half` : ""} million`.trim();
};

/**
 * The story. `say` is what the narrator speaks, `show` the caption on screen
 * (they differ where a URL or a figure reads better than it sounds). `min` is
 * the least time the scene's motion needs; `weight` shares out spare time.
 */
function script(d) {
  const months = Math.max(1, Math.round((Date.parse(d.calendar.last) - Date.parse(d.calendar.first)) / (30.44 * 86400000)));
  const monthsWord = WORDS[months] || String(months);
  const n = d.numbers;
  const stepsM = n.steps?.n >= 1e6 ? millions(n.steps.n) : null;
  const hour = n.hour?.value || null;
  const day = n.weekday?.value || null;
  const numbersSay = [
    `${say(n.variableCount)} variables become ${say(n.factCount)} facts.`,
    stepsM ? `${stepsM[0].toUpperCase()}${stepsM.slice(1)} steps.` : null,
    hour ? `${hour.replace("am", "a.m.").replace("pm", "p.m.")} starts.` : null,
    day ? `And ${day}s carry the week.` : null,
  ].filter(Boolean).join(" ");
  const numbersShow = [
    `${n.variableCount} variables become ${n.factCount} facts.`,
    n.steps?.n >= 1e6 ? `${(n.steps.n / 1e6).toFixed(1)} million steps.` : null,
    hour ? `${hour} starts.` : null,
    day ? `And ${day}s carry the week.` : null,
  ].filter(Boolean).join(" ");
  return [
    {
      id: "pulse", min: 4.2, weight: 1,
      say: `For ${monthsWord} months, one watch counted every heartbeat.`,
    },
    {
      id: "pile", min: 5.5, weight: 1.2,
      say: `${say(d.totals.count)} activities. ${say(d.totals.km)} kilometres. Walks, runs, hikes, and the gym.`,
      show: `${fmt(d.totals.count)} activities. ${fmt(d.totals.km)} kilometres. Walks, runs, hikes, and the gym.`,
    },
    {
      id: "light", min: 5.5, weight: 1.2,
      say: "In atlas mode, every route comes back as light.",
    },
    {
      id: "calendar", min: 5.5, weight: 1,
      say: `${say(d.calendar.active)} days on the move. ${say(d.calendar.longest)} of them in a row.`,
      show: `${fmt(d.calendar.active)} days on the move. ${fmt(d.calendar.longest)} of them in a row.`,
    },
    {
      id: "day", min: 11, weight: 2.2,
      say: "Pick any day, and it plays again. Ten set out together. One stays at every moment that mattered, all the way to the finish.",
    },
    {
      id: "numbers", min: 9, weight: 1.4,
      say: numbersSay,
      show: numbersShow,
    },
    {
      id: "modes", min: 5.5, weight: 1,
      say: "Watch it as a story, or dig through the tabs.",
    },
    {
      id: "finale", min: 5, weight: 1,
      say: "Every number, straight from the watch. Come and find your day, at sankettambare dot in, slash training.",
      show: "Every number, straight from the watch. Come and find your day: sankettambare.in/training",
    },
  ];
}

const LEAD = 0.45; // seconds of picture before a line starts
const TAIL = 0.5; // and after it ends

/** Speak every line, then size the scenes around them to fill SECONDS. */
async function timeline(scenes) {
  const voice = pickVoice(opt("voice") || null);
  console.log(`Narrator: ${voiceCredit(voice)}`);
  const takes = [];
  for (const s of scenes) {
    // eslint-disable-next-line no-await-in-loop
    const file = await speak(voice, s.say, { ffmpeg: "ffmpeg", dir: path.join(WORK, "voice") });
    takes.push({ file, secs: wavSeconds(file) });
  }
  // Too long for a minute? Speed every line up by the same amount (≤ 1.2×).
  const need = (k) => scenes.reduce((sum, s, i) => sum + Math.max(s.min, LEAD + takes[i].secs / k + TAIL), 0);
  let tempo = 1;
  while (need(tempo) > SECONDS && tempo < 1.2) tempo += 0.01;
  if (need(tempo) > SECONDS) throw new Error(`The narration needs ${need(tempo).toFixed(1)} s even at 1.2× — shorten a line.`);
  fs.mkdirSync(path.join(PUB, "voice"), { recursive: true });
  const lines = takes.map((t, i) => {
    const name = `voice/${scenes[i].id}.wav`;
    const args2 = ["-y", "-i", t.file];
    if (tempo > 1.001) args2.push("-filter:a", `atempo=${tempo.toFixed(3)}`);
    execFileSync("ffmpeg", [...args2, "-ar", "48000", "-ac", "1", path.join(PUB, name)], { stdio: "ignore" });
    return { src: name, secs: wavSeconds(path.join(PUB, name)) };
  });
  const base = scenes.map((s, i) => Math.max(s.min, LEAD + lines[i].secs + TAIL));
  const spare = SECONDS - base.reduce((a, b) => a + b, 0);
  const W = scenes.reduce((a, s) => a + s.weight, 0);
  let at = 0;
  const out = scenes.map((s, i) => {
    const dur = base[i] + (spare * s.weight) / W;
    const from = Math.round(at * FPS);
    at += dur;
    const to = Math.round(at * FPS);
    return {
      id: s.id,
      from,
      dur: to - from,
      line: {
        src: lines[i].src, from: from + Math.round(LEAD * FPS), dur: Math.ceil(lines[i].secs * FPS), text: s.show || s.say,
      },
    };
  });
  // "By the numbers" shows a card per spoken sentence, each landing as its
  // sentence starts (timed by its share of the letters), then the climb once
  // the line has ended. The score hits on the same frames.
  const num = out.find((s) => s.id === "numbers");
  if (num) {
    const said = scenes.find((s) => s.id === "numbers").say.split(/(?<=\.)\s+(?=[A-Z0-9])/);
    const total = said.reduce((a, x) => a + x.length, 0) || 1;
    let acc = 0;
    const lead = num.line.from - num.from;
    num.cards = said.slice(0, 4).map((x) => {
      const at = Math.max(0, Math.round(lead + (acc / total) * num.line.dur) - 4);
      acc += x.length;
      return at;
    });
    num.cards[0] = 0;
    num.cards.push(Math.min(num.dur - 45, lead + num.line.dur + 2));
    // A card stays at least 1.2 s, even when its sentence is short.
    for (let k = 1; k < num.cards.length; k += 1) num.cards[k] = Math.max(num.cards[k], num.cards[k - 1] + 36);
  }
  return { fps: FPS, frames: SECONDS * FPS, tempo, scenes: out, credit: voiceCredit(voice) };
}

function vttTime(frames) {
  const s = frames / FPS;
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = (s % 60).toFixed(3).padStart(6, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Captions: each line split at sentence ends, timed by its share of letters. */
function vtt(tl) {
  const cues = [];
  tl.scenes.forEach(({ line }) => {
    const parts = line.text.match(/[^.!?;:]+[.!?;:]?/g).map((p) => p.trim()).filter(Boolean);
    const total = parts.reduce((s, p) => s + p.length, 0);
    let at = line.from;
    parts.forEach((p) => {
      const dur = Math.round((line.dur * p.length) / total);
      cues.push(`${vttTime(at)} --> ${vttTime(at + dur)}\n${p}`);
      at += dur;
    });
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

async function main() {
  fs.mkdirSync(PUB, { recursive: true });
  // Fonts: the site's own (the share cards' build-time copies).
  ["noto-serif-latin-700-normal.woff", "plus-jakarta-sans-latin-700-normal.woff", "inter-latin-400-normal.woff", "inter-latin-700-normal.woff"]
    .forEach((f) => fs.copyFileSync(path.join(ROOT, "scripts", "og-fonts", f), path.join(PUB, f)));

  if (flag("capture") || !fs.existsSync(path.join(PUB, "shot-atlas.jpg"))) await capture(PUB);

  console.log("Reading the log…");
  const data = await loadFilmData();
  const scenes = script(data);
  const tl = await timeline(scenes);
  console.log(`Scenes: ${tl.scenes.map((s) => `${s.id} ${(s.dur / FPS).toFixed(1)}s`).join(" · ")}${tl.tempo > 1 ? ` (voice ×${tl.tempo.toFixed(2)})` : ""}`);

  fs.writeFileSync(path.join(PUB, "score.wav"), renderScore(tl));
  const props = { data, tl };
  fs.writeFileSync(path.join(WORK, "props.json"), JSON.stringify(props));
  fs.writeFileSync(path.join(WORK, "the-training-story.vtt"), vtt(tl));

  console.log("Bundling…");
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "scripts", "training-film", "remotion", "index.jsx"),
    publicDir: PUB,
    onProgress: () => {},
  });
  const composition = await selectComposition({
    serveUrl, id: "TrainingFilm", inputProps: props, browserExecutable: CHROME,
  });

  const stillAt = async (sec, file) => {
    await renderStill({
      serveUrl, composition, inputProps: props, frame: Math.min(composition.durationInFrames - 1, Math.round(sec * FPS)), output: file, browserExecutable: CHROME,
    });
    console.log(`  ${path.relative(ROOT, file)}`);
  };

  if (opt("frame")) {
    const secs = opt("frame").split(",").map(Number);
    for (const s of secs) await stillAt(s, path.join(WORK, `frame-${s}.png`)); // eslint-disable-line no-await-in-loop
    return;
  }
  if (flag("stills")) {
    for (const s of tl.scenes) {
      // eslint-disable-next-line no-await-in-loop
      await stillAt((s.from + s.dur * 0.7) / FPS, path.join(WORK, `still-${s.id}.png`));
    }
    return;
  }

  console.log("Rendering…");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    crf: 18,
    outputLocation: OUT,
    browserExecutable: CHROME,
    concurrency: Number(opt("concurrency")) || null,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) { last = p; process.stdout.write(`${p * 10}% `); }
    },
  });
  console.log(`\n${path.relative(ROOT, OUT)}`);

  if (flag("publish")) {
    fs.mkdirSync(path.dirname(WEB), { recursive: true });
    execFileSync("ffmpeg", ["-y", "-i", OUT, "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
      "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", `${WEB}.mp4`], { stdio: "ignore" });
    // The poster: the day replay with the group spread along the ridge.
    const day = tl.scenes.find((s) => s.id === "day");
    const posterAt = (day.from + day.dur * 0.82) / FPS;
    execFileSync("ffmpeg", ["-y", "-ss", posterAt.toFixed(2), "-i", OUT, "-frames:v", "1", "-vf", "scale=720:1280:flags=lanczos", "-q:v", "4", `${WEB}.jpg`], { stdio: "ignore" });
    fs.copyFileSync(path.join(WORK, "the-training-story.vtt"), `${WEB}.vtt`);
    const TITLES = {
      pulse: "The watch", pile: "Every activity", light: "Light painting", calendar: "The streak", day: "A day, replayed", numbers: "By the numbers", modes: "Two ways in", finale: "Find your day",
    };
    fs.writeFileSync(`${WEB}.json`, `${JSON.stringify({
      duration: SECONDS,
      narrator: tl.credit,
      chapters: tl.scenes.map((s) => ({ t: Math.round((s.from / FPS) * 10) / 10, title: TITLES[s.id] })),
    }, null, 2)}\n`);
    const mb = fs.statSync(`${WEB}.mp4`).size / 1024 / 1024;
    console.log(`Published public/video/the-training-story.{mp4,jpg,vtt,json} (${mb.toFixed(1)} MB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
