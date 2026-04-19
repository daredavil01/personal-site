import React, { useState } from 'react';
import hundredDaysData from '../../../data/100DaysToOffload';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import TagsInput from '../TagsInput';
import ExportPanel from '../ExportPanel';

const PLATFORMS = ['Substack', 'Medium', 'Ghost', 'WordPress', 'Other'];
const LANGUAGES = ['English', 'Marathi'];

const emptyPost = (id) => ({
  id,
  blog_title: '',
  blog_description: '',
  challenge_id: '100_days_to_offload',
  blog_tags: [],
  blog_date: new Date().toISOString().slice(0, 10),
  blog_link: '',
  blog_platform: 'Substack',
  language: 'English',
});

const templateFn = (items) => {
  const json = JSON.stringify(items, null, 2);
  return `/* eslint-disable max-len */\nconst blogs = ${json};\n\nexport default blogs;\n`;
};

const PostForm = ({ post, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <FormField label="Title">
      <TextInput value={post.blog_title} onChange={(v) => onChange({ blog_title: v })} placeholder="Post title" />
    </FormField>
    <FormField label="Description">
      <TextInput multiline rows={3} value={post.blog_description} onChange={(v) => onChange({ blog_description: v })} />
    </FormField>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Date" hint="YYYY-MM-DD">
        <TextInput value={post.blog_date} onChange={(v) => onChange({ blog_date: v })} placeholder="2024-01-15" />
      </FormField>
      <FormField label="Language">
        <select
          value={post.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Blog Link">
        <TextInput value={post.blog_link} onChange={(v) => onChange({ blog_link: v })} placeholder="https://..." />
      </FormField>
      <FormField label="Platform">
        <select
          value={post.blog_platform}
          onChange={(e) => onChange({ blog_platform: e.target.value })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </FormField>
    </div>
    <FormField label="Tags">
      <TagsInput tags={post.blog_tags} onChange={(tags) => onChange({ blog_tags: tags })} />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">
      Remove post
    </button>
  </div>
);

const HundredDaysEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_hundreddays',
    fallbackData: hundredDaysData,
  });
  const [expandedId, setExpandedId] = useState(null);

  const nextId = items.length > 0 ? Math.max(...items.map((p) => p.id)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">100 Days To Offload</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} posts</p>
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
            onClick={() => { addItem(emptyPost(nextId)); setExpandedId(nextId); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Post
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((post, i) => {
          const isOpen = expandedId === post.id;
          return (
            <div key={post.id} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : post.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">{post.blog_title || <em className="text-stone-400">Untitled</em>}</span>
                  {post.blog_date && <span className="ml-2 text-xs text-stone-400">{post.blog_date}</span>}
                  <span className="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded">{post.blog_platform}</span>
                </div>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <PostForm post={post} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedId(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/100DaysToOffload.js" />
    </div>
  );
};

export default HundredDaysEditor;
