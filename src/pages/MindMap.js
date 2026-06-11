import React from 'react';
import { Helmet } from 'react-helmet-async';
import Main from '../layouts/Main';
import MindMapCanvas from '../components/MindMap/MindMapCanvas';

import booksData from '../data/books';
import sportsData from '../data/sports';
import treksData from '../data/treks';
import projectsData from '../data/projects';
import blogsData from '../data/100DaysToOffload';

const categories = [
  {
    id: 'books',
    label: 'Books',
    color: '#f97316',
    items: booksData,
    type: 'book',
    path: '/books',
  },
  {
    id: 'marathons',
    label: 'Marathons',
    color: '#3b82f6',
    items: sportsData,
    type: 'marathon',
    path: '/sports',
  },
  {
    id: 'treks',
    label: 'Treks',
    color: '#22c55e',
    items: treksData,
    type: 'trek',
    path: '/treks',
  },
  {
    id: 'projects',
    label: 'Projects',
    color: '#a855f7',
    items: projectsData,
    type: 'project',
    path: '/projects',
  },
  {
    id: 'blogs',
    label: 'Blogs',
    color: '#ec4899',
    items: blogsData,
    type: 'blog',
    path: '/100-days-to-offload',
  },
];

const MindMap = () => (
  <Main>
    <Helmet>
      <title>Mind Map — Sanket Tambare</title>
      <meta name="description" content="An interactive mindmap of everything on Sanket's personal site — books, marathons, treks, projects, and blogs." />
    </Helmet>

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
  </Main>
);

export default MindMap;
