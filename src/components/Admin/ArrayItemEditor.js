import React from 'react';

const ArrayItemEditor = ({ items = [], renderItem, onAdd, addLabel = 'Add Item', emptyMessage = 'No items yet.' }) => (
  <div className="flex flex-col gap-3">
    {items.length === 0 && (
      <p className="text-sm text-stone-400 dark:text-stone-500 italic">{emptyMessage}</p>
    )}
    {items.map((item, index) => (
      <div
        key={index}
        className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-label uppercase tracking-widest text-stone-400">
            Item {index + 1}
          </span>
          <button
            type="button"
            onClick={() => {
              /* handled via renderItem's onRemove */
            }}
            className="hidden"
          />
        </div>
        {renderItem(
          item,
          (updated) => {
            const next = [...items];
            next[index] = typeof updated === 'string' ? updated : { ...item, ...updated };
            return next;
          },
          index
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={onAdd}
      className="self-start bg-secondary/10 text-secondary text-sm font-label px-3 py-1.5 rounded-lg hover:bg-secondary/20 transition-colors"
    >
      + {addLabel}
    </button>
  </div>
);

export default ArrayItemEditor;
