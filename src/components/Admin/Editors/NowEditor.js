import React, { useState, useEffect, useRef } from 'react';
import { nowData as fallbackData, nowMeta as fallbackMeta } from '../../../data/now-data';
import useDraftStore from '../../../hooks/useDraftStore';
import { jsSerialize } from '../utils/jsSerialize';
import FormField from '../FormField';
import TextInput from '../TextInput';

// ── constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PLATFORMS = ['Substack', 'WordPress', 'Medium', 'Ghost', 'Blogger', 'Other'];

const currentYear = new Date().getFullYear();

// ── helpers ──────────────────────────────────────────────────────────────────

const emptyMonth = (month, year) => ({
  month,
  year,
  isCurrent: true,
  sections: {},
});

const btn = (extra = '') => `text-xs font-label px-3 py-1.5 rounded transition-colors ${extra}`;

const addBtn = btn('bg-secondary/10 text-secondary hover:bg-secondary/20');
const removeBtn = 'text-xs text-red-400 hover:text-red-500 font-label transition-colors';
const sectionHeader = 'flex items-center justify-between mb-3';

// ── tiny sub-components ──────────────────────────────────────────────────────

const StringListEditor = ({ items = [], onChange, placeholder = 'Add item…' }) => (
  <div className="flex flex-col gap-2">
    {items.map((val, i) => (
      <div key={i} className="flex gap-2 items-start">
        <textarea
          value={val}
          onChange={(e) => {
            const next = [...items];
            next[i] = e.target.value;
            onChange(next);
          }}
          rows={2}
          className="flex-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none resize-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          className={removeBtn}
        >
          ✕
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...items, ''])}
      className={`self-start ${addBtn}`}
    >
      + Add Item
    </button>
  </div>
);

// ── section editors ──────────────────────────────────────────────────────────

const BlogsEditor = ({ blogs = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...blogs];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ title: '', url: null, description: '', platform: 'Substack', wip: false });

  return (
    <div className="flex flex-col gap-4">
      {blogs.map((b, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <FormField label="Title">
            <TextInput value={b.title} onChange={(v) => update(i, { title: v })} placeholder="Blog title" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="URL" hint="Leave blank if WIP">
              <TextInput
                value={b.url ?? ''}
                onChange={(v) => update(i, { url: v || null })}
                placeholder="https://..."
              />
            </FormField>
            <FormField label="Platform">
              <select
                value={b.platform ?? 'Substack'}
                onChange={(e) => update(i, { platform: e.target.value })}
                className="w-full bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description">
            <TextInput multiline rows={2} value={b.description ?? ''} onChange={(v) => update(i, { description: v })} />
          </FormField>
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!b.wip}
                onChange={(e) => update(i, { wip: e.target.checked })}
                className="accent-secondary"
              />
              <span className="text-xs font-label text-stone-600 dark:text-stone-400">Work In Progress</span>
            </label>
            <button type="button" onClick={() => onChange(blogs.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...blogs, empty()])} className={`self-start ${addBtn}`}>
        + Add Blog
      </button>
    </div>
  );
};

const RunningEditor = ({ running = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...running];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ event: '', date: '', distance: '', time: null, note: null, link: null });

  return (
    <div className="flex flex-col gap-4">
      {running.map((r, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <FormField label="Event Name">
            <TextInput value={r.event} onChange={(v) => update(i, { event: v })} placeholder="Tata Mumbai Marathon 2026" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" hint="YYYY-MM-DD">
              <TextInput value={r.date ?? ''} onChange={(v) => update(i, { date: v || null })} placeholder="2026-01-18" />
            </FormField>
            <FormField label="Distance (km)">
              <TextInput value={r.distance ?? ''} onChange={(v) => update(i, { distance: v })} placeholder="42" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Time" hint="H:MM:SS">
              <TextInput value={r.time ?? ''} onChange={(v) => update(i, { time: v || null })} placeholder="5:00:00" />
            </FormField>
            <FormField label="Link" hint="Blog post / Strava">
              <TextInput value={r.link ?? ''} onChange={(v) => update(i, { link: v || null })} placeholder="https://..." />
            </FormField>
          </div>
          <FormField label="Note">
            <TextInput value={r.note ?? ''} onChange={(v) => update(i, { note: v || null })} placeholder="Training run on Sinhgad hills" />
          </FormField>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(running.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...running, empty()])} className={`self-start ${addBtn}`}>
        + Add Run
      </button>
    </div>
  );
};

