# The Wanderer's Atlas — Build Log & Anecdotes

> A narrative companion to the build bible. Where
> [`wanderers-atlas-redesign-plan.md`](wanderers-atlas-redesign-plan.md) is the
> authoritative *spec* (the what and the how), this file is the *story*: how the
> redesign was actually prompted turn by turn, and — highlighted throughout —
> the **key user choices** that steered it. A rendered, illustrated version of
> the same story lives in `atlas-features.html` at the repo root.
>
> The redesign shipped as **v11.0.0** (2026-07-10) — sixteen phases landing in
> one comprehensive changelog entry — followed by **v11.1.0** (2026-07-11), the
> mobile-view fixes. See `src/data/changelog.md`.

Every quote below is a real instruction from Sanket, in order. The **▶ Key
choice** callouts mark the decisions that shaped everything downstream.

---

## Key user choices at a glance

| # | Moment | The choice |
|---|---|---|
| 1 | The method | **Ask everything, assume nothing** — brainstorm and clarify every feature *before* any code. |
| 2 | Plan first | **Write the whole design to an `.md` in `docs/`, then build in phases** — don't build all at once. |
| 3 | Direction | **Living Atlas** (globe orbit → cinematic dive → illustrated map hub) over three declined alternatives. |
| 4 | Game depth | HUD + quests + passport — **no walkable avatar** (explorable, but nobody gets lost). |
| 5 | Breadth | **Rebuild every page** as a region interior; the **data layer stays untouched**. |
| 6 | Escape hatch | Skip intro always visible; remembered Atlas/Classic preference; **reduced-motion auto-lands in Classic**. |
| 7 | Art style | **Flat vector, authored as inline-JSX SVG** (for CSS-var theming + per-element life). |
| 8 | Sound | Ambient per biome + micro-SFX, **off by default**, hand-rolled WebAudio — no library. |
| 9 | Guide | A mini illustrated Sanket — **replaces react-joyride**. |
| 10 | Chrome | A world HUD replaces the nav, sidebar and footer in atlas mode. |
| 11 | Day / night | Auto from the visitor's local hour + a manual toggle, **coupled to the theme**. |
| 12 | Name | **The Wanderer's Atlas** — tying to the Substack identity. |
| 13 | Rollout | **One long-running branch** behind an `ATLAS_LIVE` flag + hidden `/world` preview, flipped live at the end. |
| 14 | Changelog | **Silent through the dark build**, so the flip lands one comprehensive entry. |
| 15 | Art gate | A **cheap concept-board approval** before any real biome art. |
| 16 | Pace | Later phases run **in parallel** ("4, 5, 6 simultaneously"; "7, 8, 9, 10") — and **commit directly**, no design gate, once the pattern was proven. |
| 17 | Naming (at the flip) | **Keep the plain names** — Classic nav stays "Mind Map" / "Interactive Me"; the Atlas keeps "Observatory" / "Gallery Trail" only internally. |
| 18 | Rollout (at the flip) | **Push the branch, don't merge** — let the Cloudflare preview rebuild with the Atlas live; `main` stays Sanket's own call. |
| 19 | Mobile | **All six worlds in one window**, scene **centered** — desktop untouched. |

---

## Act I — Decide before you build

> 💬 *"I want to completely redesign this website… an animated site where the
> user navigates a gamified experience. The homepage should be a bright
> experience where the user enters a personal world — first a globe, then you
> zoom in and click to enter, and the world prompts you to browse. Brainstorm,
> explore every creative idea, ask every possible question for every small
> feature, and clarify everything — don't assume."*

> **▶ Key choice — The method.** *Ask everything, assume nothing.* This one
> instruction set the entire tone: the session read the whole `docs/` folder and
> mapped the existing site — the homepage globe, the six content domains, the
> design tokens — before proposing anything.

> 💬 *"This should be a completely redesigned experience — explore the ideas on
> the web for more detailed exploration."*

A research pass surveyed explorable web worlds — Bruno Simon's drivable
portfolio, Jordan Breton's floating island, cozy Zelda-like navigators, Stripe's
globe — and pulled out the guardrails that separate a delightful world from a
frustrating one: don't trap goal-driven visitors, treat mobile as a first-class
tier, keep the real content crawlable beneath the spectacle, make sound strictly
opt-in.

