# Get Started Site Tour

A guided, content-aware walkthrough launched from a floating **Get Started**
button (above the light/dark toggle, on every page). Each page has its **own
tour** tailored to that page's content — the homepage walks the whole menu bar
plus the homepage highlights; every other page spotlights its own sections.

## Stack & bundle strategy

- **`react-joyride`**, lazy-loaded. `TourMount` only renders `TourGuide` (which
  imports `react-joyride`) while the tour is actually running, so the library
  stays out of the initial bundle. **Keep it behind `TourMount`'s `run` gate.**

## File map

| File | Role |
|---|---|
| `src/context/TourContext.js` | `run` state, `startTour` / `stopTour`, and `forcedMoreOpen` (holds the nav "More" dropdown open during the homepage tour). Provided in `App.js`. |
| `src/components/Template/TourMount.js` | Mounts `TourGuide` (lazy) only while `run` is true |
| `src/components/Template/TourGuide.js` | Builds the current page's steps, filters to visible targets, renders `Joyride` with a custom `TourTooltip` |
| `src/data/tourSteps.js` | **The tour registry.** `getTourSteps(pathname, …)` — homepage flow + per-page `PAGE_TOURS` + shared menu/closing steps |
| `src/components/Template/FloatingToggle.js` | The floating **Get Started** button (`data-tour="tour-button"`) + theme toggle (`data-tour="theme-toggle"`) + first-visit prompt bubble |

## How it works

1. `FloatingToggle` shows a **Get Started** button on every page. First-time
   visitors also get a dismissible "take the tour?" prompt bubble after ~1.8s.
2. Clicking it calls `startTour()` → `run = true`. The tour runs on **whatever
   page you're on** (no navigation).
3. `TourGuide` calls `getTourSteps(pathname, { isMobile, setForcedMoreOpen })`,
   then **filters out any step whose target isn't currently visible**
   (`getClientRects().length > 0`). This is what makes the desktop-nav vs.
   mobile-hamburger steps swap automatically, and lets partially-loaded pages
   degrade gracefully.
4. Ending the tour (Done / Skip / X) persists `site-tour-seen` and stops it.

**Targets are CSS selectors**, almost always `[data-tour="…"]` anchors placed
in the markup. Global anchors that always exist:

| Anchor | Where |
|---|---|
| `nav-<segment>` | each main nav link (`Navigation.js`, e.g. `nav-books`) |
| `nav-more` | the "More" dropdown button (`Navigation.js`) |
| `hamburger` | mobile menu button (`Hamburger.js`) |
| `theme-toggle`, `tour-button` | floating buttons (`FloatingToggle.js`) |
| `globe`, `stats`, `explore` | homepage sections (`Index.js`) |

**localStorage keys:** `site-tour-seen`, `site-tour-prompt-dismissed`.

## The registry (`src/data/tourSteps.js`)

- `getTourSteps('/')` → the homepage flow: `welcome` → each menu item (or the
  hamburger on mobile) → the `globe`/`stats`/`explore` highlights → theme + tour
  button. On desktop it opens the "More" dropdown for one step via
  `setForcedMoreOpen`.
- `getTourSteps('/some-page')` → `welcome` → that page's content steps →
  a "menu location" step → global closing steps. Content steps come from
  `PAGE_TOURS[path]`; unknown routes fall back to a generic `#main` overview.

A `PAGE_TOURS` entry looks like:

```js
"/books": {
  welcome: ["Digital Library", "My reading journey — reviews, ratings…"],
  nav: "nav-books",           // or "nav-more" for pages under the More menu, or null
  steps: [
    { target: '[data-tour="books-featured"]', placement: "bottom",
      title: "Featured Review", content: "A spotlighted book review…" },
    { target: "#main", placement: "top",
      title: "Browse & Filter", content: "Search the whole library…" },
  ],
},
```

`welcome` targets `body` (always kept). `#main` always exists, so it's a safe
"overview" target for pages whose content loads async.

## Maintenance recipes

### Add a tour for a new page

1. Add `data-tour="<page>-<slot>"` anchors to the page's key elements (hero,
   tabs, primary interactive area). For pages that delegate to a sub-component,
   add the anchor inside that component.
2. Add a `PAGE_TOURS["/route"]` entry: `welcome` copy, `nav` anchor
   (`nav-<segment>` for a main nav item, `nav-more` for a page under the More
   menu, or `null`), and `steps` targeting your anchors.
3. That's it — no navigation wiring. Steps whose anchors are missing/hidden are
   dropped automatically, so a thin or still-loading page still gets the
   welcome + menu + closing steps.

### Add a step to the homepage tour

Edit `homepageSteps` in `tourSteps.js`. Add the `data-tour` anchor in the
relevant homepage component (usually `Index.js`).

### Restyle the tooltip

`TourTooltip` in `TourGuide.js` is a fully custom component (site design
language). Global look (spotlight radius, overlay, accent) is in the `Joyride`
`options` prop; `primaryColor` is the brand `secondary` `#b22200`.

### Verify after changes

- On several pages: click **Get Started** → the tour reflects that page's
  content; Next/Back/Skip/X all work and end cleanly.
- Resize to mobile: nav-item steps drop, the hamburger step appears.
- The homepage tour opens the "More" dropdown on its dedicated step.
- `npm run lint` passes.