const BooksEditor = ({ books = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...books];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ title: '', author: '', link: null });

  return (
    <div className="flex flex-col gap-4">
      {books.map((b, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <FormField label="Title">
            <TextInput value={b.title} onChange={(v) => update(i, { title: v })} placeholder="Book title" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Author">
              <TextInput value={b.author ?? ''} onChange={(v) => update(i, { author: v })} placeholder="Author name" />
            </FormField>
            <FormField label="Review Link">
              <TextInput value={b.link ?? ''} onChange={(v) => update(i, { link: v || null })} placeholder="https://..." />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(books.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...books, empty()])} className={`self-start ${addBtn}`}>
        + Add Book
      </button>
    </div>
  );
};

const EventsEditor = ({ events = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...events];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ name: '', date: null, description: '', link: null });

  return (
    <div className="flex flex-col gap-4">
      {events.map((e, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <FormField label="Event Name">
            <TextInput value={e.name} onChange={(v) => update(i, { name: v })} placeholder="Event name" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" hint="YYYY-MM-DD">
              <TextInput value={e.date ?? ''} onChange={(v) => update(i, { date: v || null })} placeholder="2026-03-03" />
            </FormField>
            <FormField label="Link">
              <TextInput value={e.link ?? ''} onChange={(v) => update(i, { link: v || null })} placeholder="https://..." />
            </FormField>
          </div>
          <FormField label="Description">
            <TextInput multiline rows={2} value={e.description ?? ''} onChange={(v) => update(i, { description: v })} />
          </FormField>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(events.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...events, empty()])} className={`self-start ${addBtn}`}>
        + Add Event
      </button>
    </div>
  );
};

const ProjectsEditor = ({ projects = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...projects];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ name: '', url: null, description: '' });

  return (
    <div className="flex flex-col gap-4">
      {projects.map((p, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Project Name">
              <TextInput value={p.name} onChange={(v) => update(i, { name: v })} placeholder="RunLog" />
            </FormField>
            <FormField label="URL">
              <TextInput value={p.url ?? ''} onChange={(v) => update(i, { url: v || null })} placeholder="https://..." />
            </FormField>
          </div>
          <FormField label="Description">
            <TextInput multiline rows={2} value={p.description ?? ''} onChange={(v) => update(i, { description: v })} />
          </FormField>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(projects.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...projects, empty()])} className={`self-start ${addBtn}`}>
        + Add Project
      </button>
    </div>
  );
};