Then came the long part — a clarifying loop where **every** creative decision was
put as an explicit question and answered one at a time. Twenty-odd choices, none
assumed:

> **▶ Key choices — The sixteen creative decisions.** Direction (Living Atlas);
> game depth (HUD + quests + passport, no avatar); breadth (full rebuild, data
> unchanged); the escape hatch; flat-vector inline-SVG art; a ~3.5s skippable
> GSAP dive; sound off by default; a mini-Sanket guide replacing joyride; the
> world HUD; legacy pages kept at their URLs (`/mindmap` → Observatory,
> `/interactive-me` → Gallery Trail); day/night auto + toggle; and the world's
> name — **The Wanderer's Atlas**. (Full table: plan §2.)

> 💬 *"Only export the detailed plan to an md file under the docs folder — we'll
> build in phases."*

> **▶ Key choice — Plan first, build in phases.** The whole design was written
> down as a build bible — vision, six regions, architecture, file map, the
> sixteen-phase plan, risks, and a verification playbook — to be executed
> deliberately rather than all at once.

> 💬 *"Ask questions first."*

> **▶ Key choices — The four workflow decisions.** One more question round set
> the rules of the build: **one long-running branch** behind the `ATLAS_LIVE`
> flag; a **silent changelog** until the flip; a cheap **concept-board gate**
> before any real art; and audio sourced under permissive licences. (Plan §10.)

---

## Act II — The dark build, phase by phase

> 💬 *"Start with phase 0."* · *"Study this plan and start implementation of
> phase 0."*

**Phase 0 — clear the ground.** Demolition done carefully: a decade-old
vendored stylesheet came out partial by partial, but only after every rule was
*proven* dead — the CSS compiled and diffed before/after (the new output a pure
subset, 424 rules removed and none added), each orphaned selector tested against
the live pages. The entry stylesheet shed roughly a third of its weight; the
first green commit landed.

> 💬 *"Start implementation of phase 1 and phase 2."* · *"Finish phase 2 of
> plan."*

**Phases 1–2 — foundation + frame.** Phase 1 laid what no visitor sees: one
versioned `atlas.v1` localStorage key, a pure and tested migration that carries a
returning visitor's old globe visits into the new passport, the synchronous
view-mode resolver, and a hidden *noindexed* `/world` preview. Phase 2 raised the
frame: the day/night tokens, the world HUD, and the one-way switch tying the
scene's daylight to the site's dark mode so the two can never disagree.

> 💬 *"Start with phase 3 of plan now, give me designs to approve."*

> **▶ Key choice — The art gate in action.** Rather than draw the map, the
> session drew a **concept board**: the six regions corner to corner with the
> **Book Forest** worked up to full detail as the benchmark, a working sun/moon
> that repainted the whole scene live, every colour pulled straight from the
> shipped `--atlas-*` tokens — so what was approved was exactly what the code
> would produce.

> 💬 *"Approved."*

The art direction locked in a single word, and the hub was built for real:
`usePanZoom` promoted to a shared home (shim left behind), the six biomes as
inline SVG, `WorldMap` stacking them in layer order, and an accessibility spine
under the spectacle — an offscreen `<nav>` of six real links as the single source
of truth, roving tabindex, arrow keys walking the regions in geographic order.

> 💬 *"Finish phase 3 — just commit code directly."*

> **▶ Key choice — Trust the pattern; commit directly.** With the concept board
> approved and the phase discipline proven, the design-approval gate was dropped
> for the rest of the build. The map came up clean on the first drive; eighty-nine
> tests green, the entry bundle unmoved.

---

## Act III — Parallel waves to the finish

> 💬 *"Start with phase 4, 5, 6 simultaneously."*

> **▶ Key choice — Run phases in parallel.** Three phases in one sitting.
> **Phase 4** put the arrival in front of the map — `OrbitStage` reusing the
> globe in a new `orbit` mode, `CloudBloom` + `DiveSequence` as one GSAP timeline,
> the whole `orbit → dive → map` machine, GSAP loading only if you actually dive.
> **Phase 5** raised the first interior via `RegionShell` + `PageShell` (Book
> Forest first; a visit stamps the region with confetti). **Phase 6** added the
> game — a pure, tested quest engine, the passport, and five easter eggs baked
> into the map art. Green: 101 tests, twelve new ones pinning the engine.

> 💬 *"Start with phase 7, 8, 9, 10."*

