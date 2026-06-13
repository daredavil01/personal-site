import createResource from "./_crud";

const books = createResource({
  table: "books",
  order: [{ column: "id", ascending: true }],
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    category: r.category,
    language: r.language,
    description: r.description,
    year: r.year,
    tags: r.tags ?? [],
    translator: r.translator ?? undefined,
    blog_link: r.blog_link ?? undefined,
    blog_platform: r.blog_platform ?? undefined,
  }),
  toRow: (v) => ({
    title: v.title,
    author: v.author,
    category: v.category,
    language: v.language,
    description: v.description,
    year: Number(v.year),
    tags: v.tags ?? [],
    translator: v.translator || null,
    blog_link: v.blog_link || null,
    blog_platform: v.blog_platform || null,
  }),
});

export const getBooks = books.list;
export default books;
