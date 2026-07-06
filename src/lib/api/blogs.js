import createResource from "./_crud";

// 100 Days To Offload posts.
const blogs = createResource({
  table: "blogs",
  order: [{ column: "id", ascending: true }],
  fromRow: (r) => ({
    id: r.id,
    blog_title: r.blog_title,
    blog_description: r.blog_description,
    challenge_id: r.challenge_id,
    blog_tags: r.blog_tags ?? [],
    blog_date: r.blog_date,
    blog_link: r.blog_link,
    blog_platform: r.blog_platform,
    language: r.language,
    created_at: r.created_at,
  }),
  toRow: (v) => ({
    blog_title: v.blog_title,
    blog_description: v.blog_description,
    challenge_id: v.challenge_id || "100_days_to_offload",
    blog_tags: v.blog_tags ?? [],
    blog_date: v.blog_date,
    blog_link: v.blog_link,
    blog_platform: v.blog_platform,
    language: v.language,
  }),
});

export const getBlogs = blogs.list;
export default blogs;
