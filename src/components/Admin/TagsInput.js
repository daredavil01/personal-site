import React, { useState } from 'react';

const TagsInput = ({ tags = [], onChange }) => {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index) => onChange(tags.filter((_, i) => i !== index));

  return (
    <div className="flex flex-wrap gap-1.5 items-center bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 min-h-[38px] focus-within:border-secondary transition-colors">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-secondary/10 text-secondary text-xs font-label px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-secondary/60 hover:text-secondary leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] bg-transparent text-sm font-body text-stone-900 dark:text-stone-100 focus:outline-none placeholder:text-stone-400"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags, press Enter…' : ''}
      />
    </div>
  );
};

export default TagsInput;
