import React, { useState } from "react";
import ShareImageModal from "./ShareImageModal";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// Action trigger styled to match the sibling Share / Copy / Permalink controls.
// Opens the customization popup that exports `item` (of type `kind`) as a PNG.
// Renders nothing when there is no item (e.g. between modal selections).
const ShareImageButton = ({ kind, item, label = "Image" }) => {
  const [open, setOpen] = useState(false);
  if (!item) return null;
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={keyActivate(() => setOpen(true))}
        className="flex cursor-pointer items-center gap-1 font-label text-xs uppercase tracking-widest text-stone-400 transition-colors hover:text-secondary dark:text-stone-500"
        title="Share as image"
      >
        <span className="material-symbols-outlined text-sm">image</span>
        {label}
      </div>
      {open && <ShareImageModal kind={kind} item={item} onClose={() => setOpen(false)} />}
    </>
  );
};

export default ShareImageButton;
