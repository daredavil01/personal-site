import { collectMedia, sanitiseAnswer, stripMarkdownImages } from "./askFormat";

const sources = [
  { title: "Pune Marathon", url: "/sports/4", image: "https://x.supabase.co/storage/v1/object/public/media/sports/pune.jpeg" },
  { title: "An essay", url: "https://sankettambare.substack.com/p/essay", image: null },
];

describe("sanitiseAnswer", () => {
  it("keeps links and images that came from retrieved items", () => {
    const text = "See [the race](/sports/4) and [the essay](https://sankettambare.substack.com/p/essay).\n"
      + "![finish](https://x.supabase.co/storage/v1/object/public/media/sports/pune.jpeg)";
    expect(sanitiseAnswer(text, sources)).toBe(text);
  });

  it("normalises full site URLs to paths", () => {
    expect(sanitiseAnswer("[race](https://sankettambare.in/sports/4)", sources)).toBe("[race](/sports/4)");
  });

  it("strips invented or injected links, keeping the words", () => {
    const text = "Read [this](https://evil.example/phish) or https://evil.example/x. ![x](https://evil.example/a.png)";
    expect(sanitiseAnswer(text, sources)).toBe("Read this or .");
  });

  it("leaves bare citations alone", () => {
    expect(sanitiseAnswer("He ran it [1].", sources)).toBe("He ran it [1].");
  });

  it("refuses to use an item's photo as a link target", () => {
    // With the Books chip on, one answer linked "Ghangad Fort" to a book cover.
    const text = `[Ghangad Fort](${sources[0].image})`;
    expect(sanitiseAnswer(text, sources)).toBe("Ghangad Fort");
  });

  it("refuses to show a page url as a picture", () => {
    expect(sanitiseAnswer("![race](/sports/4)", sources)).toBe("");
  });

  it("allows roster urls from the facts card", () => {
    const text = "He climbed [Jivdhan](/treks/7).";
    expect(sanitiseAnswer(text, sources, ["/treks/7"])).toBe(text);
    expect(sanitiseAnswer(text, sources)).toBe("He climbed Jivdhan.");
  });
});

describe("collectMedia", () => {
  it("collects cited source images, deduped", () => {
    const media = collectMedia("Ran it [1], twice [1]. Wrote about it [2].", sources);
    expect(media).toEqual([{ url: sources[0].image, alt: "Pune Marathon", href: "/sports/4" }]);
  });

  it("ignores inline images that belong to no source", () => {
    expect(collectMedia("![x](https://evil.example/a.png)", sources)).toEqual([]);
  });
});

it("stripMarkdownImages removes images for plain-text copy", () => {
  expect(stripMarkdownImages("Hi\n\n![a](/b.png)\n\nBye")).toBe("Hi\n\nBye");
});
