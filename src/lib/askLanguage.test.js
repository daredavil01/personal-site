import { replyLanguage, wantsMarathi, withReplyLanguage } from "./askLanguage";

describe("replyLanguage", () => {
  it("answers in English by default", () => {
    expect(replyLanguage("Which marathons has Sanket run in the last 6 months?")).toBe("Reply in English.");
    expect(replyLanguage("")).toBe("Reply in English.");
    expect(replyLanguage(null)).toBe("Reply in English.");
  });

  it("answers in Marathi only when asked", () => {
    expect(replyLanguage("Tell me about his books, in Marathi please")).toBe("Reply in Marathi.");
    expect(replyLanguage("MARATHI please")).toBe("Reply in Marathi.");
    expect(replyLanguage("मराठीत सांगा, तो किती धावला?")).toBe("Reply in Marathi.");
  });

  it("keeps a Devanagari question in its own language", () => {
    expect(replyLanguage("संकेत किती मॅरेथॉन धावला?")).toBe("Reply in the same language as this question.");
  });

  it("trusts a spoken question's language over its Latin script", () => {
    expect(replyLanguage("tyane kiti marathon kelya", "mr")).toBe("Reply in the language this question was spoken in.");
    expect(replyLanguage("how many marathons, in Marathi", "en")).toBe("Reply in Marathi.");
  });

  it("does not read 'marathon' as Marathi", () => {
    expect(wantsMarathi("Marathon training plans")).toBe(false);
    expect(wantsMarathi("marathons in Pune")).toBe(false);
  });
});

describe("withReplyLanguage", () => {
  it("appends the instruction on its own line", () => {
    expect(withReplyLanguage("Which books?")).toBe("Which books?\n\n(Reply in English.)");
  });
});
