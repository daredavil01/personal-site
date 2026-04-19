import React, { useState } from 'react';
import positionsData from '../../../data/resume/positions';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ExportPanel from '../ExportPanel';

const emptyPosition = () => ({
  company: '',
  position: '',
  link: '',
  daterange: '',
  points: [],
});

const templateFn = (items) => {
  const json = JSON.stringify(items, null, 2);
  return `/* eslint-disable max-len */\nconst positions = ${json};\n\nexport default positions;\n`;
};

const PositionForm = ({ pos, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Company">
        <TextInput value={pos.company} onChange={(v) => onChange({ company: v })} placeholder="Company name" />
      </FormField>
      <FormField label="Position">
        <TextInput value={pos.position} onChange={(v) => onChange({ position: v })} placeholder="Job title" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Company Link">
        <TextInput value={pos.link} onChange={(v) => onChange({ link: v })} placeholder="https://company.com" />
      </FormField>
      <FormField label="Date Range">
        <TextInput value={pos.daterange} onChange={(v) => onChange({ daterange: v })} placeholder="February 2024 - Present" />
      </FormField>
    </div>
    <FormField label="Bullet Points">
      <div className="flex flex-col gap-2">
        {pos.points.map((point, i) => (
          <div key={i} className="flex gap-2 items-start">
            <TextInput
              multiline
              rows={2}
              value={point}
              onChange={(v) => {
                const next = [...pos.points];
                next[i] = v;
                onChange({ points: next });
              }}
            />
            <button
              type="button"
              onClick={() => onChange({ points: pos.points.filter((_, idx) => idx !== i) })}
              className="mt-2 text-red-400 hover:text-red-500 text-sm"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ points: [...pos.points, ''] })}
          className="self-start text-xs font-label bg-secondary/10 text-secondary px-3 py-1.5 rounded-lg hover:bg-secondary/20 transition-colors"
        >
          + Add bullet
        </button>
      </div>
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove position
    </button>
  </div>
);

const ResumePositionsEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_positions',
    fallbackData: positionsData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Work Positions</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} positions</p>
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
            onClick={() => { addItem(emptyPosition()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Position
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((pos, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">{pos.position || <em className="text-stone-400">Untitled</em>}</span>
                  {pos.company && <span className="ml-2 text-xs text-stone-400">@ {pos.company}</span>}
                </div>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <PositionForm pos={pos} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/resume/positions.js" />
    </div>
  );
};

export default ResumePositionsEditor;
