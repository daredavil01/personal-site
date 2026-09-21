// Books — one chunk per book.
//
// Same reasoning as trek.mjs and sport.mjs: the labelled line is keyword-rich
// about columns ("Language: Marathi") and silent about the words a reader uses
// ("read", "book by", "novel"). Books already retrieve better than any other
// type, because most book rows carry a description; the sentence is here so the
// ones without a description are not left as ten labels and a title.
// Status is reported as it stands rather than assumed finished: "read" for a
// book he has not read yet would be a fact invented by the indexer.
function bookSentence(r, clean) {
  const title = clean(r.title);
  if (!title) return null;
  const author = clean(r.author);
  const language = clean(r.language);
  const category = clean(r.category);
  const year = clean(r.year);
  const status = clean(r.status).toLowerCase();

  const what = [language, category, "book"].filter(Boolean).join(" ");
  const by = author ? ` by ${author}` : "";
  const head = `${title} is a ${what}${by}.`;
  const shelf = status && status !== "read"
    ? ` It is on his reading list, marked ${status}.`
    : ` He read it${year ? ` in ${year}` : ""}.`;
  return `${head}${shelf}`;
}

export default {
  type: "book",
  load: (ctx) => ctx.fetchAll("books"),
  toChunks: (rows, { compose, clean, entityUrl, storageUrl }) => rows.map((r) => ({
    entity_type: "book",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("book", r.id),
    chunk_date: r.date_finished || null,
    tags: r.tag_names || [],
    image_url: storageUrl(r.cover_url || r.cover || null),
    body: compose([
      ["Book", r.title],
      ["Author", r.author],
      ["Translator", r.translator],
      ["Category", r.category],
      ["Language", r.language],
      ["Status", r.status],
      ["Year read", r.year],
      ["Rating", r.rating ? `${r.rating}/5` : null],
      ["Publisher", r.publisher],
      ["Format", r.format],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.description],
      ["Quote", r.quote],
      ["Note", r.note],
      ["Review", r.blog_link],
      [null, bookSentence(r, clean)],
    ]),
  })),
};
