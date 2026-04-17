import React, { useState } from 'react';
import sportsData from '../../../data/sports';
import useDraftStore from '../../../hooks/useDraftStore';
import { jsSerialize } from '../utils/jsSerialize';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ArrayItemEditor from '../ArrayItemEditor';
import ExportPanel from '../ExportPanel';

const DISTANCES = ['5K', '10K', '21K', '21 Kms', '35 Kms', '42 Kms', '50 Kms'];

const emptyRace = (id) => ({
  id,
  title: '',
  date: '',
  description: '',
  place: '',
  distance: '10K',
  time: '00:00:00',
  timeCertificateLink: null,
  bibNumber: '',
  slideImages: [],
});

const emptySlide = () => ({ url: '', caption: 'Slide 1' });

const normalizeUrl = (url) => {
  if (!url) return '';
  // Strip the PUBLIC_URL prefix for storage; jsSerialize re-adds it on export
  return url.replace(/^.*\/images\//, '/images/');
};

const templateFn = (items) =>
  `const { PUBLIC_URL } = process.env; // set automatically from package.json:homepage\n\nconst sportsData = ${jsSerialize(items)};\n\nexport default sportsData;\n`;

const SlideForm = ({ slide, onChange, onRemove }) => (
  <div className="flex flex-col gap-3">
    <FormField label="Image path" hint="e.g. /images/sports/nda_2023_1.jpeg">
      <TextInput
        value={normalizeUrl(slide.url)}
        onChange={(v) => onChange({ ...slide, url: v.startsWith('/') ? v : `/${v}` })}
        placeholder="/images/sports/event_year_1.jpeg"
      />
    </FormField>
    <FormField label="Caption">
      <TextInput value={slide.caption} onChange={(v) => onChange({ ...slide, caption: v })} placeholder="Slide 1" />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove slide
    </button>
  </div>
);

const RaceForm = ({ race, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Race Title">
        <TextInput value={race.title} onChange={(v) => onChange({ title: v })} placeholder="NDA Marathon 2023" />
      </FormField>
      <FormField label="Date" hint="Month DD, YYYY">
        <TextInput value={race.date} onChange={(v) => onChange({ date: v })} placeholder="October 15, 2023" />
      </FormField>
    </div>
    <FormField label="Description">
      <TextInput multiline rows={2} value={race.description} onChange={(v) => onChange({ description: v })} />
    </FormField>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Place">
        <TextInput value={race.place} onChange={(v) => onChange({ place: v })} placeholder="NDA, Pune" />
      </FormField>
      <FormField label="Distance">
        <select
          value={race.distance}
          onChange={(e) => onChange({ distance: e.target.value })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {DISTANCES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Finish Time" hint="HH:MM:SS">
        <TextInput value={race.time} onChange={(v) => onChange({ time: v })} placeholder="01:26:40" />
      </FormField>
      <FormField label="Bib Number">
        <TextInput value={race.bibNumber} onChange={(v) => onChange({ bibNumber: v })} placeholder="10214" />
      </FormField>
    </div>
    <FormField label="Certificate Link" hint="Leave blank if none">
      <TextInput
        value={race.timeCertificateLink ?? ''}
        onChange={(v) => onChange({ timeCertificateLink: v || null })}
        placeholder="https://..."
      />
    </FormField>
    <FormField label="Slide Images">
      <ArrayItemEditor
        items={race.slideImages}
        addLabel="Add Slide"
        emptyMessage="No images yet."
        onAdd={() => {
          const n = race.slideImages.length + 1;
          onChange({ slideImages: [...race.slideImages, { url: '', caption: `Slide ${n}` }] });
        }}
        renderItem={(slide, getNext, index) => (
          <SlideForm
            slide={slide}
            onChange={(updated) => {
              const next = [...race.slideImages];
              next[index] = updated;
              onChange({ slideImages: next });
            }}
            onRemove={() => {
              onChange({ slideImages: race.slideImages.filter((_, i) => i !== index) });
            }}
          />
        )}
      />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove this race
    </button>
  </div>
);

const SportsEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_sports',
    fallbackData: sportsData,
  });
  const [expandedId, setExpandedId] = useState(null);

  const nextId = items.length > 0 ? Math.max(...items.map((r) => r.id)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Sports</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} races</p>
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">
              Reset to original
            </button>
          )}
          <button
            type="button"
            onClick={() => { addItem(emptyRace(nextId)); setExpandedId(nextId); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Race
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((race, i) => {
          const isOpen = expandedId === race.id;
          return (
            <div key={race.id} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : race.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">
                    {race.title || <em className="text-stone-400">Untitled</em>}
                  </span>
                  {race.date && <span className="ml-2 text-xs text-stone-400">{race.date}</span>}
                  {race.distance && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">{race.distance}</span>}
                </div>
                <span className="text-stone-400 text-xs ml-4">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <RaceForm
                    race={race}
                    onChange={(patch) => updateItem(i, patch)}
                    onRemove={() => { removeItem(i); setExpandedId(null); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/sports.js" />
    </div>
  );
};

export default SportsEditor;
