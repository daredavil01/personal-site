import React, { Suspense, lazy } from "react";
import { createPortal } from "react-dom";

// "Share as image" for every entry on the site — micro-posts, books, blogs,
// races, treks, Instagram posts, /ask answers and newsletter issues. The API is
// unchanged (`kind`, `item`, `onClose`), so every caller keeps working; the
// studio itself (ShareStudio.js, its themes, layouts and fonts) is split into
// its own chunk and fetched only when someone opens it.
const ShareStudio = lazy(() => import("./ShareStudio"));

const Loading = ({ onClose }) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-950/70 backdrop-blur-sm" onClick={onClose}>
    <span className="rounded-full bg-white px-4 py-2 font-label text-xs font-bold uppercase tracking-widest text-stone-500 shadow dark:bg-stone-900">
      Opening the studio…
    </span>
  </div>
);

// Portalled to <body>: hosts style their action rows aggressively (the race
// page's `[&_*]:!text-inherit` painted every word of the card white) and some
// sit inside transformed modals, which would trap `position: fixed`. Outside
// the host, the studio and its capture node see only their own styles.
const ShareImageModal = (props) => {
  const studio = (
    <Suspense fallback={<Loading onClose={props.onClose} />}>
      <ShareStudio {...props} />
    </Suspense>
  );
  return typeof document === "undefined" ? studio : createPortal(studio, document.body);
};

export default ShareImageModal;
