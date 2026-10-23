import {
  countHtmlWords, decodeEntities, htmlToText, normaliseUrl,
} from "./htmlText";

describe("htmlText", () => {
  it("turns a post body into paragraphs of plain text", () => {
    const html = "<h2>The climb</h2><p>Rain &amp; mud at <b>Rajgad</b>.</p><p>Second&nbsp;para<br>new line</p><script>x()</script>";
    expect(htmlToText(html)).toBe("The climb\n\nRain & mud at Rajgad .\n\nSecond para\n\nnew line");
  });

  it("decodes numeric and named entities", () => {
    expect(decodeEntities("&#2352;&#x93E; &rsquo;s &hellip; &unknown;")).toBe("रा ’s … &unknown;");
  });

  it("counts words the same way the ledger always has", () => {
    expect(countHtmlWords("<p>one two</p><style>a{}</style><p>three</p>")).toBe(3);
    expect(countHtmlWords("")).toBe(0);
  });

  it("matches a Substack post across hosts by its slug", () => {
    expect(normaliseUrl("https://sankettambare.substack.com/p/rajgad?utm_source=x"))
      .toBe(normaliseUrl("https://www.example.in/p/rajgad/"));
    expect(normaliseUrl("https://daredavil453624413.wordpress.com/2019/05/01/post/"))
      .toBe("daredavil453624413.wordpress.com/2019/05/01/post");
    expect(normaliseUrl("")).toBeNull();
  });
});
