import React, { useEffect } from "react";

const difficultyClass = (level) => {
  switch (level?.toLowerCase()) {
    case "easy":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    case "medium":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
    case "hard":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400";
  }
};

const MetaChip = ({ icon, text }) => (
  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-sm">
    <span className="material-symbols-outlined text-base text-secondary">
      {icon}
    </span>
    <span className="font-label font-bold">{text}</span>
  </div>
);

const BookDetail = ({ book }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <MetaChip icon="person" text={book.author} />
      <MetaChip icon="calendar_today" text={book.year} />
      {book.language && <MetaChip icon="translate" text={book.language} />}
    </div>
    {book.category && (
      <div className="flex flex-wrap gap-2">
        {book.category.split(",").map((c) => (
          <span
            key={c}
            className="px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
          >
            {c.trim()}
          </span>
        ))}
      </div>
    )}
    {book.description && (
      <p className="font-body text-stone-600 dark:text-stone-300 text-base leading-relaxed border-l-4 border-orange-400/40 pl-4 py-1">
        {book.description}
      </p>
    )}
    {book.tags && (
      <div className="flex flex-wrap gap-2">
        {book.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-[10px] font-label bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
          >
            #{t}
          </span>
        ))}
      </div>
    )}
  </div>
);

const MarathonDetail = ({ race }) => (
  <div className="space-y-4">
    {race.slideImages?.[0]?.url && (
      <img
        src={race.slideImages[0].url}
        alt={race.title}
        className="w-full h-48 object-cover rounded-xl"
      />
    )}
    <div className="flex flex-wrap gap-4">
      <MetaChip icon="calendar_today" text={race.date} />
      {race.place && <MetaChip icon="location_on" text={race.place} />}
      <MetaChip icon="timer" text={race.time} />
      <MetaChip icon="social_leaderboard" text={race.distance} />
      {race.bibNumber && (
        <MetaChip icon="confirmation_number" text={`Bib #${race.bibNumber}`} />
      )}
    </div>
    {race.description && (
      <p className="font-body text-stone-600 dark:text-stone-300 text-base leading-relaxed italic border-l-4 border-blue-400/40 pl-4 py-1">
        "{race.description}"
      </p>
    )}
  </div>
);

const TrekDetail = ({ trek }) => (
  <div className="space-y-4">
    {trek.slideImages?.[0]?.url && (
      <img
        src={trek.slideImages[0].url}
        alt={trek.fort_name}
        className="w-full h-48 object-cover rounded-xl"
      />
    )}
    <div className="flex flex-wrap gap-4 items-center">
      <MetaChip icon="calendar_today" text={trek.date} />
      <MetaChip icon="schedule" text={trek.trek_time} />
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${difficultyClass(trek.endurance_level)}`}
      >
        {trek.endurance_level}
      </span>
    </div>
  </div>
);

const FeatureDetail = ({ feature }) => (
  <div className="space-y-4">
    <div className="flex justify-center py-6 bg-stone-50 dark:bg-stone-800/50 rounded-xl mb-4 border border-secondary/40">
      <span className="material-symbols-outlined text-6xl text-secondary">
        {feature.icon}
      </span>
    </div>
    <p className="font-body text-stone-600 dark:text-stone-300 text-base leading-relaxed border-l-4 border-secondary/40 pl-4 py-1">
      {feature.desc}
    </p>
  </div>
);

const ProjectDetail = ({ project }) => (
  <div className="space-y-4">
    {(project.subtitle || project.subTitle) && (
      <p className="font-label text-stone-500 dark:text-stone-400 text-sm">
        {project.subtitle || project.subTitle}
      </p>
    )}
    <MetaChip icon="calendar_today" text={project.date?.slice(0, 4)} />
    {project.desc && (
      <p className="font-body text-stone-600 dark:text-stone-300 text-base leading-relaxed border-l-4 border-purple-400/40 pl-4 py-1">
        {project.desc}
      </p>
    )}
  </div>
);

const BlogDetail = ({ blog }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-4">
      <MetaChip icon="calendar_today" text={blog.blog_date} />
      {blog.blog_platform && <MetaChip icon="web" text={blog.blog_platform} />}
      {blog.language && <MetaChip icon="translate" text={blog.language} />}
    </div>
    {blog.blog_description && (
      <p className="font-body text-stone-600 dark:text-stone-300 text-base leading-relaxed border-l-4 border-pink-400/40 pl-4 py-1">
        {blog.blog_description}
      </p>
    )}
    {blog.blog_tags && (
      <div className="flex flex-wrap gap-2">
        {blog.blog_tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-[10px] font-label bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
          >
            #{t}
          </span>
        ))}
      </div>
    )}
  </div>
);

const ctaConfig = {
  book: {
    label: "Browse All Books",
    path: "/books",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  marathon: {
    label: "View All Races",
    path: "/sports",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  trek: {
    label: "View All Treks",
    path: "/treks",
    color: "bg-green-600 hover:bg-green-700",
  },
  project: {
    label: "View All Projects",
    path: "/projects",
    color: "bg-purple-600 hover:bg-purple-700",
  },
  blog: {
    label: "Read All Posts",
    path: "/100-days-to-offload",
    color: "bg-pink-600 hover:bg-pink-700",
  },
  feature: {
    label: "Explore Section",
    path: "",
    color: "bg-secondary hover:bg-secondary/90 text-white",
  },
};

const MindMapDetailPanel = ({ item, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!item) return null;
  const { type, data } = item;

  const titleMap = {
    book: data.title,
    marathon: data.title,
    trek: data.fort_name,
    project: data.title,
    blog: data.blog_title,
    feature: data.title,
  };

  const cta = ctaConfig[type];
  const externalLinkMap = {
    book: data.blog_link,
    marathon: data.timeCertificateLink,
    trek: data.blog_link,
    project: data.link,
    blog: data.blog_link,
  };
  const externalLink = externalLinkMap[type] || null;

  const externalLabelMap = {
    book: "Read Review",
    marathon: "View Certificate",
    trek: "Read Blog Post",
    project: "View Project",
    blog: "Read Post",
  };
  const externalLabel = externalLabelMap[type] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md z-10">
          <h2 className="font-headline text-xl text-stone-900 dark:text-stone-100 pr-4 leading-snug">
            {titleMap[type]}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex-1">
          {type === "book" && <BookDetail book={data} />}
          {type === "marathon" && <MarathonDetail race={data} />}
          {type === "trek" && <TrekDetail trek={data} />}
          {type === "project" && <ProjectDetail project={data} />}
          {type === "blog" && <BlogDetail blog={data} />}
          {type === "feature" && <FeatureDetail feature={data} />}
        </div>

        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 sticky bottom-0 z-10 flex flex-col sm:flex-row gap-3">
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 block text-center text-white px-5 py-3.5 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all ${cta.color}`}
            >
              {externalLabel}
            </a>
          )}
          <a
            href={type === "feature" ? data.path : cta.path}
            className={`flex-1 block text-center px-5 py-3.5 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all ${
              type === "feature"
                ? cta.color
                : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
            }`}
          >
            {cta.label}
          </a>
        </div>
      </div>
    </div>
  );
};

export default MindMapDetailPanel;
