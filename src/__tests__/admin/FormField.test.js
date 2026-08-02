import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FormField, {
  toDateInput, fromDateInput, toDdmmyyyyInput, fromDdmmyyyyInput,
} from "../../pages/admin/FormField";

// The three date types each serialize to a different stored format, and every
// public reader parses the stored string directly — so a change in any of these
// is a data change, not a display change.
describe("date serialization", () => {
  it("round-trips the Sports 'Month DD, YYYY' format", () => {
    expect(toDateInput("February 22, 2026")).toBe("2026-02-22");
    expect(fromDateInput("2026-02-22")).toBe("February 22, 2026");
  });

  it("round-trips the Treks DD-MM-YYYY format", () => {
    expect(toDdmmyyyyInput("17-02-2019")).toBe("2019-02-17");
    expect(fromDdmmyyyyInput("2019-02-17")).toBe("17-02-2019");
  });

  it("pads single-digit days and months coming out of the stored format", () => {
    expect(toDdmmyyyyInput("7-2-2019")).toBe("2019-02-07");
  });

  it("returns empty rather than a bad date for unparseable input", () => {
    expect(toDateInput("")).toBe("");
    expect(toDateInput("not a date")).toBe("");
    // "2026--07-09" is the malformed value this picker exists to prevent.
    expect(toDdmmyyyyInput("2026--07-09")).toBe("");
    expect(toDdmmyyyyInput("")).toBe("");
  });
});

const renderField = (field, value, onChange = () => {}) => render(
  <FormField field={field} value={value} onChange={onChange} />,
);

describe("FormField", () => {
  it("writes back DD-MM-YYYY from the ddmmyyyy picker", () => {
    const onChange = jest.fn();
    const { container } = renderField({ name: "date", type: "ddmmyyyy" }, "17-02-2019", onChange);
    const input = container.querySelector("input[type=date]");
    expect(input.value).toBe("2019-02-17");

    fireEvent.change(input, { target: { value: "2020-12-01" } });
    expect(onChange).toHaveBeenCalledWith("date", "01-12-2020");
  });

  it("stores the isoDate picker's own value verbatim", () => {
    const onChange = jest.fn();
    const { container } = renderField({ name: "blog_date", type: "isoDate" }, "2026-07-09", onChange);
    fireEvent.change(container.querySelector("input[type=date]"), { target: { value: "2026-07-10" } });
    expect(onChange).toHaveBeenCalledWith("blog_date", "2026-07-10");
  });

  it("passes required through to the control, so empty submits are blocked", () => {
    const { container } = renderField({ name: "title", type: "text", required: true }, "");
    expect(container.querySelector("input")).toBeRequired();
  });

  describe("tags", () => {
    it("adds on Enter and dedupes case-insensitively", () => {
      const onChange = jest.fn();
      renderField({ name: "tags", type: "tags" }, ["running"], onChange);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "Cycling" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith("tags", ["running", "Cycling"]);

      onChange.mockClear();
      fireEvent.change(input, { target: { value: "RUNNING" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith("tags", ["running"]);
    });

    it("splits a pasted comma-separated string", () => {
      const onChange = jest.fn();
      renderField({ name: "tags", type: "tags" }, [], onChange);
      fireEvent.paste(screen.getByRole("textbox"), {
        clipboardData: { getData: () => "one, two ,three" },
      });
      expect(onChange).toHaveBeenCalledWith("tags", ["one", "two", "three"]);
    });

    it("removes the last chip on Backspace in an empty input", () => {
      const onChange = jest.fn();
      renderField({ name: "tags", type: "tags" }, ["a", "b"], onChange);
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Backspace" });
      expect(onChange).toHaveBeenCalledWith("tags", ["a"]);
    });
  });

  describe("selectOrOther", () => {
    it("reveals a free-text box with the field's own placeholder", () => {
      renderField(
        {
          name: "distance",
          type: "selectOrOther",
          options: ["10 Kms", "21 Kms"],
          otherPlaceholder: "Enter custom distance",
        },
        "8 Kms",
      );
      expect(screen.getByPlaceholderText("Enter custom distance")).toHaveValue("8 Kms");
    });

    it("falls back to a generic placeholder when the field doesn't set one", () => {
      renderField({ name: "platform", type: "selectOrOther", options: ["Substack"] }, "Bear");
      expect(screen.getByPlaceholderText("Enter a value")).toBeInTheDocument();
    });
  });

  describe("image", () => {
    it("shows a thumbnail for the current URL and can clear it", () => {
      const onChange = jest.fn();
      renderField({ name: "image", type: "image" }, "https://example.com/a.jpg", onChange);
      expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/a.jpg");

      fireEvent.click(screen.getByRole("button", { name: "Clear image" }));
      expect(onChange).toHaveBeenCalledWith("image", "");
    });

    it("flags a URL that fails to load instead of showing an empty box", () => {
      renderField({ name: "image", type: "image" }, "https://example.com/missing.jpg");
      fireEvent.error(screen.getByRole("img"));
      expect(screen.getByText("This URL didn't load.")).toBeInTheDocument();
    });
  });

  describe("slideImages", () => {
    const SLIDES = [
      { url: "a.jpg", caption: "One" },
      { url: "b.jpg", caption: "Two" },
    ];

    it("reorders rows and keeps the ends disabled", () => {
      const onChange = jest.fn();
      renderField({ name: "slideImages", type: "slideImages" }, SLIDES, onChange);

      expect(screen.getByRole("button", { name: "Move slide 1 up" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Move slide 2 down" })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Move slide 2 up" }));
      expect(onChange).toHaveBeenCalledWith("slideImages", [SLIDES[1], SLIDES[0]]);
    });

    it("removes a row", () => {
      const onChange = jest.fn();
      renderField({ name: "slideImages", type: "slideImages" }, SLIDES, onChange);
      fireEvent.click(screen.getByRole("button", { name: "Remove slide 1" }));
      expect(onChange).toHaveBeenCalledWith("slideImages", [SLIDES[1]]);
    });
  });

  it("reports invalid JSON inline instead of swallowing it", () => {
    const onChange = jest.fn();
    renderField({ name: "sections", type: "json" }, { a: 1 }, onChange);
    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "{ nope" } });
    expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(textarea, { target: { value: '{"a":2}' } });
    expect(onChange).toHaveBeenCalledWith("sections", { a: 2 });
  });
});
