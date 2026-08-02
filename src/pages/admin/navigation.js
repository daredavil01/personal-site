import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  FileText,
  Footprints,
  GraduationCap,
  LayoutDashboard,
  MountainSnow,
  Rss,
  Sparkles,
  Wrench,
} from "./ui/icons";

// The sidebar, and the source the command palette searches.
//
// Before the redesign this was a flat 13-item list driven by a `?tab=` query
// param, where four resume tables took up nearly a third of it. The four now
// live behind one entry (ResumePage renders them as sub-tabs), and everything
// else is grouped.
//
// `resource` names a key in resources.js; entries without one route to a
// dedicated editor.
export const NAV_GROUPS = [
  {
    id: "overview",
    label: null,
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { to: "/admin/books", label: "Books", icon: BookOpen, resource: "books" },
      { to: "/admin/sports", label: "Races", icon: Footprints, resource: "sports" },
      { to: "/admin/treks", label: "Treks", icon: MountainSnow, resource: "treks" },
      { to: "/admin/projects", label: "Projects", icon: Wrench, resource: "projects" },
      { to: "/admin/blogs", label: "100 Days", icon: FileText, resource: "blogs" },
      { to: "/admin/instagram", label: "Instagram", icon: Camera, resource: "instagram" },
      { to: "/admin/microblog", label: "Micro Blog", icon: Rss },
    ],
  },
  {
    id: "now",
    label: "Now",
    items: [
      { to: "/admin/now/months", label: "Months", icon: Calendar },
      { to: "/admin/now/meta", label: "Meta", icon: Sparkles },
    ],
  },
  {
    id: "resume",
    label: "Resume",
    items: [
      { to: "/admin/resume/experience", label: "Résumé", icon: Briefcase },
    ],
  },
];

// The four resume tables, rendered as sub-tabs of one page rather than four
// sidebar entries. `slug` is the :section route param.
export const RESUME_SECTIONS = [
  { slug: "experience", label: "Experience", resource: "resume_positions", icon: Briefcase },
  { slug: "education", label: "Education", resource: "resume_degrees", icon: GraduationCap },
  { slug: "certifications", label: "Certifications", resource: "resume_certifications", icon: Award },
  { slug: "skills", label: "Skills", resource: "resume_skills", icon: Sparkles },
];

// Old bookmarks used /admin?tab=<key>. Map each historical key onto its route so
// they keep landing in the right place.
export const LEGACY_TAB_PATHS = {
  books: "/admin/books",
  sports: "/admin/sports",
  treks: "/admin/treks",
  projects: "/admin/projects",
  blogs: "/admin/blogs",
  instagram: "/admin/instagram",
  resume_positions: "/admin/resume/experience",
  resume_degrees: "/admin/resume/education",
  resume_certifications: "/admin/resume/certifications",
  resume_skills: "/admin/resume/skills",
  __microblog: "/admin/microblog",
  __nowmonths: "/admin/now/months",
  __nowmeta: "/admin/now/meta",
};

export default NAV_GROUPS;
