// Saved Social kits (0036_social_kits.sql) and the feed the form pulls from.
//
// Owner-only under RLS, read and written straight from the browser — there is
// no endpoint, because nothing here spends anything: the prompts are filled from
// templates (src/lib/socialPrompts.js) and the owner runs them in ChatGPT.

import { supabase } from "../supabaseClient";
import { cleanText } from "../logbook";
import { htmlToText, normaliseUrl } from "../htmlText";

const fromRow = (r) => ({
  id: r.id,
  url: r.blog_url,
  title: r.title,
  subtitle: r.subtitle || "",
  content: r.content || "",
  language: r.language,
  source: r.source,
  options: r.options || {},
  prompts: r.prompts || {},
  templateVersion: r.template_version,
  edited: !!r.edited,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Every saved kit, most recently touched first (without the post text). */
export async function listSocialKits() {
  const { data, error } = await supabase
    .from("social_kits")
    .select("id,blog_url,title,language,source,template_version,edited,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(fromRow);
}

export async function getSocialKit(id) {
  const { data, error } = await supabase.from("social_kits").select("*").eq("id", id).single();
  if (error) throw error;
  return fromRow(data);
}

/** Creates or updates the one kit for this post (matched on its normalised URL). */
export async function saveSocialKit(kit) {
  const row = {
    blog_url: kit.url.trim(),
    url_key: normaliseUrl(kit.url.trim()),
    title: kit.title.trim(),
    subtitle: kit.subtitle?.trim() || null,
    content: kit.content || null,
    language: kit.language === "Marathi" ? "Marathi" : "English",
    source: kit.source === "rss" ? "rss" : "pasted",
    options: kit.options || {},
    prompts: kit.prompts || {},
    template_version: kit.templateVersion,
    edited: !!kit.edited,
  };
  const { data, error } = await supabase
    .from("social_kits")
    .upsert(row, { onConflict: "url_key" })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteSocialKit(id) {
  const { error } = await supabase.from("social_kits").delete().eq("id", id);
  if (error) throw error;
}

/**
 * The Substack feed's latest posts with their text, through the RSS proxy
 * (functions/rss-feed.js — Substack blocks CORS). The body arrives as HTML and
 * becomes text here, in the browser, where it costs the Worker nothing.
 */
export async function getFeedPosts() {
  const res = await fetch("/rss-feed?full=1");
  if (!res.ok) throw new Error(`The feed could not be read (${res.status}).`);
  const { items = [] } = await res.json();
  return items.map((item) => ({
    url: item.link,
    key: normaliseUrl(item.link),
    title: item.title || "",
    subtitle: item.description || "",
    date: item.pubDate || null,
    image: item.image || null,
    // Paragraph by paragraph, so Substack's "Share" / "Subscribe" lines drop
    // out (logbook's cleanText) without merging the paragraphs.
    content: htmlToText(item.html || "")
      .split(/\n{2,}/)
      .map(cleanText)
      .filter(Boolean)
      .join("\n\n"),
  }));
}
