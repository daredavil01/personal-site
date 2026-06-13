import createResource from "./_crud";
import { toStorageImages } from "../supabaseClient";

const treks = createResource({
  table: "treks",
  order: [{ column: "id", ascending: true }],
  fromRow: (r) => ({
    id: r.id,
    fort_name: r.fort_name,
    trek_time: r.trek_time,
    endurance_level: r.endurance_level,
    date: r.date,
    blog_link: r.blog_link ?? undefined,
    slideImages: toStorageImages(r.slide_images),
  }),
  toRow: (v) => ({
    fort_name: v.fort_name,
    trek_time: v.trek_time,
    endurance_level: v.endurance_level,
    date: v.date,
    blog_link: v.blog_link || null,
    slide_images: v.slideImages ?? [],
  }),
});

export const getTreks = treks.list;
export default treks;
