// For a real <a href> that opens something in place: a plain click opens it
// (a modal, a sheet) without navigating; a modified click — new tab, new
// window, download — and any crawler follow the href as a link should.
export const isPlainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export const openOnPlainClick = (open) => (e) => {
  if (!isPlainClick(e)) return;
  e.preventDefault();
  open();
};

export default openOnPlainClick;
