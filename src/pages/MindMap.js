import React, { useMemo } from 'react';
import PageShell from '../atlas/PageShell';
import MindMapCanvas from '../components/MindMap/MindMapCanvas';
import { useBooks, useSports, useTreks, useProjects, useBlogs } from '../context/ContentContext';

const MindMap = () => {
  const { data: booksData } = useBooks();
  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();
  const { data: projectsData } = useProjects();
  const { data: blogsData } = useBlogs();

  const categories = useMemo(() => [
    { id: 'books', label: 'Books', color: '#f97316', items: booksData, type: 'book', path: '/books' },
    { id: 'marathons', label: 'Marathons', color: '#3b82f6', items: sportsData, type: 'marathon', path: '/sports' },
    { id: 'treks', label: 'Treks', color: '#22c55e', items: treksData, type: 'trek', path: '/treks' },
    { id: 'projects', label: 'Projects', color: '#a855f7', items: projectsData, type: 'project', path: '/projects' },
    { id: 'blogs', label: 'Blogs', color: '#ec4899', items: blogsData, type: 'blog', path: '/100-days-to-offload' },
  ], [booksData, sportsData, treksData, projectsData, blogsData]);

  return (
    <PageShell region="person">
      <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl text-stone-900 dark:text-stone-100 mb-3">
            Mind Map
          </h1>
          <p className="font-body text-stone-500 dark:text-stone-400 text-base md:text-lg max-w-xl">
            Everything on this site, visualised as one explorable map. Click a category bubble to zoom into its items, then click any bubble for details.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-label">
            <span className="material-symbols-outlined text-sm">touch_app</span>
            Click a category to zoom in · Drag to pan · Scroll or pinch to zoom
          </div>
        </div>

        <MindMapCanvas categories={categories} />
      </div>
    </PageShell>
  );
};

export default MindMap;
