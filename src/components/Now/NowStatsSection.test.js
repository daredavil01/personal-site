import React from "react";
import { render, screen } from "@testing-library/react";
import NowStatsSection from "./NowStatsSection";

describe("NowStatsSection", () => {
  it("renders the branded presets with their appended units", () => {
    render(<NowStatsSection stats={{
      strava: {
        activities: 43, km: 147, hours: 36, elevationMeters: 1055, approximate: true,
      },
      substack: { views: 179, subscribers: 34 },
    }}
    />);

    expect(screen.getByText("Strava")).toBeInTheDocument();
    expect(screen.getByText("~147 km")).toBeInTheDocument();
    expect(screen.getByText("~1055 m")).toBeInTheDocument();
    // substack has no `approximate`, so no tilde.
    expect(screen.getByText("179")).toBeInTheDocument();
  });

  it("renders custom groups after the presets", () => {
    render(<NowStatsSection stats={{
      custom: [{
        label: "Reading",
        tiles: [{ label: "Books finished", value: 3 }, { label: "Pages", value: 840, unit: "pp" }],
      }],
    }}
    />);

    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Books finished")).toBeInTheDocument();
    expect(screen.getByText("840 pp")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders nothing when there is no stat content", () => {
    const { container } = render(<NowStatsSection stats={{ custom: [] }} />);
    expect(container).toBeEmptyDOMElement();
    expect(render(<NowStatsSection stats={null} />).container).toBeEmptyDOMElement();
  });
});
