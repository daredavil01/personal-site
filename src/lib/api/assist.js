// Client side of functions/api/assist.js — authoring help in /admin.
//
// Same shape as the judge call in askConversations.js and for the same reason:
// GEMINI_API_KEY is a Cloudflare secret, so the model cannot be called from the
// browser. This reads the session token and hands it to the endpoint, which
// verifies it with is_owner() before spending anything.

import { supabase } from "../supabaseClient";

async function call(payload, signedOutNote) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error(signedOutNote);

  const res = await fetch("/api/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.note || body.error || `assist ${res.status}`);
  return body;
}

/**
 * A draft for one long-text field.
 *
 * `values` is the row as the form currently holds it and `examples` are the
 * same field's text on other rows, which is what keeps the draft in the site's
 * voice. Returns the text — the caller puts it in the input, and nothing is
 * saved until the author presses Save.
 */
export default async function draftField({ resource, field, label, values, examples }) {
  const body = await call(
    { task: "draft", resource, field, label, values, examples },
    "Signed out — sign in again to draft text.",
  );
  return body.draft;
}

/**
 * Tags for a row, as `{ suggested, maybe }`.
 *
 * Both lists hold names that already exist centrally — the endpoint intersects
 * the model's answer with the `tags` table — so accepting one can never create
 * a tag by accident. Creating one stays a deliberate act: type it.
 */
export async function suggestTags({ resource, field, values }) {
  const body = await call(
    { task: "tags", resource, field, values },
    "Signed out — sign in again to suggest tags.",
  );
  return { suggested: body.suggested || [], maybe: body.maybe || [] };
}

/** Base64 of a File, without the data: prefix. */
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

/**
 * One sentence of alt text for an image, from the compressed bytes that were
 * just uploaded — not from the URL, which the model would have to fetch.
 *
 * `context` is what the image belongs to (a race title, a fort name), used only
 * to steer the description; the model is told to describe what it can see and
 * not to name a place it cannot.
 */
export async function describeImage(file, context) {
  const body = await call(
    { task: "alt", mimeType: file.type, data: await toBase64(file), context },
    "Signed out — sign in again to write alt text.",
  );
  return body.alt;
}
