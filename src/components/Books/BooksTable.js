import React from "react";
import PropTypes from "prop-types";
import { bookShape, filtersShape } from "./shapes";
import Stars from "./Stars";
import { formatReadDate } from "../../lib/bookDate";

const sortIcon = (sorted, dir) => {
  if (!sorted) return "unfold_more";
  return dir === "asc" ? "arrow_upward" : "arrow_downward";
};

const ariaSort = (sorted, dir) => {
  if (!sorted) return "none";
  return dir === "asc" ? "ascending" : "descending";
};

const TH = ({
  children, onSort, sorted, dir, className,
}) => (
  <th
    scope="col"
    aria-sort={ariaSort(sorted, dir)}
    className={`text-left font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-bold py-3 px-4 ${className}`}
  >
    {onSort ? (
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 bg-transparent border-0 p-0 hover:text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
      >
        {children}
        <span className="material-symbols-outlined text-[14px]">{sortIcon(sorted, dir)}</span>
      </button>
    ) : children}
  </th>
);

TH.propTypes = {
  children: PropTypes.node.isRequired,
  onSort: PropTypes.func,
  sorted: PropTypes.bool,
  dir: PropTypes.string,
  className: PropTypes.string,
};
TH.defaultProps = {
  onSort: null, sorted: false, dir: "desc", className: "",
};

// Dense scannable list — the fastest way to take in fifty books at once, and
// the only view where page counts and publishers are worth the space. Scrolls
// sideways inside its own box on a phone rather than stretching the page.
const BooksTable = ({
  books, onOpen, filters, onSort,
}) => (
  <div className="w-full overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-2xl">
    <table className="w-full min-w-[52rem] border-collapse">
      <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800">
        <tr>
          <TH onSort={() => onSort("title")} sorted={filters.sort === "title"} dir={filters.dir}>Title</TH>
          <TH onSort={() => onSort("author")} sorted={filters.sort === "author"} dir={filters.dir}>Author</TH>
          <TH onSort={() => onSort("category")} sorted={filters.sort === "category"} dir={filters.dir}>Category</TH>
          <TH>Language</TH>
          <TH onSort={() => onSort("pages")} sorted={filters.sort === "pages"} dir={filters.dir}>Pages</TH>
          <TH onSort={() => onSort("rating")} sorted={filters.sort === "rating"} dir={filters.dir}>Rating</TH>
          <TH onSort={() => onSort("date")} sorted={filters.sort === "date"} dir={filters.dir}>Read</TH>
          <TH className="text-right">Review</TH>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr
            key={book.id}
            onClick={() => onOpen(book)}
            className="border-b border-stone-50 dark:border-stone-800/60 last:border-0 hover:bg-stone-50 dark:hover:bg-stone-900/60 transition-colors cursor-pointer"
          >
            <td className="py-3 px-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpen(book); }}
                className="text-left bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
              >
                <span className="block font-body font-bold text-sm text-stone-800 dark:text-stone-100">{book.title}</span>
                {book.translator && (
                  <span className="block font-body text-xs text-stone-400 dark:text-stone-500">
                    {`Tr. ${book.translator}`}
                  </span>
                )}
              </button>
            </td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">{book.author}</td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">{book.category || "—"}</td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">{book.language}</td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">{book.page_count ?? "—"}</td>
            <td className="py-3 px-4"><Stars rating={book.rating} size="xs" /></td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              {formatReadDate(book) || "—"}
            </td>
            <td className="py-3 px-4 text-right whitespace-nowrap">
              {book.blog_link && (
                <a
                  href={book.blog_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-label text-[10px] uppercase tracking-widest text-secondary hover:underline"
                >
                  {book.blog_platform || "Read"}
                  {" ↗"}
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

BooksTable.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  onOpen: PropTypes.func.isRequired,
  filters: filtersShape.isRequired,
  onSort: PropTypes.func.isRequired,
};

export default BooksTable;
