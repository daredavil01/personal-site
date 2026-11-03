// Which language /ask answers in. The prompt used to say only "answer in the
// language the question was asked in", and with Marathi sources, a Marathi
// spelling of the name and earlier Marathi answers in the thread, the model
// often decided an English question was Marathi. So the rule is pinned on the
// question itself:
//
//   asks for Marathi ("in Marathi", "मराठीत")   → Marathi
//   written in Devanagari                        → the question's own language
//   spoken (Whisper heard a language)            → the language it was spoken in
//   anything else                                → English
//
// "Marathon" is not a request for Marathi: the Latin check is a whole word.
// Imported by functions/api/ask.js, so it stays import-free.

const DEVANAGARI = /[ऀ-ॿ]/;

export const wantsMarathi = (q) => /\bmarathi\b|मराठी/i.test(String(q || ""));

export function replyLanguage(q, spokenLanguage = null) {
  if (wantsMarathi(q)) return "Reply in Marathi.";
  if (DEVANAGARI.test(String(q || ""))) return "Reply in the same language as this question.";
  // Romanised Marathi is typed in Latin letters, so a spoken question trusts
  // what Whisper heard over the script.
  if (spokenLanguage) return "Reply in the language this question was spoken in.";
  return "Reply in English.";
}

// The question as the model sees it. Only the model: retrieval, ask_log and
// the ?q= link keep the raw question.
export const withReplyLanguage = (q, spokenLanguage = null) => `${q}\n\n(${replyLanguage(q, spokenLanguage)})`;