**The page waves.** Every remaining route rebuilt as its region's interior, four
phases in a row: the Coastal Road + Sahyadri Ridge (7), the Scriptorium trio (8),
the Workshop (9), and Hometown Square with the Observatory and Gallery Trail at
their same URLs (10). Each page changed by exactly one import and one wrapper
line, its content identical inside either shell — and each wave brought a collector
quest, so the passport kept growing: Roadrunner, Summiteer, Wordsmith, Tinkerer.

> 💬 *"Finish till phase 10 and verify."*

> **▶ Key choice — Verify in a real browser.** The last two waves landed as green
> commits, and then the world was driven end to end in a live browser: the orbit's
> counting teasers, *Enter* into the dive, the map waking at night with lit windows
> and stars, a deep-linked Book Forest interior with its breadcrumb and Return-to-Map,
> the passport filling with dated stamps and live quest progress. No console errors.

> 💬 *"Start with phase 11, 12 and 13."*

**Phases 11–13.** Final biome art, parallax and idle animation, and the budget
pass (11); a hand-rolled ~150-line WebAudio manager whose seven beds and SFX
sprite are *procedurally synthesised* at build time — the repo owns its audio
(12); the illustrated mini-Sanket guide retiring react-joyride (13, its ~92 KB
chunk gone).

> 💬 *"Start with phase 14 and finish phase 15."*

> **▶ Key choice — Keep the plain names.** Asked how the two renamed pages should
> read once live, the answer kept the Classic nav plain — "Mind Map" and
> "Interactive Me" — while the Atlas keeps "Observatory" and "Gallery Trail" only
> internally, matching the earlier Marathons / Treks / Projects rename rather than
> reversing it.

> **▶ Key choice — Push, don't merge.** The flip was committed and the branch
> pushed so the Cloudflare preview could rebuild with the Atlas live, but `main`
> was left untouched — the final production merge kept as Sanket's own call after
> reviewing the preview.

**Phase 14 — cleanup** deleted the decade-old vendored theme outright: 28 SCSS
partials and the `sass` dependency gone (the entry stylesheet fell 164 → 102 KB
raw, 25.9 → 15.9 KB gz), a small scoped `classic.css` left for the escape-hatch
shell. A quiet bug fell out with it — `rounded-full`, overridden to `0.75rem`,
had silently squared off every avatar, icon button and tag pill; it was restored
to a true `9999px`, and the changelog's force-uppercased headings healed the
moment the theme left. **Phase 15 — the flip** set `ATLAS_LIVE = true`: the Atlas
became the front door at `/`, `/world` began redirecting home (a 301 at the edge),
and the deliberately silent changelog landed its single comprehensive **v11.0.0**
entry. A craft note: the cleanup and the flip both touch `App.js`, so they were
staged apart — the theme-removal slice first, the routing swap with the flip — to
keep each commit independently buildable.

---

## Act IV — A field note: the story of one fix (v11.1.0)

> 💬 *"Mobile user should be able to see all worlds in single window."*

The map is drawn **wide** — 2000×1250, six biomes corner to corner — but a phone
is tall and narrow, and the hub had been resting zoomed onto the hometown, so a
phone only showed the centre. The diagnosis: the SVG was set to *fill-and-crop*
(`slice`), which on a portrait screen clips the side regions off-frame. The fix —
rest on the **whole map** on every viewport, and on phones only switch the SVG to
*fit* (`meet`). A twist surfaced mid-investigation: a **second Claude Code
session** was already in the same repo and had landed most of the change; this
session reconciled the two, repaired a lint-tripping format pass, and kept tests
green.

> 💬 *"Fix only mobile view to put scene in the middle of screen. No change for
> desktop view."*

> **▶ Key choice — Precise, scoped feedback.** One character did it — vertical
> alignment moved from bottom (`xMidYMax`) to centre (`xMidYMid`), the desktop's
> immersive full-bleed slice untouched. Shipped as **v11.1.0** with an on-screen
> zoom cluster for touch, plus the instant-arrival change that dropped the
> cold-load API calls from the orbit stage.

---

## The through-line

Two habits explain how a spectacle this large stayed shippable the whole way:
**decide first** (every creative and workflow choice confirmed before code), and
**stay green** (each phase left `lint`, `test` and `build` passing behind the flag
and the `/world` preview — public-safe at any moment). The map was the reward for
the method, not a substitute for it.
