import { useState } from "react";
import { createShare } from "../../lib/api/askShares";

// Sharing the whole conversation, from either of the two places that offer it.
//
// One share per thread: the token is held here and reused, so pressing Share in
// the answer row and then again above the input does not leave two rows behind
// pointing at the same conversation.
export default function useShareThread() {
  const [state, setState] = useState({ url: null, status: null, note: null });

  const reset = () => setState({ url: null, status: null, note: null });

  const share = async ({ turns, types, turnstileToken }) => {
    if (state.status === "sharing") return;

    let { url } = state;
    if (!url) {
      setState({ url: null, status: "sharing", note: null });
      try {
        const out = await createShare({ turns, types, turnstileToken });
        url = out.url;
      } catch (err) {
        setState({ url: null, status: "error", note: err.message });
        return;
      }
    }

    // The native sheet is the point on a phone, which is where these links get
    // pasted. Desktop and any refusal fall through to the clipboard.
    try {
      if (navigator.share) {
        await navigator.share({ title: "A conversation with the archive", url });
        setState({ url, status: "shared", note: null });
        return;
      }
    } catch (_) {
      // Dismissing the sheet is not a failure — fall through to copying.
    }

    try {
      await navigator.clipboard?.writeText(url);
      setState({ url, status: "copied", note: null });
    } catch (_) {
      // No clipboard either: show the link so it can be copied by hand.
      setState({ url, status: "manual", note: url });
    }
  };

  return { ...state, share, reset };
}
