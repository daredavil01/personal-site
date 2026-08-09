import { supabase } from "../supabaseClient";

const BUCKET = "media";

// Uploads a File to the public `media` bucket and returns its public URL.
// `folder` groups uploads by content type, e.g. "sports", "treks".
//
// Callers hand this the output of `src/lib/imageCompress.js`, which rewraps the
// compressed bytes in a real File with a corrected extension — the stored path
// is derived from `file.name` below, so a bare Blob would land as `.undefined`.
export default async function uploadImage(file, folder = "uploads") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safe = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const path = `${folder}/${Date.now()}-${safe}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
