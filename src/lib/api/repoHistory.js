import { supabase } from "../supabaseClient";

// Reads for /changelog/graph (0029_repo_history.sql). Written nightly by
// `npm run repo:sync` from the local clone — nothing here calls GitHub.
//
// Every query names its columns. `repo_commits` is ~800 rows and the page needs
// three different slices of it; selecting `*` three times would ship the commit
// subjects to a chart that only counts days.

const PAGE = 1000;

/** Paginated select — PostgREST caps an unbounded select at 1000 rows. */
async function selectAll(table, columns, narrow = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await narrow(supabase.from(table).select(columns))
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * One row per commit: the date and its line counts, nothing else. Feeds the
 * contribution heatmap, the code-frequency chart and the all-time totals.
 */
export async function getCommitActivity() {
  return selectAll(
    "repo_commits",
    "authored_on, additions, deletions, files, parents",
    (q) => q.order("authored_on", { ascending: true }),
  );
}

/**
 * The newest `limit` commits with their parents and subjects, for the DAG.
 * The whole history is 787 commits and 60 merges — drawn at once it is a wall,
 * so the graph shows a window and the rail carries the long view.
 */
export async function getCommitGraph(limit = 100) {
  const { data, error } = await supabase
    .from("repo_commits")
    .select("sha, parents, authored_on, author, subject, additions, deletions, files")
    .order("authored_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Every version with what it cost, newest first — without the `changes` blob,
 * which is the prose /changelog renders and this page never shows.
 *
 * `lines_added` is null for a version that shipped in a commit another version
 * is measured on (v18.1.1 and v18.1.2 both landed in 3ab94b2). Null is not
 * zero: the page says which version it shipped with instead of drawing a bar
 * of nothing.
 */
export async function getVersionStats() {
  const { data, error } = await supabase
    .from("changelog")
    .select("version, released_on, major, minor, patch, commit_sha, lines_added, lines_removed, files_changed, commit_count, entry_count")
    .order("major", { ascending: false })
    .order("minor", { ascending: false })
    .order("patch", { ascending: false });
  if (error) throw error;
  return data || [];
}

export default { getCommitActivity, getCommitGraph, getVersionStats };
