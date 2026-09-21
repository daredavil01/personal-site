import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { aiFeatureOn } from "../../data/askConfig";

// The switchboard is one jsonb column on the ask_settings singleton (0024), so
// reading it is one small query — but a form with six draftable fields would
// otherwise fire six. One module-level promise, resolved once per page load;
// the admin is a single-page app and the flags are not edited from another tab.
let pending = null;

async function read() {
  try {
    const { data } = await supabase
      .from("ask_settings")
      .select("ai_features")
      .eq("id", 1)
      .maybeSingle();
    return data?.ai_features || {};
  } catch (_) {
    // A failed read means off, not on — the same bargain the endpoint makes.
    return {};
  }
}

function loadFlags() {
  if (!pending) pending = read();
  return pending;
}

/** Forgets the cached read, so a save at /admin/ask/settings takes effect. */
export function refreshAiFeatures() {
  pending = null;
}

/**
 * Whether one AI feature may run, for hiding a control the endpoint would
 * refuse anyway. The endpoint checks the same flag against the database — this
 * is presentation, not enforcement.
 */
export default function useAiFeature(key) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let live = true;
    loadFlags().then((flags) => {
      if (live) setOn(aiFeatureOn({ ai_features: flags }, key));
    });
    return () => { live = false; };
  }, [key]);

  return on;
}
