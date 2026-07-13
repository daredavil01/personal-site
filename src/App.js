import React, { Suspense, lazy } from "react";
import {
  BrowserRouter, Routes, Route, Navigate, useLocation,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ContentProvider } from "./context/ContentContext";
import { WorldProvider } from "./atlas/world/WorldContext";
import useViewMode from "./atlas/useViewMode";
import Main from "./layouts/Main"; // fallback for lazy pages
import "./tailwind.css"; // Tailwind globals

const { PUBLIC_URL } = process.env;

// Every route - we lazy load so that each page can be chunked
// NOTE that some of these chunks are very small. We should optimize
// which pages are lazy loaded in the future.
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Projects = lazy(() => import("./pages/Projects"));
const Resume = lazy(() => import("./pages/Resume"));
const Stats = lazy(() => import("./pages/Stats"));
const Instagram = lazy(() => import("./pages/Instagram"));
const SportsPage = lazy(() => import("./pages/Sports"));
const Now = lazy(() => import("./pages/Now"));
const Books = lazy(() => import("./pages/Books"));
const Challenges = lazy(() => import("./pages/Challenges"));
const OneHundredDays = lazy(() => import("./pages/OneHundredDays"));
const MicroBlog = lazy(() => import("./pages/MicroBlog"));
const MicroBlogPost = lazy(() => import("./pages/MicroBlogPost"));
const TrekPost = lazy(() => import("./pages/TrekPost"));
const SportPost = lazy(() => import("./pages/SportPost"));
const BookPost = lazy(() => import("./pages/BookPost"));
const ProjectPost = lazy(() => import("./pages/ProjectPost"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Changelog = lazy(() => import("./pages/Changelog"));
const TreksPage = lazy(() => import("./pages/Treks"));
const InteractiveMePage = lazy(() => import("./pages/InteractiveMe"));
const MindMap = lazy(() => import("./pages/MindMap"));
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));
// The atlas homepage: orbit -> dive -> map. Serves "/" in atlas mode.
const AtlasHome = lazy(() => import("./atlas/AtlasHome"));
// The fixed atlas chrome (HUD etc.) — mounted once, outside Routes, only in
// atlas mode (§4.7). Lazy keeps atlas CSS/JS out of the entry bundle.
const AtlasFrame = lazy(() => import("./atlas/AtlasFrame"));

const AtlasFrameGate = () => {
  const mode = useViewMode();
  const { pathname } = useLocation();
  // The admin dashboard is a workspace, not a place in the world: no map
  // compass, return portal, passport or sound buttons over its UI.
  if (mode !== "atlas" || pathname.startsWith("/admin")) return null;
  return (
    <Suspense fallback={null}>
      <AtlasFrame />
    </Suspense>
  );
};

// "/" is the one route whose two shells render different components rather than
// the same content in a different wrapper: the atlas homepage is the world map,
// the classic homepage is the editorial hub. Every other route goes through
// PageShell, which wraps identical content.
const HomeRoute = () => (useViewMode() === "atlas" ? <AtlasHome /> : <Index />);

const App = () => (
  <HelmetProvider>
    <ContentProvider>
      <WorldProvider>
        <BrowserRouter basename={PUBLIC_URL}>
          <AtlasFrameGate />
          <Suspense fallback={<Main />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/instagram" element={<Instagram />} />
              <Route path="/sports" element={<SportsPage />} />
              <Route path="/now" element={<Now />} />
              <Route path="/books" element={<Books />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/100-days-to-offload" element={<OneHundredDays />} />
              <Route path="/micro-blog" element={<MicroBlog />} />
              <Route path="/micro-blog/:id" element={<MicroBlogPost />} />
              <Route path="/treks/:id" element={<TrekPost />} />
              <Route path="/sports/:id" element={<SportPost />} />
              <Route path="/books/:id" element={<BookPost />} />
              <Route path="/projects/:id" element={<ProjectPost />} />
              <Route path="/100-days-to-offload/:id" element={<BlogPost />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/treks" element={<TreksPage />} />
              <Route path="/interactive-me" element={<InteractiveMePage />} />
              <Route path="/mindmap" element={<MindMap />} />
              <Route path="/admin/*" element={<AdminApp />} />
              {/* The dark-build preview route. Kept so old links and bookmarks
                still land somewhere sensible now that "/" is the atlas. */}
              <Route path="/world" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WorldProvider>
    </ContentProvider>
  </HelmetProvider>
);

export default App;
