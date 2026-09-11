import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useProjectFilters from "../../components/Projects/useProjectFilters";

const PROJECTS = [
  {
    id: 1, title: "RunLog", subtitle: "Medals", desc: "A wall of medals", date: "2026-03-01", category: "Web App", status: "Live", org: "", role: "Solo build", techStack: ["React", "Supabase"], tags: ["running"],
  },
  {
    id: 2, title: "Social-Ape", subtitle: "Apes", desc: "Social app", date: "2020-11-20", category: "Web App", status: "Archived", org: "", role: "", techStack: ["React", "Firebase"], tags: ["college"],
  },
  {
    id: 3, title: "YUNG Foundation Website", subtitle: "CMS", desc: "Full CMS", date: "2026-08-01", category: "Website", status: "Live", org: "YUNG Foundation", role: "", techStack: ["Astro"], tags: ["nonprofit"],
  },
  {
    id: 4, title: "Sketchbook", subtitle: "", desc: "Undated experiment", date: null, category: "Design", status: "Concept", org: "", role: "", techStack: [], tags: [],
  },
];

// The hook is the only place the four views agree on what "filtered" means, so
// the matrix is tested directly rather than through any one view.
let api;
const Probe = ({ projects }) => {
  api = useProjectFilters(projects);
  return <div data-testid="ids">{api.filtered.map((p) => p.id).join(",")}</div>;
};

const setup = (projects = PROJECTS, initialEntries = ["/projects"]) => {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Probe projects={projects} />
    </MemoryRouter>,
  );
};

const ids = () => screen.getByTestId("ids").textContent;

// State changes go through the hook's own setters, so they need act() to flush.
const run = (fn) => act(() => { fn(); });

describe("useProjectFilters", () => {
  it("defaults to newest-first with undated projects last", () => {
    setup();
    expect(ids()).toBe("3,1,2,4");
  });

  it("sinks undated projects to the bottom when ascending too", () => {
    setup();
    run(() => api.setFilter("dir", "asc"));
    expect(ids()).toBe("2,1,3,4");
  });

  it("ORs within the tech axis", () => {
    setup();
    run(() => api.toggleFilter("tech", "Astro"));
    expect(ids()).toBe("3");
    run(() => api.toggleFilter("tech", "Firebase"));
    expect(ids()).toBe("3,2");
  });

  it("ANDs across axes", () => {
    setup();
    run(() => api.toggleFilter("tech", "React"));
    run(() => api.setFilter("category", "Website"));
    expect(ids()).toBe("");
  });

  it("matches tech and tags case-insensitively", () => {
    setup();
    run(() => api.toggleFilter("tech", "react"));
    expect(ids()).toBe("1,2");
    run(() => api.clearFilters());
    run(() => api.toggleFilter("tags", "RUNNING"));
    expect(ids()).toBe("1");
  });

  it("searches title, description, org and role", () => {
    setup();
    run(() => api.setFilter("q", "yung"));
    expect(ids()).toBe("3");
    run(() => api.setFilter("q", "solo build"));
    expect(ids()).toBe("1");
    run(() => api.setFilter("q", "medals"));
    expect(ids()).toBe("1");
  });

  it("filters by year", () => {
    setup();
    run(() => api.setFilter("year", "2026"));
    expect(ids()).toBe("3,1");
  });

  it("clears every filter but keeps sort", () => {
    setup();
    run(() => api.setFilter("dir", "asc"));
    run(() => api.setFilter("category", "Web App"));
    run(() => api.toggleFilter("tech", "React"));
    expect(api.hasFilters).toBe(true);
    run(() => api.clearFilters());
    expect(api.hasFilters).toBe(false);
    expect(api.filters.dir).toBe("asc");
    expect(ids()).toBe("2,1,3,4");
  });

  it("reads initial state from the URL so a filtered link is shareable", () => {
    setup(PROJECTS, ["/projects?view=table&tech=React&category=Web%20App"]);
    expect(ids()).toBe("1,2");
    expect(api.filters.tech).toEqual(["React"]);
  });

  it("builds facets with counts, most-used first", () => {
    setup();
    expect(api.facets.tech[0]).toEqual({ name: "React", count: 2 });
    expect(api.facets.years).toEqual(["2026", "2020"]);
    expect(api.facets.categories.map((c) => c.name)).toContain("Website");
  });
});
