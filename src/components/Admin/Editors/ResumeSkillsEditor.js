import React, { useState } from 'react';
import { skills as skillsData } from '../../../data/resume/skills';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import TagsInput from '../TagsInput';
import ExportPanel from '../ExportPanel';

const emptySkill = () => ({ title: '', competency: 3, category: [] });

const templateFn = (items) => {
  const json = JSON.stringify(items, null, 2);
  return `const skills = ${json};\n\nexport default skills;\n`;
};

const DOTS = [1, 2, 3, 4, 5];

const SkillForm = ({ skill, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Skill Name">
        <TextInput value={skill.title} onChange={(v) => onChange({ title: v })} placeholder="e.g. React" />
      </FormField>
      <FormField label={`Competency (${skill.competency}/5)`}>
        <div className="flex gap-2 items-center py-2">
          {DOTS.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Set competency to ${n}`}
              onClick={() => onChange({ competency: n })}
              className={`w-6 h-6 rounded-full border-2 transition-colors ${n <= skill.competency ? 'bg-secondary border-secondary' : 'bg-transparent border-stone-300 dark:border-stone-600 hover:border-secondary'}`}
            />
          ))}
        </div>
      </FormField>
    </div>
    <FormField label="Categories">
      <TagsInput tags={skill.category} onChange={(category) => onChange({ category })} />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove skill
    </button>
  </div>
);

const ResumeSkillsEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_skills',
    fallbackData: skillsData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q)
      || s.category?.some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Skills</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} skills</p>
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={resetToOriginal}
              className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors"
            >
              Reset to original
            </button>
          )}
          <button
            type="button"
            onClick={() => { addItem(emptySkill()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Skill
          </button>
        </div>
      </div>

      <TextInput value={search} onChange={setSearch} placeholder="Search skills or categories…" />

      <div className="flex flex-col gap-2">
        {filtered.map((skill) => {
          const realIndex = items.indexOf(skill);
          const isOpen = expandedIndex === realIndex;
          return (
            <div key={realIndex} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIndex(isOpen ? null : realIndex)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">{skill.title || <em className="text-stone-400">Untitled</em>}</span>
                  <div className="flex gap-0.5">
                    {DOTS.map((n) => (
                      <span key={n} className={`w-2 h-2 rounded-full ${n <= skill.competency ? 'bg-secondary' : 'bg-stone-200 dark:bg-stone-700'}`} />
                    ))}
                  </div>
                </div>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <SkillForm skill={skill} onChange={(patch) => updateItem(realIndex, patch)} onRemove={() => { removeItem(realIndex); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/resume/skills.js" />
    </div>
  );
};

export default ResumeSkillsEditor;
