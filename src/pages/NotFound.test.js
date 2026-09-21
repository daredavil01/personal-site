import { pathToQuery } from "./NotFound";

describe("pathToQuery", () => {
  it("turns a slug into the words it was reaching for", () => {
    expect(pathToQuery("/treks/raigad-fort")).toBe("treks raigad fort");
  });

  it("drops ids, years and one-character fragments", () => {
    expect(pathToQuery("/books/12/a-long-walk-2019")).toBe("books long walk");
  });

  it("drops repeats so one word cannot dominate the search", () => {
    expect(pathToQuery("/books/books-about-books")).toBe("books about");
  });

  it("decodes a Marathi path rather than searching for its escapes", () => {
    expect(pathToQuery("/tags/%E0%A4%95%E0%A4%BF%E0%A4%B2%E0%A5%8D%E0%A4%B2%E0%A5%87"))
      .toBe("tags किल्ले");
  });

  it("is empty for a path with nothing to search for", () => {
    expect(pathToQuery("/")).toBe("");
    expect(pathToQuery("/404")).toBe("");
  });
});
