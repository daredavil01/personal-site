// Cover resolution, shared by the gallery, the spotlight, the modal, the detail
// page and the OG-tag builders — they must all agree or a shared link shows a
// different image than the page.
//
// `image` is optional since 0005, so the first screenshot stands in for it.
export const coverFor = (project) => project?.image
  || (project?.slideImages ?? []).find((s) => s?.url)?.url
  || "";

/** Every image a card can cycle through on hover: cover first, then screenshots. */
export const previewFrames = (project) => {
  const frames = [];
  const cover = coverFor(project);
  if (cover) frames.push(cover);
  (project?.slideImages ?? []).forEach((s) => {
    if (s?.url && !frames.includes(s.url)) frames.push(s.url);
  });
  return frames;
};
