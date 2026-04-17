import React, { useState } from 'react';
import degreesData from '../../../data/resume/degrees';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ExportPanel from '../ExportPanel';

const emptyDegree = () => ({ school: '', degree: '', link: '', year: '' });

const templateFn = (items) =>
  `const degrees = ${JSON.stringify(items, null, 2)};\n\nexport default degrees;\n`;

const DegreeForm = ({ degree, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="School">
        <TextInput value={degree.school} onChange={(v) => onChange({ school: v })} placeholder="University name" />
      </FormField>
      <FormField label="Degree">
        <TextInput value={degree.degree} onChange={(v) => onChange({ degree: v })} placeholder="B.E. Computer Engineering" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="School Link">
        <TextInput value={degree.link} onChange={(v) => onChange({ link: v })} placeholder="https://university.edu" />
      </FormField>
      <FormField label="Year">
        <TextInput value={degree.year} onChange={(v) => onChange({ year: v })} placeholder="2021" />
      </FormField>
    </div>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove degree
    </button>
  </div>
);

const ResumeDegreesEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_degrees',
    fallbackData: degreesData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Degrees</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} entries</p>
        </div>
        <div className="flex gap-3">
          {isDirty && <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">Reset to original</button>}
          <button type="button" onClick={() => { addItem(emptyDegree()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
            + Add Degree
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((deg, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button type="button" onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">{deg.degree || <em className="text-stone-400">Untitled</em>}</span>
                  {deg.school && <span className="ml-2 text-xs text-stone-400">— {deg.school}</span>}
                </div>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <DegreeForm degree={deg} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/resume/degrees.js" />
    </div>
  );
};

export default ResumeDegreesEditor;
