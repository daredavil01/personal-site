// Loads the rows the /stats numbers are computed from, through PostgREST with
// the publishable key — so row-level security applies exactly as it does for a
// visitor (hidden projects never count).
//
// Shared by the /api/stats Pages Function and, in Node, by the /ask indexer
// and build-docs when the endpoint is unreachable. Dependency-free by contract:
// plain fetch, no supabase-js, so esbuild can bundle it into the worker.

const PAGE = 1000;

async function selectAll(base, headers, fetchImpl, table, params) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    // PostgREST caps an unpaged select at 1000 rows; microblog is past that.
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchImpl(
      `${base}/rest/v1/${table}?${params}&limit=${PAGE}&offset=${offset}`,
      { headers },
    );
    if (!res.ok) throw new Error(`${table} ${res.status}`);
    // eslint-disable-next-line no-await-in-loop
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

// eslint-disable-next-line import/prefer-default-export
export async function loadSiteStatsInput({ url, key, fetchImpl = fetch }) {
  if (!url || !key) throw new Error("loadSiteStatsInput needs a Supabase url and publishable key");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  const get = (table, params) => selectAll(url, headers, fetchImpl, table, params);
  const withTags = "select=*,tag_names&order=id.asc";
  // Résumé tables in display order: "latest certification" is the first row.
  const bySort = "select=*&order=sort_order.asc,id.asc";

  const [
    books, blogs, sports, treks, instagram, projects,
    positions, degrees, certifications, skills, micro, tags,
  ] = await Promise.all([
    get("books", "select=*,tag_names&order=date_finished.desc.nullslast,id.asc"),
    get("blogs", withTags),
    get("sports", withTags),
    get("treks", withTags),
    get("instagram", withTags),
    // Same order as src/lib/api/projects.js: the page shows the first three.
    get("projects", "select=*,tag_names&order=featured.desc,date.desc.nullslast,id.desc"),
    get("resume_positions", bySort),
    get("resume_degrees", bySort),
    get("resume_certifications", bySort),
    get("resume_skills", bySort),
    get("microblog", "select=date&order=id.asc"),
    fetchImpl(`${url}/rest/v1/rpc/tags_with_counts`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    }).then((res) => {
      if (!res.ok) throw new Error(`tags_with_counts ${res.status}`);
      return res.json();
    }),
  ]);

  return {
    books,
    blogs,
    sports,
    treks,
    instagram,
    projects,
    resume: { positions, degrees, certifications, skills },
    microDates: micro.map((r) => r.date),
    tags,
  };
}
