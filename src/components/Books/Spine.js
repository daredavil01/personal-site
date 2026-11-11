import React, { memo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import { spineOf } from "../../lib/bookShelf";
import { openOnPlainClick } from "../../lib/plainClick";

// One book, spine out. Every visual property is data (lib/bookShelf.js):
// width = pages, cloth = subject, foot mark = language, ribbon = reviewed,
// tab = a line kept. On a pointer or the keyboard the book tips out of the
// row and shows its cover, which hangs off the spine's right edge in 3D; the
// cover image is only requested the first time that happens, so the shelf
// costs no image until someone reaches for a book.
const Spine = ({
  book, dim, pulled, leaning, onOpen, onPoint,
}) => {
  const [armed, setArmed] = useState(false);
  const s = spineOf(book);
  const arm = () => { setArmed(true); onPoint(book); };

  return (
    <Link
      to={`/books/${book.id}`}
      onClick={openOnPlainClick(() => onOpen(book))}
      onPointerEnter={arm}
      onPointerLeave={() => onPoint(null)}
      onFocus={arm}
      onBlur={() => onPoint(null)}
      data-lines={s.lines}
      aria-label={`${book.title}${book.author ? `, ${book.author}` : ""}`}
      className={`bk-spine bk-spine--${s.style}${dim ? " is-dim" : ""}${pulled ? " is-pulled" : ""}${leaning ? " is-leaning" : ""}`}
      style={{
        "--w": s.w, "--h": s.h, "--cloth": s.cloth, "--shade": s.shade,
      }}
    >
      <span className="bk-spine__book">
        {s.reviewed && <span className="bk-spine__ribbon" />}
        {s.quoted && <span className="bk-spine__tab" />}
        <span className="bk-spine__face">
          <span className="bk-spine__plate">
            <span className="bk-spine__title" lang={s.marathi ? "mr" : undefined}>{book.title}</span>
          </span>
          <span className="bk-spine__foot">
            <span className={`bk-mark${s.marathi ? " bk-mark--mr" : ""}`} />
          </span>
        </span>
        <span className="bk-spine__cover" aria-hidden="true">
          {(armed || pulled) && book.cover_url && (
            <img src={book.cover_url} alt="" decoding="async" referrerPolicy="no-referrer" />
          )}
        </span>
      </span>
    </Link>
  );
};

Spine.propTypes = {
  book: bookShape.isRequired,
  dim: PropTypes.bool,
  pulled: PropTypes.bool,
  leaning: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onPoint: PropTypes.func.isRequired,
};

Spine.defaultProps = { dim: false, pulled: false, leaning: false };

export default memo(Spine);
