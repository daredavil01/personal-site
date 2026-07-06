import createResource from "./_crud";
import { toStorageImages } from "../supabaseClient";

const sports = createResource({
  table: "sports",
  order: [{ column: "id", ascending: true }],
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    description: r.description,
    place: r.place,
    distance: r.distance,
    time: r.time,
    timeCertificateLink: r.time_certificate_link,
    bibNumber: r.bib_number,
    slideImages: toStorageImages(r.slide_images),
    created_at: r.created_at,
  }),
  toRow: (v) => ({
    title: v.title,
    date: v.date,
    description: v.description,
    place: v.place,
    distance: v.distance,
    time: v.time,
    time_certificate_link: v.timeCertificateLink || null,
    bib_number: v.bibNumber || null,
    slide_images: v.slideImages ?? [],
  }),
});

export const getSports = sports.list;
export default sports;
