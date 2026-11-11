import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { bookShape } from "./shapes";
import BookSpread from "./BookSpread";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// A book taken down and laid open, without losing your place on the shelf.
// Tab is trapped, Escape closes, focus goes back to the spine that opened it,
// and ← → turn to the neighbouring books. Portalled to <body> so no shell's
// stacking context can sit on top of it.
const BookDetailsModal = ({
  isOpen, onClose, book, onStep,
}) => {
  const dialogRef = useRef(null);
  const restoreFocusTo = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    restoreFocusTo.current = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = "auto";
      if (restoreFocusTo.current instanceof HTMLElement) restoreFocusTo.current.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (onStep && (e.key === "ArrowRight" || e.key === "ArrowLeft")
        && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        onStep(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, onStep]);

  if (!isOpen || !book) return null;

  return createPortal(
    <div className="bk-sheet">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="bk-sheet__veil" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="book-modal-title" className="bk-sheet__dialog" key={book.id}>
        <button type="button" onClick={onClose} aria-label="Close" className="bk-sheet__close">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <BookSpread book={book} titleId="book-modal-title" permalink>
          {onStep && (
            <p className="bk-small flex items-center justify-between gap-3 pt-2" style={{ borderTop: "1px solid var(--bk-rule)" }}>
              <button type="button" onClick={() => onStep(-1)} className="bg-transparent border-0 p-0 bk-small cursor-pointer min-h-[44px]">← Previous</button>
              <span className="hidden sm:inline normal-case tracking-normal">← → to walk along the shelf</span>
              <button type="button" onClick={() => onStep(1)} className="bg-transparent border-0 p-0 bk-small cursor-pointer min-h-[44px]">Next →</button>
            </p>
          )}
        </BookSpread>
      </div>
    </div>,
    document.body,
  );
};

BookDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  book: bookShape,
  onStep: PropTypes.func,
};

BookDetailsModal.defaultProps = { book: null, onStep: null };

export default BookDetailsModal;
