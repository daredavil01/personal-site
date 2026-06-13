import createResource from "./_crud";
import { toStorageImages } from "../supabaseClient";

const instagram = createResource({
  table: "instagram",
  order: [{ column: "id", ascending: true }],
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    caption: r.caption,
    tags: r.tags ?? [],
    slideImages: toStorageImages(r.slide_images),
  }),
  toRow: (v) => ({
    title: v.title,
    caption: v.caption,
    tags: v.tags ?? [],
    slide_images: v.slideImages ?? [],
  }),
});

export const getInstagram = instagram.list;
export default instagram;
