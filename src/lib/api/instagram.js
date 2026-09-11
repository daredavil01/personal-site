import createResource from "./_crud";
import { toStorageImages } from "../supabaseClient";

const instagram = createResource({
  table: "instagram",
  order: [{ column: "id", ascending: true }],
  tagType: "instagram",
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    caption: r.caption,
    tags: r.tag_names ?? [],
    slideImages: toStorageImages(r.slide_images),
  }),
  toRow: (v) => ({
    title: v.title,
    caption: v.caption,
    slide_images: v.slideImages ?? [],
  }),
});

export const getInstagram = instagram.list;
export default instagram;
