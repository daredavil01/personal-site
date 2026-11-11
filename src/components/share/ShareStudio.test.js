import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ShareCard from "./ShareCard";
import ShareStudio from "./ShareStudio";
import { LAYOUTS, BASE_DESIGN } from "./shareDesign";
import { THEMES } from "./themes";
import { toShareModel } from "./shareCardConfig";

jest.mock("../../pages/admin/useSession", () => () => null);

beforeAll(() => {
  global.ResizeObserver = function ResizeObserver() {
    return { observe: () => {}, disconnect: () => {} };
  };
});

const ITEMS = {
  microblog: { id: 1, text: "Somedays, you fight to be reborn.\nAt the moment every ounce is drained. #1:1:2026::11:50:pm", date: "2026-11-11", tags: ["running", "ultras"], source: "manual" },
  book: { id: 2, title: "Deep Work", author: "Cal Newport", category: "Productivity", year: 2024, description: "Focus.", tags: ["focus"] },
  blog: { id: 3, blog_title: "Day 1", blog_description: "रोज लिहायचं ठरवलं आहे.", blog_date: "2026-01-01", blog_tags: [] },
  instagram: { id: 4, title: "Fort", caption: "Up early.", slideImages: [{ url: "https://x/a.jpg" }] },
  sport: { id: 5, title: "Pune Half", date: "February 22, 2026", distance: "21 Kms", time: "01:52:10", bibNumber: "2210", slideImages: [{ url: "https://x/b.jpg" }] },
  trek: { id: 6, fort_name: "Rajgad", trek_time: "3 Hrs", endurance_level: "Hard", date: "17-02-2019" },
  ask: { question: "What do I read?", answer: "Mostly essays [1].", sources: [{ title: "Books" }] },
};

describe("ShareCard", () => {
  Object.entries(ITEMS).forEach(([kind, item]) => {
    it.each(LAYOUTS.map((l) => l.id))(`draws ${kind} in the %s layout`, (layout) => {
      const model = toShareModel(kind, item);
      const { container } = render(<ShareCard model={model} design={{ ...BASE_DESIGN, layout, theme: "riso" }} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  it.each(THEMES.map((t) => t.id))("draws in the %s theme", (theme) => {
    const { container } = render(<ShareCard model={toShareModel("microblog", ITEMS.microblog)} design={{ ...BASE_DESIGN, theme, frame: "mat", aspect: "story" }} />);
    expect(container.firstChild.style.height).toBe("1920px");
  });

  it("marks the highlighted phrase", () => {
    render(<ShareCard model={toShareModel("book", ITEMS.book)} design={{ ...BASE_DESIGN, highlightStyle: "ink" }} edits={{ highlight: "focus" }} />);
    // jsdom drops gradients, so the accent-ink style stands in for the marker.
    const mark = screen.getByText("Focus", { selector: "span" });
    expect(mark.style.color).toBe("rgb(178, 34, 0)");
  });
});

describe("ShareStudio", () => {
  it("opens, switches tabs, edits text and closes", () => {
    const onClose = jest.fn();
    render(<ShareStudio kind="microblog" item={ITEMS.microblog} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Share as image" })).toBeTruthy();
    expect(screen.getByText("Night thought")).toBeTruthy();
    ["Text", "Theme", "Type", "Layout", "Details"].forEach((name) => {
      act(() => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(name) })); });
    });
    act(() => { fireEvent.click(screen.getByRole("tab", { name: /Text/ })); });
    fireEvent.change(screen.getByRole("textbox", { name: /Text/ }), { target: { value: "Edited line" } });
    expect(screen.getAllByText("Edited line").length).toBeGreaterThan(0);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
