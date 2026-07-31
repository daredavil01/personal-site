import React from "react";
import {
  render, screen, fireEvent, waitFor, within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResourceManager from "../../pages/admin/ResourceManager";
import { ToastProvider } from "../../pages/admin/ui/ToastContext";

const ROWS = [
  { id: 1, title: "Sapiens", author: "Harari", tags: ["history"] },
  { id: 2, title: "Blindsight", author: "Watts", tags: [] },
];

const makeResource = (overrides = {}) => ({
  key: "books",
  label: "Books",
  singular: "book",
  title: (r) => r.title,
  searchKeys: ["title", "author"],
  viewPath: (r) => `/books/${r.id}`,
  columns: [
    { key: "title", label: "Title", primary: true, sortable: true },
    { key: "author", label: "Author" },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "author", label: "Author", type: "text" },
    { name: "tags", label: "Tags", type: "tags", required: true },
  ],
  api: {
    table: "books",
    list: jest.fn().mockResolvedValue(ROWS),
    create: jest.fn().mockResolvedValue({ id: 3 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
  },
  ...overrides,
});

const setup = (resource, route = "/admin/books") => render(
  <MemoryRouter initialEntries={[route]}>
    <ToastProvider>
      <ResourceManager resource={resource} />
    </ToastProvider>
  </MemoryRouter>,
);

const waitForList = () => screen.findAllByText("Sapiens");

// "Delete" and "Cancel" appear both in the page chrome and inside the dialog,
// so dialog interactions are always scoped.
const dialog = () => within(screen.getByRole("dialog"));

describe("ResourceManager list", () => {
  it("loads rows and reports the count", async () => {
    const resource = makeResource();
    setup(resource);
    await waitForList();
    expect(resource.api.list).toHaveBeenCalled();
    expect(screen.getByText("2 entries")).toBeInTheDocument();
  });

  it("links each row to its public page", async () => {
    setup(makeResource());
    await waitForList();
    const links = screen.getAllByRole("link", { name: "View on site" });
    expect(links[0]).toHaveAttribute("href", "/books/1");
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("confirms before deleting, and deletes only on confirm", async () => {
    const resource = makeResource();
    setup(resource);
    await waitForList();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByText(/"Sapiens" will be removed permanently/)).toBeInTheDocument();

    fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
    expect(resource.api.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    fireEvent.click(dialog().getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(resource.api.remove).toHaveBeenCalledWith(1));
  });

  it("bulk-deletes every selected row", async () => {
    const resource = makeResource();
    setup(resource);
    await waitForList();

    fireEvent.click(screen.getByLabelText("Select all rows"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // The bulk bar's Delete sits in the table toolbar, above the row actions.
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByText("Delete 2 entries?")).toBeInTheDocument();

    fireEvent.click(dialog().getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(resource.api.remove).toHaveBeenCalledTimes(2));
  });

  it("surfaces a delete failure as a toast rather than a silent no-op", async () => {
    const resource = makeResource();
    resource.api.remove.mockRejectedValueOnce(new Error("row is referenced"));
    setup(resource);
    await waitForList();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    fireEvent.click(dialog().getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete failed: row is referenced")).toBeInTheDocument();
  });
});

describe("ResourceManager form", () => {
  const openNew = async () => {
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "New book" }));
  };

  it("opens a blank form from ?new=1 and consumes the param", async () => {
    setup(makeResource(), "/admin/books?new=1");
    expect(await screen.findByText("New book")).toBeInTheDocument();
  });

  it("blocks a save when a required composite field is empty", async () => {
    const resource = makeResource();
    setup(resource);
    await openNew();

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form"));

    expect(await screen.findByText("Fill in the highlighted fields.")).toBeInTheDocument();
    expect(screen.getByText("Required.")).toBeInTheDocument();
    expect(resource.api.create).not.toHaveBeenCalled();
  });

  it("creates when the row is new and updates when it has an id", async () => {
    const resource = makeResource();
    const { unmount } = setup(resource);
    await openNew();

    // Fill the one required composite so validation passes.
    const tagBox = screen.getByPlaceholderText("Type and press Enter");
    fireEvent.change(tagBox, { target: { value: "history" } });
    fireEvent.keyDown(tagBox, { key: "Enter" });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form"));
    await waitFor(() => expect(resource.api.create).toHaveBeenCalled());
    unmount();

    const second = makeResource();
    setup(second);
    await waitForList();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form"));
    await waitFor(() => expect(second.api.update).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1 })));
  });

  it("reports a save failure inline and as a toast", async () => {
    const resource = makeResource();
    resource.api.update.mockRejectedValueOnce(new Error("column overflow"));
    setup(resource);
    await waitForList();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent("column overflow");
    expect(screen.getByText("Couldn't save: column overflow")).toBeInTheDocument();
  });

  it("warns before discarding a dirty form and only leaves on confirm", async () => {
    const resource = makeResource();
    setup(resource);
    await waitForList();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    fireEvent.change(screen.getByDisplayValue("Sapiens"), { target: { value: "Sapiens (2nd ed.)" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Discard your changes?")).toBeInTheDocument();

    // Backing out of the warning keeps the edit.
    fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
    expect(screen.getByDisplayValue("Sapiens (2nd ed.)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(dialog().getByRole("button", { name: "Discard" }));
    await waitForList();
  });

  it("leaves a clean form without warning", async () => {
    setup(makeResource());
    await waitForList();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Discard your changes?")).toBeNull();
    await waitForList();
  });
});
