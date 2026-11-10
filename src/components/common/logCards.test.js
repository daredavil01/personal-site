import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BibCards } from "../Sports/BibWall";
import { TrekCards } from "../Treks/TrekList";
import { enrichRaces } from "../../lib/raceLog";
import { enrichTreks } from "../../lib/trekLog";

// Rows carry slideImages as {url, caption} objects (toStorageImages), not
// strings — the cards must put the url, not the object, in <img src>.
const IMG = [{ url: "https://example.com/a.jpeg", caption: "Slide 1" }];

it("race and trek cards show the first photo's url", () => {
  const races = enrichRaces([{
    id: 1, title: "Run", date: "March 3, 2024", place: "Pune", distance: "21 Kms", time: "2:00:00", slideImages: IMG,
  }]);
  const treks = enrichTreks([{
    id: 1, fort_name: "Tikona", date: "17-02-2019", trek_time: "1 Hrs", endurance_level: "Easy", slideImages: IMG,
  }]);
  const a = render(<MemoryRouter><BibCards races={races} ordinals={new Map([[1, 1]])} /></MemoryRouter>);
  expect(a.container.querySelector("img.object-cover").getAttribute("src")).toBe(IMG[0].url);
  const b = render(<TrekCards treks={treks} onOpen={() => {}} />);
  expect(b.container.querySelector("img.object-contain").getAttribute("src")).toBe(IMG[0].url);
});
