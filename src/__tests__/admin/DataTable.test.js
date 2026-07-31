import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable from "../../pages/admin/ui/DataTable";

const ROWS = [
  { id: 1, title: "Sapiens", author: "Harari", year: 2011 },
  { id: 2, title: "Annihilation", author: "VanderMeer", year: 2014 },
  { id: 3, title: "Blindsight", author: "Watts", year: 2006 },
];

const COLUMNS = [
  { key: "title", label: "Title", sortable: true, primary: true },
  { key: "author", label: "Author", sortable: true },
  { key: "year", label: "Year", sortable: true },
];

// The desktop <table> and the mobile card list both render (CSS hides one), so
// read row order from the table body specifically.
const titles = () => screen
  .getAllByRole("row")
  .slice(1)
  .map((row) => row.querySelectorAll("td")[0].textContent);

const setup = (props = {}) => render(
  <DataTable rows={ROWS} columns={COLUMNS} searchKeys={["title", "author"]} {...props} />,
);

describe("DataTable", () => {
  it("shows a spinner while rows are null and an empty state when there are none", () => {
    const { rerender } = render(<DataTable rows={null} columns={COLUMNS} />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<DataTable rows={[]} columns={COLUMNS} />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("surfaces a load error instead of an empty table", () => {
    render(<DataTable rows={null} error={new Error("network down")} columns={COLUMNS} />);
    expect(screen.getByText("Couldn't load this table")).toBeInTheDocument();
    expect(screen.getByText("network down")).toBeInTheDocument();
  });

  it("filters on the declared search keys", () => {
    setup({ search: "watts", onSearchChange: () => {} });
    expect(titles()).toEqual(["Blindsight"]);
  });

  it("tells the user a search matched nothing, rather than looking empty", () => {
    setup({ search: "zzz", onSearchChange: () => {} });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("sorts ascending, then descending, then back to the source order", () => {
    setup();
    const header = screen.getByRole("button", { name: /Year/ });

    fireEvent.click(header);
    expect(titles()).toEqual(["Blindsight", "Sapiens", "Annihilation"]);

    fireEvent.click(header);
    expect(titles()).toEqual(["Annihilation", "Sapiens", "Blindsight"]);

    fireEvent.click(header);
    expect(titles()).toEqual(["Sapiens", "Annihilation", "Blindsight"]);
  });

  it("leaves rows exactly as given in serverMode", () => {
    setup({ serverMode: true, search: "watts", onSearchChange: () => {} });
    expect(titles()).toEqual(["Sapiens", "Annihilation", "Blindsight"]);
    // Sorting is the server's job there, so the headers are not buttons.
    expect(screen.queryByRole("button", { name: /Year/ })).toBeNull();
  });

  it("selects one row and selects/clears all", () => {
    const onSelectedChange = jest.fn();
    const { rerender } = setup({ selectable: true, selectedIds: [], onSelectedChange });

    // The desktop table and the mobile card list both render a checkbox per row.
    fireEvent.click(screen.getAllByLabelText("Select row 2")[0]);
    expect(onSelectedChange).toHaveBeenCalledWith([2]);

    fireEvent.click(screen.getByLabelText("Select all rows"));
    expect(onSelectedChange).toHaveBeenLastCalledWith([1, 2, 3]);

    rerender(
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        selectable
        selectedIds={[1, 2, 3]}
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Deselect all rows"));
    expect(onSelectedChange).toHaveBeenLastCalledWith([]);
  });

  it("select-all only covers the rows currently visible", () => {
    const onSelectedChange = jest.fn();
    setup({
      selectable: true, selectedIds: [], onSelectedChange, search: "watts", onSearchChange: () => {},
    });
    fireEvent.click(screen.getByLabelText("Select all rows"));
    expect(onSelectedChange).toHaveBeenCalledWith([3]);
  });

  it("renders per-row actions", () => {
    setup({ renderActions: (row) => <button type="button">{`Edit ${row.id}`}</button> });
    expect(screen.getAllByRole("button", { name: "Edit 1" })).toHaveLength(2); // table + mobile card
  });
});
