import React, { useMemo, useState, useRef, useEffect } from "react";
import SectionHeader from "../common/SectionHeader";
import HOME_FEATURES from "../../data/homeFeatures";
import {
  useSports,
  useTreks,
  useBooks,
  useBlogs,
  useProjects,
} from "../../context/ContentContext";
import MindMapDetailPanel from "../MindMap/MindMapDetailPanel";
import { DOMAINS } from "./globe/domains";

const GlobeRenderer = React.lazy(() => import("./GlobeRenderer"));

const GlobeSkeleton = () => (
  <div className="w-full h-[420px] md:h-[560px] animate-pulse bg-stone-100 dark:bg-stone-800 rounded-2xl flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
    <span className="material-symbols-outlined text-4xl mb-2">public</span>
    <span className="font-label text-xs uppercase tracking-widest">
      Loading globe...
    </span>
  </div>
);

// Helper to evenly distribute pins around an anchor using a Vogel spiral
const distribute = (anchorLat, anchorLng, index, radiusStep = 3.5) => {
  if (index === 0) return { lat: anchorLat, lng: anchorLng };
  // Golden ratio angle in radians
  const angle = index * 2.39996;
  // Radius grows with square root of index to maintain uniform density
  const r = Math.sqrt(index) * radiusStep;
  return {
    lat: anchorLat + Math.cos(angle) * r,
    lng: anchorLng + Math.sin(angle) * r,
  };
};

const GlobeShowcase = () => {
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();
  const { data: booksData } = useBooks();
  const { data: blogsData } = useBlogs();
  const { data: projectsData } = useProjects();

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const pins = useMemo(() => {
    if (!inView) return [];
    const listsByType = {
      marathon: { items: sportsData || [], getLabel: (s) => s.title },
      trek: { items: treksData || [], getLabel: (t) => t.fort_name },
      blog: {
        items: (blogsData || []).slice(0, 15),
        getLabel: (b) => b.blog_title,
      },
      book: { items: (booksData || []).slice(0, 20), getLabel: (b) => b.title },
      project: { items: projectsData || [], getLabel: (p) => p.title },
      feature: { items: HOME_FEATURES, getLabel: (f) => f.title },
    };

    const p = [];
    DOMAINS.forEach((domain) => {
      const { items, getLabel } = listsByType[domain.type];
      const radiusStep = domain.type === "feature" ? 5 : 3.5;
      items.forEach((item, index) => {
        const coords = distribute(domain.lat, domain.lng, index, radiusStep);
        p.push({
          id: `${domain.type}-${item.id ?? index}`,
          type: domain.type,
          lat: coords.lat,
          lng: coords.lng,
          label: getLabel(item),
          color: domain.color,
          data: item,
        });
      });
    });
    return p;
  }, [sportsData, treksData, booksData, blogsData, projectsData, inView]);

  return (
    <section ref={containerRef} className="w-full">
      <SectionHeader label="My World" />
      {!inView ? (
        <GlobeSkeleton />
      ) : (
        <React.Suspense fallback={<GlobeSkeleton />}>
          <GlobeRenderer
            pins={pins}
            onPinClick={setSelectedItem}
            paused={selectedItem !== null}
          />
        </React.Suspense>
      )}

      {selectedItem && (
        <MindMapDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </section>
  );
};

export default GlobeShowcase;
