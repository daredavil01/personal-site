/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Projects from "../../pages/Projects";

const PROJECTS = [
  {
    id: 1,
    title: "RunLog",
    subtitle: "Your digital wall of medals.",
    desc: "A wall of medals",
    link: "https://runlog.example",
    image: "",
    date: "2026-03-01",
    category: "Web App",
    status: "Live",
    org: "",
    role: "Solo build",
    featured: true,
    techStack: ["React", "Supabase"],
    highlights: ["Tracked 40 races"],
    tags: ["running"],
    links: [{ label: "GitHub", url: "https://github.com/x" }],
    slideImages: [{ url: "shot-1.jpg", caption: "Slide 1" }],
  },
  {
    id: 2,
    title: "Social-Ape",
    subtitle: "Social Media App For Human Apes",
    desc: "Social app",
    link: "https://ape.example",
    image: "",
    date: "2020-11-20",
    category: "Web App",
    status: "Archived",
    featured: false,
    techStack: ["React", "Firebase"],
    highlights: [],
    tags: [],
    links: [],
    // No image and no screenshots: the placeholder path.
    slideImages: [],
  },
];

// Lets a test swap the dataset without re-mocking the module. Declared before
// the jest.mock factories, which are hoisted but only *run* at import time.
const PROJECTS_REF = { current: PROJECTS };

jest.mock("../../context/ContentContext", () => ({
  useProjects: () => ({ data: PROJECTS_REF.current, loading: false, error: null }),
  useOptionalTags: () => [],
}));
jest.mock("../../atlas/PageShell", () => function MockPageShell({ children }) {
  return <div>{children}</div>;
});
jest.mock("../../atlas/world/WorldContext", () => ({ useWorld: () => ({ track: jest.fn() }) }));

const setup = (entries = ["/projects"]) => render(
  <MemoryRouter initialEntries={entries}><Projects /></MemoryRouter>,
);

// The page is the only place the four views, the filter bar and the modal meet,
// so this is a mount-and-wire check rather than a re-test of the hook.
describe("Projects page", () => {
  beforeEach(() => { PROJECTS_REF.current = PROJECTS; });

  it("renders the spotlight for a featured project and cards for the rest", () => {
    setup();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open details for Social-Ape/i })).toBeInTheDocument();
  });

  it("shows a placeholder instead of a broken tile when a project has no imagery", () => {
    setup();
    const card = screen.getByRole("button", { name: /open details for Social-Ape/i });
    expect(within(card).queryByRole("img")).not.toBeInTheDocument();
    expect(within(card).getByText("wallpaper")).toBeInTheDocument();
  });

  it("opens the quick-look modal from a card and closes it on Escape", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /open details for Social-Ape/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Social-Ape")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches views from the tab bar", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByRole("table")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Statistics" }));
    expect(screen.getByText("Technologies")).toBeInTheDocument();

    // Timeline groups by year, so both year headings should appear.
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByRole("heading", { name: "2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2020" })).toBeInTheDocument();
  });

  it("honours a view and filter combination from the URL", () => {
    setup(["/projects?view=table&tech=Firebase"]);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // Header + exactly the one Firebase project.
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("Social-Ape")).toBeInTheDocument();
  });

  it("shows an empty state when filters match nothing", () => {
    setup(["/projects?tech=COBOL"]);
    expect(screen.getByText(/No projects match those filters/i)).toBeInTheDocument();
  });

  it("reports the filtered count against the total", () => {
    setup(["/projects?status=Live"]);
    expect(screen.getByText("1 of 2 projects")).toBeInTheDocument();
  });
});
