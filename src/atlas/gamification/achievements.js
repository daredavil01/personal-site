// Time + return achievements (§4.5). The quest engine treats these exactly
// like quests — same completion pass, same reward queue — they just derive
// from the clock and the visit log rather than from region/action counts.

// eslint-disable-next-line import/prefer-default-export -- named export mirrors QUESTS in quests.js
export const ACHIEVEMENTS = [
  {
    id: "nightowl",
    type: "nightowl",
    target: 1,
    title: "Night Owl",
    desc: "Explore the Atlas after dark (23:00–05:00).",
    reward: { stamp: "nightowl", label: "Night Owl stamp" },
    color: "#a855f7",
  },
  {
    id: "regular",
    type: "regular",
    target: 3,
    title: "Regular",
    desc: "Drop by on three different days within a week.",
    reward: { stamp: "regular", label: "Regular stamp" },
    color: "#3b82f6",
  },
  {
    id: "completionist",
    type: "completionist",
    title: "Completionist",
    desc: "Finish every other quest in the Atlas.",
    reward: { stamp: "completionist", label: "Completionist stamp" },
    color: "#ec4899",
  },
];
