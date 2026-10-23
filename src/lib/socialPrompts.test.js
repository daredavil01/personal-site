import {
  BANNER_PRESETS, IMAGE_SIZES, MAX_CONTENT_CHARS, bannerSize, buildSocialPrompts, clampText,
  hasDevanagari, headlineTooLong,
} from "./socialPrompts";

const POST = {
  url: "https://sankettambare.substack.com/p/rajgad-in-the-rain",
  title: "Climbing Rajgad in the rain",
  subtitle: "What a wet fort taught me about patience",
  content: "The rain started at the base village.\n\nBy Padmavati Machi the path was a stream.",
  language: "English",
  headline: "Patience at Rajgad",
  subhead: "A wet fort, a slow climb",
  style: "editorial",
  palette: "brand",
  banner: "substack",
  sizes: ["portrait", "story", "landscape"],
  linkedinLink: "comment",
};

const allPrompts = (p) => [p.notes, p.linkedin, p.share, p.combined, ...Object.values(p.images)];

describe("socialPrompts", () => {
  it("builds a text prompt per platform, a combined one, and one image prompt per size", () => {
    const p = buildSocialPrompts(POST);
    expect(Object.keys(p.images)).toEqual(["banner", "portrait", "story", "landscape"]);
    expect(p.notes).toMatch(/SUBSTACK NOTES/);
    expect(p.linkedin).toMatch(/LINKEDIN POST/);
    expect(p.share).toMatch(/WHATSAPP/);
    ["SUBSTACK NOTES", "LINKEDIN POST", "WHATSAPP / FACEBOOK / THREADS"].forEach((h) => expect(p.combined).toContain(h));
  });

  it("puts the post in every text prompt and the title in every image prompt", () => {
    const p = buildSocialPrompts(POST);
    [p.notes, p.linkedin, p.share, p.combined].forEach((text) => {
      expect(text).toContain(`Title: "${POST.title}"`);
      expect(text).toContain(`Subtitle: "${POST.subtitle}"`);
      expect(text).toContain(`Link: ${POST.url}`);
      expect(text).toContain("By Padmavati Machi the path was a stream.");
      expect(text).toContain("Write in English");
    });
    Object.values(p.images).forEach((text) => expect(text).toContain(`"${POST.title}"`));
  });

  it("leaves no unfilled placeholder anywhere", () => {
    allPrompts(buildSocialPrompts(POST)).forEach((text) => {
      expect(text).not.toMatch(/\$\{|\{[a-z]+\}|undefined|null|NaN/);
    });
  });

  it("locks the graphic's text in quotes, verbatim, with each size's canvas", () => {
    const p = buildSocialPrompts(POST);
    Object.values(p.images).forEach((text) => {
      expect(text).toContain('Headline: "Patience at Rajgad"');
      expect(text).toContain('Subhead: "A wet fort, a slow climb"');
      expect(text).toMatch(/verbatim, each line exactly once/);
      expect(text).toMatch(/AVOID: any other text/);
    });
    expect(p.images.banner).toContain("1456×1048 pixels, 14:10 landscape");
    IMAGE_SIZES.forEach((size) => expect(p.images[size.key]).toContain(`${size.w}×${size.h} pixels, ${size.ratio}`));
    // Only the story keeps text clear of the app's buttons.
    expect(p.images.story).toMatch(/top 250 px/);
    expect(p.images.portrait).not.toMatch(/top 250 px/);
  });

  it("drops the subhead lines when there is no subhead", () => {
    const p = buildSocialPrompts({ ...POST, subhead: "" });
    expect(p.images.banner).not.toMatch(/Subhead:/);
    expect(p.images.banner).not.toMatch(/the subhead smaller/);
  });

  it("writes Marathi posts in Marathi and warns the image model about Devanagari", () => {
    const p = buildSocialPrompts({ ...POST, language: "Marathi", headline: "राजगडावर पाऊस" });
    expect(p.linkedin).toMatch(/Write in Marathi, in Devanagari script/);
    expect(p.images.banner).toMatch(/Reproduce every letter and vowel sign exactly/);
    expect(buildSocialPrompts(POST).images.banner).not.toMatch(/Devanagari/);
  });

  it("moves the LinkedIn link between the first comment and the post", () => {
    expect(buildSocialPrompts(POST).linkedin).toMatch(/FIRST COMMENT:/);
    const inPost = buildSocialPrompts({ ...POST, linkedinLink: "post" }).linkedin;
    expect(inPost).not.toMatch(/FIRST COMMENT:/);
    expect(inPost).toMatch(/on its own line just before the hashtags/);
  });

  it("keeps the Threads post itself link-free and puts the link in a reply", () => {
    const { share } = buildSocialPrompts(POST);
    expect(share).toMatch(/THREADS: at most 500 characters and WITHOUT the link/);
    expect(share).toMatch(/THREADS REPLY: .*rajgad-in-the-rain/);
  });

  it("makes only the chosen sizes, and a custom banner with its reduced ratio", () => {
    const p = buildSocialPrompts({
      ...POST, sizes: ["story"], banner: "custom", customW: 1500, customH: 1000,
    });
    expect(Object.keys(p.images)).toEqual(["banner", "story"]);
    expect(p.images.banner).toContain("1500×1000 pixels, 3:2 landscape");
    expect(bannerSize({ banner: "custom", customW: 10, customH: 10 })).toBeNull();
    expect(Object.keys(buildSocialPrompts({ ...POST, banner: "custom" }).images)).not.toContain("banner");
    expect(BANNER_PRESETS.map((b) => b.key)).toEqual(["substack", "wide", "card", "custom"]);
  });

  it("clamps a long post at a paragraph and says it did", () => {
    const para = "word ".repeat(400).trim();
    const long = Array.from({ length: 12 }, () => para).join("\n\n");
    const { text, truncated } = clampText(long, MAX_CONTENT_CHARS);
    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(MAX_CONTENT_CHARS);
    expect(text.endsWith("word")).toBe(true);
    expect(buildSocialPrompts({ ...POST, content: long }).linkedin).toMatch(/The post continues/);
    expect(clampText("short", 100)).toEqual({ text: "short", truncated: false });
  });

  it("cuts one over-long paragraph at a sentence", () => {
    const { text } = clampText(`${"A sentence here. ".repeat(50)}`, 100);
    expect(text.endsWith(".")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(100);
  });

  it("flags long headlines and Devanagari text for the form", () => {
    expect(headlineTooLong("one two three four five six")).toBe(false);
    expect(headlineTooLong("one two three four five six seven")).toBe(true);
    expect(hasDevanagari("राजगड")).toBe(true);
    expect(hasDevanagari("Rajgad")).toBe(false);
  });
});
