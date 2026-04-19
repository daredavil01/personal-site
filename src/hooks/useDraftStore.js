import { useState, useEffect, useRef } from 'react';

const useDraftStore = ({ storageKey, fallbackData }) => {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : fallbackData;
    } catch {
      return fallbackData;
    }
  });

  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {
        // localStorage quota exceeded — silently ignore
      }
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [items, storageKey]);

  const isDirty = JSON.stringify(items) !== JSON.stringify(fallbackData);

  const addItem = (item) => setItems((prev) => [...prev, item]);

  const updateItem = (index, updated) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updated } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderItems = (fromIndex, toIndex) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const resetToOriginal = () => {
    localStorage.removeItem(storageKey);
    setItems(fallbackData);
  };

  return { items, setItems, addItem, updateItem, removeItem, reorderItems, isDirty, resetToOriginal };
};

export default useDraftStore;
