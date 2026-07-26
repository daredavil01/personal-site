import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NowMicroSection from "./NowMicroSection";

const renderSection = (micro) => render(
  <MemoryRouter><NowMicroSection micro={micro} /></MemoryRouter>,
);

describe("NowMicroSection", () => {
  it("renders each post as a card linking to its archive permalink", () => {
    renderSection([
      {
        id: 7, date: "2026-05-12", postType: "quote", text: "A short scrap.", tags: ["reading", "notes"],
      },
      { id: 8, date: "2026-05-20", postType: "photo", imageUrl: "https://img/8.jpg" },
    ]);

    expect(screen.getByText("Micro Posts")).toBeInTheDocument();
    // Quote posts are wrapped in typographic quotes.
    expect(screen.getByText("“A short scrap.”")).toBeInTheDocument();
    expect(screen.getByText("Quote")).toBeInTheDocument();
    expect(screen.getByText("May 12, 2026")).toBeInTheDocument();
    expect(screen.getByText("#reading")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/micro-blog/7", "/micro-blog/8"]);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img/8.jpg");
  });

  it("renders a hand-added post without an id as an unlinked card", () => {
    renderSection([{ text: "Typed straight into the admin.", postType: "text" }]);
    expect(screen.getByText("Typed straight into the admin.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when the section is empty", () => {
    expect(renderSection([]).container).toBeEmptyDOMElement();
    expect(renderSection(undefined).container).toBeEmptyDOMElement();
  });
});
