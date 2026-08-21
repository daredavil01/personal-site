import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FormField, {
  toDateInput, fromDateInput, toDdmmyyyyInput, fromDdmmyyyyInput,
} from "../../pages/admin/FormField";
import { compressImage } from "../../lib/imageCompress";
import uploadImage from "../../lib/api/storage";

// The upload path talks to a canvas and to Supabase, neither of which exists
// under jsdom. The compressor's own logic is covered in lib/imageCompress.test.js;
// what's under test here is that FormField reports what came back.
jest.mock("../../lib/api/storage", () => jest.fn());
jest.mock("../../lib/imageCompress", () => ({
  ...jest.requireActual("../../lib/imageCompress"),
  compressImage: jest.fn(),
}));

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

    // The field used to refuse anything over 300 KB and tell the user to go
    // compress it by hand. It compresses for them now, so the old instruction
    // would be a lie.
    it("promises automatic compression rather than a size limit", () => {
      renderField({ name: "image", type: "image" }, "");
      expect(screen.queryByText(/Max 300 KB/)).not.toBeInTheDocument();
      expect(screen.getByText(/resized and compressed automatically/)).toBeInTheDocument();
    });

    describe("upload", () => {
      const pick = (container, file) => fireEvent.change(
        container.querySelector("input[type=file]"),
        { target: { files: [file] } },
      );
      const photo = () => new File(["x"], "trek.jpg", { type: "image/jpeg" });

      beforeEach(() => {
        compressImage.mockReset();
        uploadImage.mockReset().mockResolvedValue("https://cdn.example.com/treks/1-trek.jpeg");
      });

      it("compresses before uploading and reports what was saved", async () => {
        compressImage.mockResolvedValue({
          file: new File(["y"], "trek.jpeg", { type: "image/jpeg" }),
          original: { bytes: 4 * 1024 * 1024, width: 4000, height: 3000 },
          final: { bytes: 118 * 1024, width: 1200, height: 900 },
          format: "JPEG",
          skipped: false,
        });

        const onChange = jest.fn();
        const { container, rerender } = renderField({ name: "image", type: "image" }, "", onChange);
        pick(container, photo());

        await waitFor(() => expect(onChange).toHaveBeenCalledWith("image", "https://cdn.example.com/treks/1-trek.jpeg"));
        // The bucket gets the compressed file, never the original.
        expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({ name: "trek.jpeg" }), undefined);

        // The readout only shows once the field actually holds the new URL.
        rerender(<FormField field={{ name: "image", type: "image" }} value="https://cdn.example.com/treks/1-trek.jpeg" onChange={onChange} />);
        expect(await screen.findByText("4.0 MB → 118 KB · 97% smaller · 1200×900 · JPEG")).toBeInTheDocument();
      });

      it("says so when the file was already small enough to leave alone", async () => {
        compressImage.mockResolvedValue({
          file: photo(),
          original: { bytes: 90 * 1024, width: 800, height: 600 },
          final: { bytes: 90 * 1024, width: 800, height: 600 },
          format: "JPEG",
          skipped: true,
        });

        const onChange = jest.fn();
        const { container, rerender } = renderField({ name: "image", type: "image" }, "", onChange);
        pick(container, photo());

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        rerender(<FormField field={{ name: "image", type: "image" }} value="https://cdn.example.com/treks/1-trek.jpeg" onChange={onChange} />);
        expect(await screen.findByText(/already optimized/)).toBeInTheDocument();
      });

      it("shows a progress bar while the work is in flight and nothing after", async () => {
        let release;
        compressImage.mockImplementation(() => new Promise((resolve) => { release = resolve; }));

        const { container } = renderField({ name: "image", type: "image" }, "");
        pick(container, photo());

        expect(await screen.findByRole("progressbar")).toBeInTheDocument();

        release({
          file: photo(),
          original: { bytes: 1024, width: 10, height: 10 },
          final: { bytes: 512, width: 10, height: 10 },
          format: "JPEG",
          skipped: false,
        });
        await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
      });

      it("leaves the field untouched when the upload fails", async () => {
        compressImage.mockRejectedValue(new Error("boom"));
        const onChange = jest.fn();
        const { container } = renderField({ name: "image", type: "image" }, "", onChange);
        pick(container, photo());

        await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
        expect(onChange).not.toHaveBeenCalled();
        expect(uploadImage).not.toHaveBeenCalled();
      });
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
