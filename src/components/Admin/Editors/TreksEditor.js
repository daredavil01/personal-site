import React, { useState, useRef } from 'react';
import treksData from '../../../data/treks';
import useDraftStore from '../../../hooks/useDraftStore';
import { jsSerialize } from '../utils/jsSerialize';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ArrayItemEditor from '../ArrayItemEditor';
import ExportPanel from '../ExportPanel';

const LEVELS = ['Easy', 'Medium', 'Hard'];

const emptyTrek = (id) => ({
  id,
  fort_name: '',
  trek_time: '2 Hrs',
  endurance_level: 'Medium',
  date: '',
  slideImages: [],
});

const templateFn = (items) => {
  const body = jsSerialize(items);
  return `const { PUBLIC_URL } = process.env;\n\nconst treks = ${body};\n\nexport default treks;\n`;
};

const suggestTrekFilename = (fortName, photoIndex) => {
  const name = (fortName || 'fort')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('_');
  return `${name}_${photoIndex + 1}.jpg`;
};

const PhotoForm = ({ photo, onChange, onRemove, fortName, photoIndex }) => {
  const fileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadHref, setDownloadHref] = useState(null);
  const suggestedName = suggestTrekFilename(fortName || '', photoIndex);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setDownloadHref(objUrl);
    onChange({ ...photo, url: `/images/treks/${suggestedName}` });
  };

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Image" hint="Select a file, download with the suggested name, then move to public/images/treks/">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs font-label px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
            >
              Choose File
            </button>
            <span className="text-xs text-stone-400 font-body">
              Suggested name: <code className="text-secondary">{suggestedName}</code>
            </span>
            {downloadHref && (
              <a
                href={downloadHref}
                download={suggestedName}
                className="text-xs font-label px-3 py-1.5 rounded bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
              >
                ↓ Download as {suggestedName}
              </a>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="h-24 w-auto rounded object-cover border border-stone-200 dark:border-stone-700"
            />
          )}
        </div>
      </FormField>
      <FormField label="Image path" hint="Auto-filled on file select; edit manually if needed">
        <TextInput
          value={photo.url?.replace(/^.*\/images\//, '/images/') ?? ''}
          onChange={(v) => onChange({ ...photo, url: v.startsWith('/') ? v : `/${v}` })}
          placeholder="/images/treks/fort_name_1.jpg"
        />
      </FormField>
      <FormField label="Caption">
        <TextInput value={photo.caption} onChange={(v) => onChange({ ...photo, caption: v })} placeholder="Slide 1" />
      </FormField>
      <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
        Remove photo
      </button>
    </div>
  );
};

const TrekForm = ({ trek, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Fort / Location Name">
        <TextInput value={trek.fort_name} onChange={(v) => onChange({ fort_name: v })} placeholder="Tikona" />
      </FormField>
      <FormField label="Trek Duration">
        <TextInput value={trek.trek_time} onChange={(v) => onChange({ trek_time: v })} placeholder="2 Hrs" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Endurance Level">
        <select
          value={trek.endurance_level}
          onChange={(e) => onChange({ endurance_level: e.target.value })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </FormField>
      <FormField label="Date" hint="DD-MM-YYYY">
        <TextInput value={trek.date} onChange={(v) => onChange({ date: v })} placeholder="17-02-2019" />
      </FormField>
    </div>
    <FormField label="Blog Link" hint="Leave blank if none">
      <TextInput
        value={trek.blog_link ?? ''}
        onChange={(v) => onChange({ blog_link: v || undefined })}
        placeholder="https://..."
      />
    </FormField>
    <FormField label="Photos">
      <ArrayItemEditor
        items={trek.slideImages}
        addLabel="Add Photo"
        emptyMessage="No photos yet."
        onAdd={() => {
          const n = trek.slideImages.length + 1;
          onChange({ slideImages: [...trek.slideImages, { url: '', caption: `Slide ${n}` }] });
        }}
        renderItem={(photo, _unused, index) => (
          <PhotoForm
            photo={photo}
            fortName={trek.fort_name}
            photoIndex={index}
            onChange={(updated) => {
              const next = [...trek.slideImages];
              next[index] = updated;
              onChange({ slideImages: next });
            }}
            onRemove={() => onChange({ slideImages: trek.slideImages.filter((_p, idx) => idx !== index) })}
          />
        )}
      />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove this trek
    </button>
  </div>
);

const TreksEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_treks',
    fallbackData: treksData,
  });
  const [expandedId, setExpandedId] = useState(null);

  const nextId = items.length > 0 ? Math.max(...items.map((t) => t.id)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Treks</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} treks</p>
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">
              Reset to original
            </button>
          )}
          <button
            type="button"
            onClick={() => { addItem(emptyTrek(nextId)); setExpandedId(nextId); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Trek
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((trek, i) => {
          const isOpen = expandedId === trek.id;
          return (
            <div key={trek.id} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : trek.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">
                    {trek.fort_name || <em className="text-stone-400">Unnamed</em>}
                  </span>
                  {trek.date && <span className="ml-2 text-xs text-stone-400">{trek.date}</span>}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${trek.endurance_level === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : trek.endurance_level === 'Hard' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                    {trek.endurance_level}
                  </span>
                </div>
                <span className="text-stone-400 text-xs ml-4">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <TrekForm
                    trek={trek}
                    onChange={(patch) => updateItem(i, patch)}
                    onRemove={() => { removeItem(i); setExpandedId(null); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/treks.js" />
    </div>
  );
};

export default TreksEditor;
