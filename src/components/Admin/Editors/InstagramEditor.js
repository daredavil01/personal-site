import React, { useState } from 'react';
import instagramData from '../../../data/instagram';
import useDraftStore from '../../../hooks/useDraftStore';
import { jsSerialize } from '../utils/jsSerialize';
import FormField from '../FormField';
import TextInput from '../TextInput';
import TagsInput from '../TagsInput';
import ArrayItemEditor from '../ArrayItemEditor';
import ExportPanel from '../ExportPanel';

const emptyPost = () => ({
  title: '',
  tags: [],
  caption: '',
  slideImages: [],
});

const templateFn = (items) =>
  `const { PUBLIC_URL } = process.env;\n\nconst instagramPosts = ${jsSerialize(items)};\n\nexport default instagramPosts;\n`;

const SlideForm = ({ slide, onChange, onRemove }) => (
  <div className="flex flex-col gap-3">
    <FormField label="Image path" hint="e.g. /images/insta_posts/8_1.heic">
      <TextInput
        value={slide.url?.replace(/^.*\/images\//, '/images/') ?? ''}
        onChange={(v) => onChange({ ...slide, url: v.startsWith('/') ? v : `/${v}` })}
        placeholder="/images/insta_posts/post_1.jpg"
      />
    </FormField>
    <FormField label="Caption">
      <TextInput value={slide.caption} onChange={(v) => onChange({ ...slide, caption: v })} placeholder="Slide 1" />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">Remove slide</button>
  </div>
);

const PostForm = ({ post, index, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <FormField label="Title">
      <TextInput value={post.title} onChange={(v) => onChange({ title: v })} placeholder="Post title" />
    </FormField>
    <FormField label="Caption">
      <TextInput multiline rows={3} value={post.caption} onChange={(v) => onChange({ caption: v })} />
    </FormField>
    <FormField label="Tags">
      <TagsInput tags={post.tags} onChange={(tags) => onChange({ tags })} />
    </FormField>
    <FormField label="Slide Images">
      <ArrayItemEditor
        items={post.slideImages}
        addLabel="Add Slide"
        emptyMessage="No slides yet."
        onAdd={() => {
          const n = post.slideImages.length + 1;
          onChange({ slideImages: [...post.slideImages, { url: '', caption: `Slide ${n}` }] });
        }}
        renderItem={(slide, _, i) => (
          <SlideForm
            slide={slide}
            onChange={(updated) => {
              const next = [...post.slideImages];
              next[i] = updated;
              onChange({ slideImages: next });
            }}
            onRemove={() => onChange({ slideImages: post.slideImages.filter((_, idx) => idx !== i) })}
          />
        )}
      />
    </FormField>
    <button type="button" onClick={onRemove} className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors">Remove post</button>
  </div>
);

const InstagramEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_instagram',
    fallbackData: instagramData,
  });
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Instagram</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} posts</p>
        </div>
        <div className="flex gap-3">
          {isDirty && <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">Reset to original</button>}
          <button type="button" onClick={() => { addItem(emptyPost()); setExpandedIndex(items.length); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
            + Add Post
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((post, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button type="button" onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                <span className="font-body text-sm text-stone-900 dark:text-stone-100">{post.title || <em className="text-stone-400">Untitled</em>}</span>
                <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <PostForm post={post} index={i} onChange={(patch) => updateItem(i, patch)} onRemove={() => { removeItem(i); setExpandedIndex(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/instagram.js" />
    </div>
  );
};

export default InstagramEditor;
