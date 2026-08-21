import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// The shared jest stub reports Supabase as unconfigured (it has no import.meta
// env to read), which would short-circuit AdminApp into its config warning.
// Everything else in the stub — the auth object, the empty-resolving query
// proxy — is what these tests want, so only that one flag is overridden.
jest.mock("../../lib/supabaseClient", () => {
  const actual = jest.requireActual("../../lib/supabaseClient");
  return { ...actual, isSupabaseConfigured: true };
});

const SESSION = { user: { email: "sanket@example.com" } };
let mockSession = SESSION;
jest.mock("../../pages/admin/useSession", () => () => mockSession);

// eslint-disable-next-line import/first
import AdminApp from "../../pages/admin/AdminApp";
// eslint-disable-next-line import/first
import { ThemeProvider } from "../../context/ThemeContext";
// eslint-disable-next-line import/first
import { ContentProvider } from "../../context/ContentContext";

// Both providers sit above <App/> in src/index.js: the sidebar's theme toggle
// reads ThemeContext, and the Now month editor's auto-fill reads the cached
// content collections.
const renderAt = (path) => render(
  <ThemeProvider>
    <ContentProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </MemoryRouter>
    </ContentProvider>
  </ThemeProvider>,
);

beforeEach(() => { mockSession = SESSION; });

describe("admin auth gate", () => {
  it("renders the login card when signed out", () => {
    mockSession = null;
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows a resolving state while the session is unknown", () => {
    mockSession = undefined;
    renderAt("/admin");
    expect(screen.getByText("Checking your session…")).toBeInTheDocument();
  });

  it("shows the signed-in account in the sidebar", async () => {
    renderAt("/admin");
    expect(await screen.findAllByText("sanket@example.com")).not.toHaveLength(0);
  });
});

describe("admin routes", () => {
  it.each([
    ["/admin", "Overview"],
    ["/admin/books", "Books"],
    ["/admin/sports", "Races"],
    ["/admin/treks", "Treks"],
    ["/admin/projects", "Projects"],
    ["/admin/blogs", "100 Days"],
    ["/admin/instagram", "Instagram"],
    ["/admin/microblog", "Micro Blog"],
    ["/admin/now/months", "Now · Months"],
    ["/admin/now/meta", "Now · Meta"],
  ])("renders %s", async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it.each([
    ["experience", "Experience"],
    ["education", "Education"],
    ["certifications", "Certifications"],
    ["skills", "Skills"],
  ])("renders the résumé %s sub-tab", async (slug, heading) => {
    renderAt(`/admin/resume/${slug}`);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("redirects bare /admin/resume to the experience tab", async () => {
    renderAt("/admin/resume");
    expect(await screen.findByRole("heading", { level: 1, name: "Experience" })).toBeInTheDocument();
  });

  it("sends an unknown resource key back to the overview", async () => {
    renderAt("/admin/nonsense");
    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
  });
});

// The dashboard navigated by ?tab= before it had routes; those bookmarks exist.
describe("legacy ?tab= bookmarks", () => {
  it.each([
    ["books", "Books"],
    ["__microblog", "Micro Blog"],
    ["__nowmonths", "Now · Months"],
    ["__nowmeta", "Now · Meta"],
    ["resume_skills", "Skills"],
  ])("?tab=%s lands on %s", async (tab, heading) => {
    renderAt(`/admin?tab=${tab}`);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("leaves an unrecognised tab on the overview", async () => {
    renderAt("/admin?tab=whatever");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument());
  });
});
