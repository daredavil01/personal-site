import React, { useState } from 'react';
import projectsData from '../../../data/projects';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ExportPanel from '../ExportPanel';

const emptyProject = () => ({
  title: '',
  subtitle: '',
  link: '',
  image: '',
  date: '',
  desc: '',
});

const templateFn = (items) =>
  `const projects = ${JSON.stringify(items, null, 2)};\n\nexport default projects;\n`;

const ProjectForm = ({ project, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Title">
        <TextInput value={project.title} onChange={(v) => onChange({ title: v })} placeholder="Project name" />
      </FormField>
      <FormField label="Subtitle">
        <TextInput value={project.subtitle ?? project.subTitle ?? ''} onChange={(v) => onChange({ subtitle: v, subTitle: undefined })} placeholder="Short tagline" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Link">
        <TextInput value={project.link} onChange={(v) => onChange({ link: v })} placeholder="https://github.com/..." />
      </FormField>
      <FormField label="Date" hint="YYYY-MM-DD">
        <TextInput value={project.date} onChange={(v) => onChange({ date: v })} placeholder="2024-01-15" />
      </FormField>
    </div>
    <FormField label="Image path" hint="e.g. /images/projects/project.png">
      <TextInput value={project.image} onChange={(v) => onChange({ image: v })} placeholder="/images/projects/project.png" />
    </FormField>
    <FormField label="Description">
      <TextInput multiline rows={3} value={project.desc} onChange={(v) => onChange({ desc: v })} />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove project
    </button>
  </div>
);

const ProjectsEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_projects',
    fallbackData: projectsData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Projects</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} projects</p>
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">Reset to original</button>
          )}
          <button
            type="button"
            onClick={() => { addItem(emptyProject()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Project
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((project, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <span className="font-body text-sm text-stone-900 dark:text-stone-100">
                  {project.title || <em className="text-stone-400">Untitled</em>}
                </span>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <ProjectForm project={project} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/projects.js" />
    </div>
  );
};

export default ProjectsEditor;
