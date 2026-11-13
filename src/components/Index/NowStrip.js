import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useBooks, useNowMonths, useSports, useTreks,
} from "../../context/ContentContext";
import { nowCards } from "../../lib/homeNow";
import useLatestPosts from "./useLatestPosts";

const ICONS = {
  essay: "edit_note",
  race: "directions_run",
  trek: "landscape",
  book: "menu_book",
  letter: "mail",
};

const cardClass = "h-full flex flex-col gap-2 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-secondary dark:hover:border-secondary transition-colors no-underline group";

const CardBody = ({ card }) => (
  <>
    <span className="flex items-center gap-2 font-label text-xs uppercase tracking-widest font-bold text-secondary">
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{ICONS[card.kind]}</span>
      {card.eyebrow}
    </span>
    <span className="font-headline text-lg font-bold leading-snug text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors line-clamp-3">
      {card.title}
    </span>
    {card.meta && (
      <span className="mt-auto font-body text-sm text-stone-500 dark:text-stone-400">{card.meta}</span>
    )}
  </>
);

// The newest thing of each kind, above the fold: an essay, a race or trek, a
// book and the latest letter. All four come from data already loaded for the
// rest of the page; the model (src/lib/homeNow.js) omits a kind with no data,
// and the strip draws nothing when every kind is empty.
const NowStrip = () => {
  const { items: posts } = useLatestPosts();
  const { data: sports } = useSports();
  const { data: treks } = useTreks();
  const { data: books } = useBooks();
  const { data: months } = useNowMonths();

  const cards = useMemo(() => nowCards({
    posts, sports, treks, books, months,
  }), [posts, sports, treks, books, months]);

  if (!cards.length) return null;

  return (
    <section aria-labelledby="home-now">
      <h2 id="home-now" className="sr-only">Lately</h2>
      <ul className="list-none pl-0 m-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <li key={card.kind}>
            {card.external ? (
              <a href={card.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                <CardBody card={card} />
              </a>
            ) : (
              <Link to={card.href} className={cardClass}>
                <CardBody card={card} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default NowStrip;
