// Declarative quest definitions (§4.5). Explorer derives from visitedRegions,
// collectors from tracked actions, the egg hunt from found eggs. The quest
// engine (questEngine.js) is the pure evaluator over these; ALL_QUESTS bundles
// the time/return achievements so passport + engine share one list.
//
// More collector quests land with each page wave (they simply read the
// track() actions those pages add); today only the Book Forest is wired.

import { EGG_COUNT } from "./easterEggs";
import { ACHIEVEMENTS } from "./achievements";

export const QUESTS = [
  {
    id: "explorer",
    type: "explorer",
    target: 6,
    title: "Cartographer",
    desc: "Set foot in all six regions of the Atlas.",
    reward: { stamp: "cartographer", label: "Cartographer stamp" },
    color: "#f2a949",
  },
  {
    id: "collector_books",
    type: "collector",
    region: "reader",
    action: "book:open",
    target: 5,
    title: "Bibliophile",
    desc: "Open five books in the Book Forest.",
    reward: { stamp: "bibliophile", label: "Bibliophile stamp" },
    color: "#f97316",
  },
  {
    id: "collector_races",
    type: "collector",
    region: "marathons",
    action: "race:open",
    target: 5,
    title: "Roadrunner",
    desc: "Open five races along the Coastal Road.",
    reward: { stamp: "roadrunner", label: "Roadrunner stamp" },
    color: "#3b82f6",
  },
  {
    id: "collector_treks",
    type: "collector",
    region: "treks",
    action: "trek:open",
    target: 5,
    title: "Summiteer",
    desc: "Open five treks along the Sahyadri Ridge.",
    reward: { stamp: "summiteer", label: "Summiteer stamp" },
    color: "#22c55e",
  },
  {
    id: "collector_writing",
    type: "collector",
    region: "writer",
    action: "blog:open",
    target: 5,
    title: "Wordsmith",
    desc: "Open five posts in the Scriptorium.",
    reward: { stamp: "wordsmith", label: "Wordsmith stamp" },
    color: "#ec4899",
  },
  {
    id: "egg_hunter",
    type: "eggs",
    target: EGG_COUNT,
    title: "Curious Wanderer",
    desc: "Uncover every hidden secret on the map.",
    reward: { stamp: "curious", label: "Curious Wanderer stamp" },
    color: "#22c55e",
  },
];

export const ALL_QUESTS = [...QUESTS, ...ACHIEVEMENTS];
