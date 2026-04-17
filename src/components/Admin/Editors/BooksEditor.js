import React, { useState } from 'react';
import booksData from '../../../data/books';
import useDraftStore from '../../../hooks/useDraftStore';
import FormField from '../FormField';
import TextInput from '../TextInput';
import TagsInput from '../TagsInput';
import ExportPanel from '../ExportPanel';

const LANGUAGES = ['English', 'Marathi', 'Hindi', 'Other'];
const PLATFORMS = ['', 'Substack', 'Medium', 'WordPress', 'Blogger', 'Canva'];

const emptyBook = (id) => ({
  id,
  title: '',
  author: '',
  category: '',
  language: 'English',
  translator: null,
  blog_link: null,
  blog_platform: null,
  description: '',
  year: new Date().getFullYear(),
  tags: [],
});

const templateFn = (items) => {
  const json = JSON.stringify(items, null, 2);
  return `/* eslint-disable max-len */\nconst books = ${json};\n\nexport default books;\n`;
};

const BookForm = ({ book, onChange, onRemove }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Title">
        <TextInput value={book.title} onChange={(v) => onChange({ title: v })} placeholder="Book title" />
      </FormField>
      <FormField label="Author">
        <TextInput value={book.author} onChange={(v) => onChange({ author: v })} placeholder="Author name" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Category" hint="Comma-separated, e.g. Non-Fiction,Technology">
        <TextInput value={book.category} onChange={(v) => onChange({ category: v })} placeholder="Non-Fiction,Technology" />
      </FormField>
      <FormField label="Language">
        <select
          value={book.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Translator" hint="Leave blank if none">
        <TextInput
          value={book.translator ?? ''}
          onChange={(v) => onChange({ translator: v || null })}
          placeholder="Translator name"
        />
      </FormField>
      <FormField label="Year">
        <TextInput
          type="number"
          value={book.year}
          onChange={(v) => onChange({ year: parseInt(v, 10) || book.year })}
          placeholder="2024"
        />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Blog Link" hint="Leave blank if none">
        <TextInput
          value={book.blog_link ?? ''}
          onChange={(v) => onChange({ blog_link: v || null })}
          placeholder="https://..."
        />
      </FormField>
      <FormField label="Blog Platform">
        <select
          value={book.blog_platform ?? ''}
          onChange={(e) => onChange({ blog_platform: e.target.value || null })}
          className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 text-sm font-body text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none"
        >
          {PLATFORMS.map((p) => <option key={p} value={p}>{p || '— None —'}</option>)}
        </select>
      </FormField>
    </div>
    <FormField label="Description">
      <TextInput multiline rows={3} value={book.description} onChange={(v) => onChange({ description: v })} placeholder="2–4 sentence description" />
    </FormField>
    <FormField label="Tags">
      <TagsInput tags={book.tags} onChange={(tags) => onChange({ tags })} />
    </FormField>
    <button
      type="button"
      onClick={onRemove}
      className="self-start text-xs text-red-400 hover:text-red-500 font-label transition-colors"
    >
      Remove this book
    </button>
  </div>
);

const BooksEditor = () => {
  const { items, addItem, updateItem, removeItem, isDirty, resetToOriginal } = useDraftStore({
    storageKey: 'admin_draft_books',
    fallbackData: booksData,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const nextId = items.length > 0 ? Math.max(...items.map((b) => b.id)) + 1 : 1;

  const filtered = items.filter(
    (b) =>
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">Books</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body mt-0.5">{items.length} entries</p>
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <button type="button" onClick={resetToOriginal} className="text-xs font-label text-stone-400 hover:text-red-400 transition-colors">
              Reset to original
            </button>
          )}
          <button
            type="button"
            onClick={() => { addItem(emptyBook(nextId)); setExpandedId(nextId); }}
            className="bg-secondary text-white text-sm font-label px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            + Add Book
          </button>
        </div>
      </div>

      <TextInput value={search} onChange={setSearch} placeholder="Search by title or author…" />

      <div className="flex flex-col gap-3">
        {filtered.map((book, i) => {
          const realIndex = items.indexOf(book);
          const isOpen = expandedId === book.id;
          return (
            <div key={book.id} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : book.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <div>
                  <span className="font-body text-sm text-stone-900 dark:text-stone-100">
                    {book.title || <em className="text-stone-400">Untitled</em>}
                  </span>
                  {book.author && (
                    <span className="ml-2 text-xs text-stone-400">— {book.author}</span>
                  )}
                </div>
                <span className="text-stone-400 text-xs ml-4">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                  <BookForm
                    book={book}
                    onChange={(patch) => updateItem(realIndex, patch)}
                    onRemove={() => { removeItem(realIndex); setExpandedId(null); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPanel items={items} templateFn={templateFn} fileName="src/data/books.js" />
    </div>
  );
};

export default BooksEditor;
