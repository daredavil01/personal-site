import React, { useState } from 'react';
import certificationsData from '../../../data/resume/certifications';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import ExportPanel from '../ExportPanel';

const emptyCert = () => ({ name: '', link: '', source: '', issuedDate: '' });

const templateFn = (items) =>
  `const certifications = ${JSON.stringify(items, null, 2)};\n\nexport default certifications;\n`;

const CertForm = ({ cert, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <FormField label="Certification Name">
      <TextInput value={cert.name} onChange={(v) => onChange({ name: v })} placeholder="AWS Certified Solutions Architect" />
    </FormField>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Issuing Organization">
        <TextInput value={cert.source} onChange={(v) => onChange({ source: v })} placeholder="Amazon Web Services" />
      </FormField>
      <FormField label="Issued Date">
        <TextInput value={cert.issuedDate} onChange={(v) => onChange({ issuedDate: v })} placeholder="May 2022" />
      </FormField>
    </div>
    <FormField label="Certificate Link">
      <TextInput value={cert.link} onChange={(v) => onChange({ link: v })} placeholder="https://..." />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove certification
    </button>
  </div>
);

const ResumeCertificationsEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_certifications',
    fallbackData: certificationsData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Certifications</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} certifications</p>
        </div>
        <div className="flex gap-3">
          {isDirty && <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">Reset to original</button>}
          <button type="button" onClick={() => { addItem(emptyCert()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
            + Add Certification
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((cert, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button type="button" onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">{cert.name || <em className="text-stone-400">Untitled</em>}</span>
                  {cert.source && <span className="ml-2 text-xs text-stone-400">— {cert.source}</span>}
                </div>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <CertForm cert={cert} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/resume/certifications.js" />
    </div>
  );
};

export default ResumeCertificationsEditor;
