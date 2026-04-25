import React from 'react';
import { nowData } from '../../data/now-data';
import booksData from '../../data/books';
import sportsData from '../../data/sports';
import treksData from '../../data/treks';
import projectsData from '../../data/projects';
import hundredDaysData from '../../data/100DaysToOffload';
import instagramData from '../../data/instagram';
import positionsData from '../../data/resume/positions';
import degreesData from '../../data/resume/degrees';
import { skills as skillsData } from '../../data/resume/skills';
import certificationsData from '../../data/resume/certifications';

const getCount = (storageKey, fallback) => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored).length : fallback.length;
  } catch {
    return fallback.length;
  }
};

const DATA_TYPES = [
  { key: 'now', label: 'Now Page', storageKey: 'admin_draft_now_data', fallback: nowData, description: 'Monthly updates', color: 'from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20', accent: 'text-cyan-600 dark:text-cyan-400' },
  { key: 'books', label: 'Books', storageKey: 'admin_draft_books', fallback: booksData, description: 'Reading list entries', color: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20', accent: 'text-amber-600 dark:text-amber-400' },
  { key: 'sports', label: 'Sports', storageKey: 'admin_draft_sports', fallback: sportsData, description: 'Race & marathon records', color: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20', accent: 'text-green-600 dark:text-green-400' },
  { key: 'treks', label: 'Treks', storageKey: 'admin_draft_treks', fallback: treksData, description: 'Fort & trek expeditions', color: 'from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20', accent: 'text-blue-600 dark:text-blue-400' },
  { key: 'projects', label: 'Projects', storageKey: 'admin_draft_projects', fallback: projectsData, description: 'Portfolio projects', color: 'from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20', accent: 'text-purple-600 dark:text-purple-400' },
  { key: 'hundreddays', label: '100 Days', storageKey: 'admin_draft_hundreddays', fallback: hundredDaysData, description: '100 Days to Offload posts', color: 'from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20', accent: 'text-rose-600 dark:text-rose-400' },
  { key: 'instagram', label: 'Instagram', storageKey: 'admin_draft_instagram', fallback: instagramData, description: 'Instagram gallery posts', color: 'from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/20 dark:to-purple-950/20', accent: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { key: 'positions', label: 'Positions', storageKey: 'admin_draft_positions', fallback: positionsData, description: 'Work experience', color: 'from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20', accent: 'text-teal-600 dark:text-teal-400' },
  { key: 'degrees', label: 'Degrees', storageKey: 'admin_draft_degrees', fallback: degreesData, description: 'Education entries', color: 'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20', accent: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'skills', label: 'Skills', storageKey: 'admin_draft_skills', fallback: skillsData, description: 'Technical skills', color: 'from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20', accent: 'text-lime-600 dark:text-lime-400' },
  { key: 'certifications', label: 'Certifications', storageKey: 'admin_draft_certifications', fallback: certificationsData, description: 'Certifications & courses', color: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20', accent: 'text-yellow-600 dark:text-yellow-400' },
];

const AdminDashboard = ({ onNavigate }) => (
  <div className="flex flex-col gap-8">
    <div>
      <h2 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-1">Dashboard</h2>
      <p className="font-body text-stone-500 dark:text-stone-400 text-sm">
        Manage your site content. Edits are saved locally — use the Export panel in each editor to generate JS for deployment.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {DATA_TYPES.map(({ key, label, storageKey, fallback, description, color, accent }) => {
        const count = getCount(storageKey, fallback);
        const hasDraft = !!localStorage.getItem(storageKey);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className={`text-left bg-gradient-to-br ${color} border border-stone-200 dark:border-stone-800 rounded-xl p-5 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] flex flex-col min-h-[110px]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-headline text-3xl font-black leading-none ${accent}`}>{count}</span>
              {hasDraft && (
                <span className="text-xs font-label bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                  Draft
                </span>
              )}
            </div>
            <p className="font-label text-sm font-bold text-stone-800 dark:text-stone-200 mt-auto">{label}</p>
            <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
          </button>
        );
      })}

      {/* Integrations card */}
      <button
        type="button"
        onClick={() => onNavigate('integrations')}
        className="text-left bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-5 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] flex flex-col min-h-[110px]"
      >
        <div className="mb-2">
          <span className="text-2xl leading-none">⚙</span>
        </div>
        <p className="font-label text-sm font-bold text-stone-800 dark:text-stone-200 mt-auto">Integrations</p>
        <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-0.5">Configure CMS providers</p>
      </button>
    </div>
  </div>
);

export default AdminDashboard;
