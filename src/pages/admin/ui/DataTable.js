import React, { useMemo, useState } from "react";
import { Checkbox, Input } from "./Input";
import { Spinner, EmptyState, ErrorState } from "./Feedback";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "./icons";
import { card, hairline, mutedText, surface } from "./tokens";

/**
 * The admin's list view.
 *
 * `columns` entries are `{ key, label, sortable, width, primary, render }`.
 * `render(row)` may return any node; when absent the raw `row[key]` is shown.
 * `primary` marks the column that titles the row in the mobile card layout.
 *
 * Search and sort run client-side by default. Pass `serverMode` when the caller
 * already filters, sorts and pages on the server (Micro Blog): the search box
 * stays but rows are rendered exactly as given.
 */

const cellValue = (row, column) => {
  if (column.sortValue) return column.sortValue(row);
  return row[column.key];
};

const compare = (a, b) => {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1; // blanks sink
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const matches = (row, keys, term) => {
  const needle = term.toLowerCase();
  return keys.some((key) => {
    const v = row[key];
    if (v === null || v === undefined) return false;
    const text = Array.isArray(v) ? v.join(" ") : String(v);
    return text.toLowerCase().includes(needle);
  });
};

const DataTable = ({
  rows,
  error = null,
  columns = [],
  getRowId = (r) => r.id,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  searchKeys = [],
  serverMode = false,
  selectable = false,
  selectedIds = [],
  onSelectedChange,
  renderActions,
  toolbar,
  footer,
  emptyTitle,
  emptyDescription,
  emptyAction,
}) => {
  const [sort, setSort] = useState(null); // { key, dir }

  const visible = useMemo(() => {
    if (!rows) return null;
    if (serverMode) return rows;
    const term = search.trim();
    const filtered = term && searchKeys.length
      ? rows.filter((r) => matches(r, searchKeys, term))
      : rows;
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compare(cellValue(a, column), cellValue(b, column)) * dir);
  }, [rows, serverMode, search, searchKeys, sort, columns]);

  const toggleSort = (key) => setSort((prev) => {
    if (!prev || prev.key !== key) return { key, dir: "asc" };
    if (prev.dir === "asc") return { key, dir: "desc" };
    return null;
  });

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = !!visible?.length && visible.every((r) => selected.has(getRowId(r)));

  const toggleAll = () => {
    if (!onSelectedChange || !visible) return;
    onSelectedChange(allSelected ? [] : visible.map(getRowId));
  };

  const toggleOne = (id) => {
    if (!onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectedChange([...next]);
  };

  const sortIcon = (key) => {
    if (!sort || sort.key !== key) return <ArrowUpDown size={12} className="opacity-30" aria-hidden="true" />;
    return sort.dir === "asc"
      ? <ChevronUp size={12} aria-hidden="true" />
      : <ChevronDown size={12} aria-hidden="true" />;
  };

  const showSearch = !!onSearchChange;
  const primaryColumn = columns.find((c) => c.primary) ?? columns[0];

  let body;
  if (error) {
    body = <ErrorState error={error} title="Couldn't load this table" />;
  } else if (visible === null) {
    body = <Spinner />;
  } else if (!visible.length) {
    body = (
      <EmptyState
        title={emptyTitle ?? (search ? "No matches" : "Nothing here yet")}
        description={emptyDescription ?? (search ? "Try a different search term." : undefined)}
        action={search ? undefined : emptyAction}
      />
    );
  } else {
    body = (
      <>
        {/* Desktop: a real table. */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={`border-b ${hairline}`}>
                {selectable && (
                  <th scope="col" className="w-10 px-3 py-2.5 text-left">
                    <Checkbox
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={`px-3 py-2.5 text-left text-xs font-medium ${mutedText}`}
                  >
                    {column.sortable && !serverMode ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                      >
                        {column.label}
                        {sortIcon(column.key)}
                      </button>
                    ) : column.label}
                  </th>
                ))}
                {renderActions && <th scope="col" className="w-px px-3 py-2.5"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {visible.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    {selectable && (
                      <td className="px-3 py-2.5 align-middle">
                        <Checkbox
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2.5 align-middle ${column.primary ? "font-medium text-stone-900 dark:text-stone-100" : "text-stone-600 dark:text-stone-300"}`}
                      >
                        <div className="max-w-md truncate">
                          {column.render ? column.render(row) : (row[column.key] ?? "—")}
                        </div>
                      </td>
                    ))}
                    {renderActions && (
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">{renderActions(row)}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: one card per row — a table this wide is unusable on a phone. */}
        <ul className="md:hidden divide-y divide-stone-100 dark:divide-stone-800 mb-0 list-none pl-0">
          {visible.map((row) => {
            const id = getRowId(row);
            const rest = columns.filter((c) => c !== primaryColumn);
            return (
              <li key={id} className="flex items-start gap-3 px-3 py-3">
                {selectable && (
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(id)}
                    onChange={() => toggleOne(id)}
                    aria-label={`Select row ${id}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1 break-words">
                    {primaryColumn?.render
                      ? primaryColumn.render(row)
                      : (row[primaryColumn?.key] ?? `#${id}`)}
                  </p>
                  <dl className="flex flex-wrap gap-x-3 gap-y-1 mb-0">
                    {rest.map((column) => (
                      <div key={column.key} className="flex items-baseline gap-1 min-w-0">
                        <dt className={`text-[11px] ${mutedText} shrink-0`}>{column.label}</dt>
                        <dd className="text-xs text-stone-700 dark:text-stone-300 mb-0 truncate max-w-[12rem]">
                          {column.render ? column.render(row) : (row[column.key] ?? "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {renderActions && (
                  <div className="shrink-0 flex items-center gap-0.5">{renderActions(row)}</div>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <div className={card}>
      {(showSearch || toolbar) && (
        <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 border-b ${hairline}`}>
          {showSearch && (
            <div className="relative flex-1 min-w-[12rem]">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedText} pointer-events-none`} aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9 h-9 py-0"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className={surface}>{body}</div>
      {footer && <div className={`px-3 py-2.5 border-t ${hairline}`}>{footer}</div>}
    </div>
  );
};

export default DataTable;
