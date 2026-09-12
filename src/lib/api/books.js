import createResource from "./_crud";
import { toStorageUrl } from "../supabaseClient";

// `year` is the year the book was READ; `first_published` is the book's own
// publication year. They were the same column until 0008 and were never the
// same number.

// Kept in step with the books_category_check constraint in
// supabase/migrations/0008_books_reborn.sql — a value outside this list is
// rejected by Postgres, not silently stored.
export const BOOK_CATEGORIES = [
  "Fiction", "Non-fiction", "Technology", "Public Policy", "Philosophy",
  "Psychology & Self-Help", "Biography & Memoir", "Society", "History",
  "Sports", "Travel & Adventure",
];

export const BOOK_STATUSES = ["read", "reading", "abandoned", "want-to-read"];
export const BOOK_FORMATS = ["paperback", "hardcover", "ebook", "audiobook"];

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const books = createResource({
  table: "books",
  // Newest read first. Rows with no finish date sink rather than leading.
  order: [{ column: "date_finished", ascending: false, nullsFirst: false }],
  tagType: "book",
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    category: r.category,
    language: r.language,
    description: r.description,
    year: r.year,
    tags: r.tag_names ?? [],
    translator: r.translator ?? undefined,
    blog_link: r.blog_link ?? undefined,
    blog_platform: r.blog_platform ?? undefined,
    cover_url: toStorageUrl(r.cover_url),
    isbn: r.isbn ?? undefined,
    page_count: r.page_count ?? undefined,
    publisher: r.publisher ?? undefined,
    first_published: r.first_published ?? undefined,
    rating: r.rating ?? undefined,
    date_finished: r.date_finished ?? undefined,
    date_precision: r.date_precision ?? "year",
    status: r.status ?? "read",
    format: r.format ?? undefined,
    goodreads_url: r.goodreads_url ?? undefined,
    quote: r.quote ?? undefined,
    note: r.note ?? undefined,
    created_at: r.created_at,
  }),
  toRow: (v) => ({
    title: v.title,
    author: v.author,
    category: v.category,
    language: v.language,
    description: v.description,
    year: Number(v.year),
    translator: v.translator || null,
    blog_link: v.blog_link || null,
    blog_platform: v.blog_platform || null,
    cover_url: v.cover_url || null,
    isbn: v.isbn || null,
    page_count: num(v.page_count),
    publisher: v.publisher || null,
    first_published: num(v.first_published),
    rating: num(v.rating),
    date_finished: v.date_finished || null,
    date_precision: v.date_precision || "year",
    status: v.status || "read",
    format: v.format || null,
    goodreads_url: v.goodreads_url || null,
    quote: v.quote || null,
    note: v.note || null,
  }),
});

export const getBooks = books.list;
export default books;