const StatsEditor = ({ stats = {}, onChange }) => {
  const strava = stats.strava ?? {};
  const substack = stats.substack ?? {};
  const setStrava = (patch) => onChange({ ...stats, strava: { ...strava, ...patch } });
  const setSubstack = (patch) => onChange({ ...stats, substack: { ...substack, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-label uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">Strava</p>
        <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4">
          <FormField label="Activities">
            <TextInput
              value={strava.activities ?? ''}
              onChange={(v) => setStrava({ activities: v ? Number(v) : undefined })}
              placeholder="36"
            />
          </FormField>
          <FormField label="Km">
            <TextInput
              value={strava.km ?? ''}
              onChange={(v) => setStrava({ km: v ? Number(v) : undefined })}
              placeholder="145"
            />
          </FormField>
          <FormField label="Hours">
            <TextInput
              value={strava.hours ?? ''}
              onChange={(v) => setStrava({ hours: v ? Number(v) : undefined })}
              placeholder="37"
            />
          </FormField>
          <FormField label="Elevation (m)">
            <TextInput
              value={strava.elevationMeters ?? ''}
              onChange={(v) => setStrava({ elevationMeters: v ? Number(v) : undefined })}
              placeholder="1648"
            />
          </FormField>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex items-center gap-2 cursor-pointer col-span-2">
            <input
              type="checkbox"
              checked={!!strava.approximate}
              onChange={(e) => setStrava({ approximate: e.target.checked })}
              className="accent-secondary"
            />
            <span className="text-xs font-label text-stone-600 dark:text-stone-400">Approximate values</span>
          </label>
        </div>
      </div>
      <div>
        <p className="text-xs font-label uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">Substack</p>
        <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4">
          <FormField label="Views">
            <TextInput
              value={substack.views ?? ''}
              onChange={(v) => setSubstack({ views: v ? Number(v) : undefined })}
              placeholder="162"
            />
          </FormField>
          <FormField label="Subscribers">
            <TextInput
              value={substack.subscribers ?? ''}
              onChange={(v) => setSubstack({ subscribers: v ? Number(v) : undefined })}
              placeholder="28"
            />
          </FormField>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex items-center gap-2 cursor-pointer col-span-2">
            <input
              type="checkbox"
              checked={!!substack.approximate}
              onChange={(e) => setSubstack({ approximate: e.target.checked })}
              className="accent-secondary"
            />
            <span className="text-xs font-label text-stone-600 dark:text-stone-400">Approximate values</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const CertificatesEditor = ({ certificates = [], onChange }) => {
  const update = (i, patch) => {
    const next = [...certificates];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const empty = () => ({ name: '', org: '', link: null });

  return (
    <div className="flex flex-col gap-4">
      {certificates.map((c, i) => (
        <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
          <FormField label="Certificate Name">
            <TextInput value={c.name} onChange={(v) => update(i, { name: v })} placeholder="Certificate name" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Organisation">
              <TextInput value={c.org ?? ''} onChange={(v) => update(i, { org: v })} placeholder="IIT Bombay" />
            </FormField>
            <FormField label="Link">
              <TextInput value={c.link ?? ''} onChange={(v) => update(i, { link: v || null })} placeholder="https://..." />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(certificates.filter((_, idx) => idx !== i))} className={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...certificates, empty()])} className={`self-start ${addBtn}`}>
        + Add Certificate
      </button>
    </div>
  );
};

// ── section accordion within a month ────────────────────────────────────────

const SECTION_CONFIG = [
  { key: 'blogs', label: 'Blogs' },
  { key: 'running', label: 'Running' },
  { key: 'books', label: 'Books' },
  { key: 'events', label: 'Events' },
  { key: 'projects', label: 'Projects' },
  { key: 'website', label: 'Website Updates' },
  { key: 'stats', label: 'Stats' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'misc', label: 'Misc' },
];

const SectionPanel = ({ sectionKey, sections, onSectionsChange }) => {
  const [open, setOpen] = useState(false);
  const val = sections[sectionKey];
  const hasContent = sectionKey === 'stats'
    ? val && (val.strava || val.substack)
    : Array.isArray(val) && val.length > 0;

  const setSection = (next) => onSectionsChange({ ...sections, [sectionKey]: next });
  const label = SECTION_CONFIG.find((s) => s.key === sectionKey)?.label ?? sectionKey;

  return (
    <div className="border border-stone-100 dark:border-stone-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
      >
        <span className="font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {hasContent && (
            <span className="text-xs bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-label">
              {sectionKey === 'stats' ? '✓' : val.length}
            </span>
          )}
          <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="p-4">
          {sectionKey === 'blogs' && <BlogsEditor blogs={val} onChange={setSection} />}
          {sectionKey === 'running' && <RunningEditor running={val} onChange={setSection} />}
          {sectionKey === 'books' && <BooksEditor books={val} onChange={setSection} />}
          {sectionKey === 'events' && <EventsEditor events={val} onChange={setSection} />}
          {sectionKey === 'projects' && <ProjectsEditor projects={val} onChange={setSection} />}
          {sectionKey === 'website' && (
            <StringListEditor
              items={val ?? []}
              onChange={setSection}
              placeholder="Website update description…"
            />
          )}
          {sectionKey === 'stats' && (
            <StatsEditor stats={val ?? {}} onChange={setSection} />
          )}
          {sectionKey === 'certificates' && (
            <CertificatesEditor certificates={val} onChange={setSection} />
          )}
          {sectionKey === 'misc' && (
            <StringListEditor items={val ?? []} onChange={setSection} placeholder="Misc item…" />
          )}
        </div>
      )}
    </div>
  );
};

// ── month accordion ──────────────────────────────────────────────────────────

const MonthCard = ({ month, index, onUpdate, onRemove, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);

  const setSections = (sections) => onUpdate({ ...month, sections });

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-stone-900 dark:text-stone-100">
            {month.month} {month.year}
          </span>
          {month.isCurrent && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded font-label">
              Current
            </span>
          )}
          {!month.isCurrent && index === 1 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-label">
              Last Month
            </span>
          )}
        </div>
        <span className="text-stone-400 text-xs ml-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-stone-100 dark:border-stone-800 p-5 flex flex-col gap-3">
          {SECTION_CONFIG.map(({ key }) => (
            <SectionPanel
              key={key}
              sectionKey={key}
              sections={month.sections ?? {}}
              onSectionsChange={setSections}
            />
          ))}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <button type="button" onClick={onRemove} className={removeBtn}>
              Remove this month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── meta editor ──────────────────────────────────────────────────────────────

const MetaEditor = ({ meta, setMeta }) => {
  const updateRitual = (i, patch) => {
    const next = [...(meta.dailyRituals ?? [])];
    next[i] = { ...next[i], ...patch };
    setMeta({ ...meta, dailyRituals: next });
  };
  const removeRitual = (i) => { setMeta({ ...meta, dailyRituals: (meta.dailyRituals ?? []).filter((_, idx) => idx !== i) }); };
  const addRitual = () => {
    setMeta({ ...meta, dailyRituals: [...(meta.dailyRituals ?? []), { icon: 'star', label: '', description: '' }] });
  };

  return (
    <div className="flex flex-col gap-6">
      <FormField label="Intro Story">
        <TextInput
          multiline
          rows={4}
          value={meta.introStory ?? ''}
          onChange={(v) => setMeta({ ...meta, introStory: v })}
        />
      </FormField>

      <FormField label="nownownow.com Profile URL">
        <TextInput
          value={meta.nownownowUrl ?? ''}
          onChange={(v) => setMeta({ ...meta, nownownowUrl: v })}
          placeholder="https://nownownow.com/p/..."
        />
      </FormField>

      <div>
        <p className="text-xs font-label uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
          Inspired By
        </p>
        <div className="grid grid-cols-3 gap-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4">
          <FormField label="Name">
            <TextInput
              value={meta.inspiredBy?.name ?? ''}
              onChange={(v) => setMeta({ ...meta, inspiredBy: { ...(meta.inspiredBy ?? {}), name: v } })}
            />
          </FormField>
          <FormField label="LinkedIn URL">
            <TextInput
              value={meta.inspiredBy?.url ?? ''}
              onChange={(v) => setMeta({ ...meta, inspiredBy: { ...(meta.inspiredBy ?? {}), url: v } })}
            />
          </FormField>
          <FormField label="nownownow URL">
            <TextInput
              value={meta.inspiredBy?.nownownow ?? ''}
              onChange={(v) => setMeta({ ...meta, inspiredBy: { ...(meta.inspiredBy ?? {}), nownownow: v } })}
            />
          </FormField>
        </div>
      </div>

      <div>
        <p className="text-xs font-label uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
          Category Labels
        </p>
        <StringListEditor
          items={meta.categoryLabels ?? []}
          onChange={(v) => setMeta({ ...meta, categoryLabels: v })}
          placeholder="Events"
        />
      </div>

      <div>
        <div className={sectionHeader}>
          <p className="text-xs font-label uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Daily Rituals
          </p>
          <button type="button" onClick={addRitual} className={addBtn}>
            + Add Ritual
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {(meta.dailyRituals ?? []).map((r, i) => (
            <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Icon" hint="Material Symbols name">
                  <TextInput value={r.icon} onChange={(v) => updateRitual(i, { icon: v })} placeholder="directions_run" />
                </FormField>
                <FormField label="Label">
                  <TextInput value={r.label} onChange={(v) => updateRitual(i, { label: v })} placeholder="Movement" />
                </FormField>
              </div>
              <FormField label="Description">
                <TextInput value={r.description} onChange={(v) => updateRitual(i, { description: v })} />
              </FormField>
              <div className="flex justify-end">
                <button type="button" onClick={() => removeRitual(i)} className={removeBtn}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── rotate modal ─────────────────────────────────────────────────────────────

const RotateModal = ({ onConfirm, onCancel }) => {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(currentYear));

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex flex-col gap-4">
      <div>
        <p className="font-label text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
          Rotate to New Month
        </p>
        <p className="text-xs font-body text-amber-700 dark:text-amber-400">
          The current month will become "Last Month". All previous archive months remain unchanged.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="New Month">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
          >
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormField>
        <FormField label="Year">
          <TextInput value={year} onChange={setYear} placeholder="2026" />
        </FormField>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onConfirm(month, Number(year))}
          className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
        >
          Confirm Rotation
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-label text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── export panel ─────────────────────────────────────────────────────────────

const NowExportPanel = ({ nowDataItems, nowMetaData }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportCode = `export const nowMeta = ${jsSerialize(nowMetaData)};\n\nexport const nowData = ${jsSerialize(nowDataItems)};\n`;

  const copy = () => {
    navigator.clipboard.writeText(exportCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span className="font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-400">
          Export JS — src/data/now-data.js
        </span>
        <span className="text-stone-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="bg-stone-950">
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
            <span className="text-xs text-stone-400 font-body">
              Copy and paste this into{' '}
              <code className="text-secondary">src/data/now-data.js</code>, then commit &amp; push.
            </span>
            <button
              type="button"
              onClick={copy}
              className={`text-xs font-label px-3 py-1 rounded transition-colors ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-secondary/20 text-secondary hover:bg-secondary/30'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="overflow-auto p-5 text-xs text-stone-300 font-mono max-h-96">
            <code>{exportCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

// ── main component ───────────────────────────────────────────────────────────

const NowEditor = () => {
  const [activeTab, setActiveTab] = useState('months');
  const [showRotate, setShowRotate] = useState(false);

  // nowData — array of months
  const { items, setItems, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_now_data',
    fallbackData,
  });

  // nowMeta — single object
  const [meta, setMetaState] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_draft_now_meta');
      return stored ? JSON.parse(stored) : fallbackMeta;
    } catch {
      return fallbackMeta;
    }
  });
  const metaTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(metaTimerRef.current);
    metaTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('admin_draft_now_meta', JSON.stringify(meta));
      } catch { /* quota */ }
    }, 500);
    return () => clearTimeout(metaTimerRef.current);
  }, [meta]);

  const metaIsDirty = JSON.stringify(meta) !== JSON.stringify(fallbackMeta);

  const resetAll = () => {
    resetToOriginal();
    localStorage.removeItem('admin_draft_now_meta');
    setMetaState(fallbackMeta);
  };

  const handleRotate = (month, year) => {
    setItems((prev) => [
      emptyMonth(month, year),
      ...prev.map((m) => (m.isCurrent ? { ...m, isCurrent: false } : m)),
    ]);
    setShowRotate(false);
  };

  const updateMonth = (index, updated) => {
    setItems((prev) => prev.map((m, i) => (i === index ? updated : m)));
  };

  const removeMonth = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const tabCls = (tab) => `font-label text-sm px-4 py-2 rounded-lg transition-colors ${activeTab === tab ? 'bg-secondary text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Now Page</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">
            {items.length} months · {items.find((m) => m.isCurrent)?.month ?? '—'} is current
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {(isDirty || metaIsDirty) && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors"
            >
              Reset to original
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRotate((v) => !v)}
            className="bg-amber-500 text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Rotate Month →
          </button>
        </div>
      </div>

      {/* Rotate modal */}
      {showRotate && (
        <RotateModal
          onConfirm={handleRotate}
          onCancel={() => setShowRotate(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        <button type="button" onClick={() => setActiveTab('months')} className={tabCls('months')}>
          Monthly Entries
        </button>
        <button type="button" onClick={() => setActiveTab('meta')} className={tabCls('meta')}>
          Page Meta
        </button>
      </div>

      {/* Months tab */}
      {activeTab === 'months' && (
        <div className="flex flex-col gap-3">
          {items.map((month, i) => (
            <MonthCard
              key={`${month.month}-${month.year}`}
              month={month}
              index={i}
              onUpdate={(updated) => updateMonth(i, updated)}
              onRemove={() => removeMonth(i)}
              defaultOpen={month.isCurrent && i === 0}
            />
          ))}
        </div>
      )}

      {/* Meta tab */}
      {activeTab === 'meta' && (
        <MetaEditor meta={meta} setMeta={setMetaState} />
      )}

      {/* Export */}
      <NowExportPanel nowDataItems={items} nowMetaData={meta} />
    </div>
  );
};

export default NowEditor;
