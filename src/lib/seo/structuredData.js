// JSON-LD for every page, injected by functions/_middleware.js.
//
// One @graph per page with stable @ids, so the Person on /about, the author of a
// book review and the publisher of the site are recognisably the same entity:
//   <SITE_URL>/#person   — Sanket, from src/data/identity.js
//   <SITE_URL>/#website  — the site
//   <page url>#webpage   — this page
//   <page url>#main      — the thing the page is about (a book, a trek, …)
// The Person is repeated on every page because that repetition — same name,
// same profiles, everywhere — is what lets a search engine or an assistant
// commit to "this is who Sanket Tambare is".
//
// Pure: callers pass the meta and the view; nothing here fetches.

import { SITE_URL, SITE_NAME, PAGE_META, PERSON_IMAGE, composeTitle } from "../../data/pageMeta";
import { IDENTITY } from "../../data/identity";

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const ref = (id) => ({ "@id": id });
const abs = (path) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path === "/" ? "" : path}`);
const compact = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)),
);

export function personNode() {
  return compact({
    "@type": "Person",
    "@id": PERSON_ID,
    name: IDENTITY.name,
    givenName: IDENTITY.givenName,
    familyName: IDENTITY.familyName,
    alternateName: IDENTITY.alternateName,
    url: SITE_URL,
    image: PERSON_IMAGE,
    description: IDENTITY.bio,
    jobTitle: IDENTITY.jobTitle,
    worksFor: { "@type": "Organization", name: IDENTITY.worksFor },
    homeLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: IDENTITY.homeLocation.locality,
        addressRegion: IDENTITY.homeLocation.region,
        addressCountry: IDENTITY.homeLocation.country,
      },
    },
    alumniOf: IDENTITY.alumniOf.map((s) => ({ "@type": "EducationalOrganization", name: s.name })),
    knowsAbout: IDENTITY.knowsAbout,
    knowsLanguage: ["en", "mr"],
    sameAs: IDENTITY.sameAs,
  });
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: PAGE_META["/"].description,
    inLanguage: ["en", "mr"],
    publisher: ref(PERSON_ID),
    author: ref(PERSON_ID),
  };
}

// Home › Section › Item. Section titles come from PAGE_META so the trail reads
// like the page headings do.
export function breadcrumbNode(url, trail) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: abs(step.path),
    })),
  };
}

const sectionCrumb = (section) => ({ name: PAGE_META[section]?.title || section, path: section });

// The JSON-LD list names the first 50; the HTML fallback links every one.
// A longer list adds bytes and CPU and tells a search engine nothing more.
const LIST_LIMIT = 50;

const itemList = (url, items) => ({
  "@type": "ItemList",
  "@id": `${url}#list`,
  numberOfItems: items.length,
  itemListElement: items.slice(0, LIST_LIMIT).map((item, i) => ({
    "@type": "ListItem", position: i + 1, url: abs(item.href), name: item.text,
  })),
});

// The node a detail page is about, per kind.
function mainEntity(view, url) {
  const id = `${url}#main`;
  const common = {
    "@id": id,
    url,
    inLanguage: view.lang,
    keywords: view.tags.length ? view.tags.join(", ") : null,
    image: view.images?.length ? view.images.slice(0, 5) : view.image,
  };
  const authored = { author: ref(PERSON_ID), datePublished: view.date, dateModified: view.updatedAt };

  switch (view.kind) {
    case "book":
      return compact({
        "@type": "Book",
        ...common,
        name: view.book.name,
        author: view.book.author ? { "@type": "Person", name: view.book.author } : null,
        translator: view.book.translator ? { "@type": "Person", name: view.book.translator } : null,
        review: compact({
          "@type": "Review",
          author: ref(PERSON_ID),
          datePublished: view.date,
          reviewBody: view.description,
          reviewRating: view.book.rating
            ? { "@type": "Rating", ratingValue: view.book.rating, bestRating: 5, worstRating: 1 }
            : null,
        }),
      });
    case "blog":
      // The essay itself lives on Substack/WordPress; this page describes it.
      // `url` is the essay, so an assistant citing it cites the right place,
      // and the author is the Person, so it credits the right writer.
      return compact({
        "@type": "BlogPosting",
        ...common,
        url: view.externalUrl || url,
        mainEntityOfPage: url,
        headline: view.title,
        description: view.description,
        ...authored,
      });
    case "microblog":
      return compact({
        "@type": "SocialMediaPosting",
        ...common,
        headline: view.title,
        articleBody: view.articleBody,
        ...authored,
      });
    case "trek":
      return compact({
        "@type": "Article",
        ...common,
        headline: view.title,
        description: view.description,
        about: { "@type": "LandmarksOrHistoricalBuildings", name: /\bfort\b/i.test(view.place || "") ? view.place : `${view.place} Fort`, containedInPlace: { "@type": "Place", name: "Maharashtra, India" } },
        ...authored,
      });
    case "sport":
      return compact({
        "@type": "Article",
        ...common,
        headline: view.title,
        description: view.description,
        about: compact({
          "@type": "SportsEvent",
          name: view.title,
          startDate: view.date,
          location: view.place ? { "@type": "Place", name: view.place } : null,
          competitor: ref(PERSON_ID),
        }),
        ...authored,
      });
    case "project":
      return compact({
        "@type": "CreativeWork",
        ...common,
        name: view.title,
        alternativeHeadline: view.subtitle,
        description: view.description,
        keywords: [...view.keywords, ...view.tags].join(", ") || null,
        creator: ref(PERSON_ID),
        dateCreated: view.date,
        dateModified: view.updatedAt,
        sameAs: view.outbound.map((l) => l.href),
      });
    case "presentation":
      return compact({
        "@type": "PresentationDigitalDocument",
        ...common,
        name: view.title,
        description: view.description,
        sameAs: view.externalUrl,
        ...authored,
      });
    case "newsletter":
      return compact({
        "@type": "Article",
        ...common,
        headline: view.title,
        description: view.description,
        articleBody: view.articleBody,
        publisher: ref(PERSON_ID),
        ...authored,
      });
    default:
      return null;
  }
}

const PROFILE_PAGES = new Set(["/", "/about", "/resume"]);

/**
 * The whole @graph for one page.
 * @param {object} args
 * @param {string} args.path      canonical path ("/books/12")
 * @param {object} args.meta      the page's resolved meta (title/description/image)
 * @param {object} [args.view]    entity view for a detail page (entities.js)
 * @param {Array}  [args.items]   list items for a section or tag page
 * @param {string} [args.section] the section a detail page belongs to
 */
export function pageGraph({ path, meta, view = null, items = null, section = null }) {
  const url = abs(path);
  const fullTitle = meta.fullTitle || composeTitle(meta.title);
  const trail = [{ name: SITE_NAME, path: "/" }];
  if (section) trail.push(sectionCrumb(section));
  if (path !== "/") trail.push({ name: view?.title || meta.title || fullTitle, path });

  let pageType = "WebPage";
  if (PROFILE_PAGES.has(path)) pageType = "ProfilePage";
  else if (items || view?.kind === "tag") pageType = "CollectionPage";

  const main = view ? mainEntity(view, url) : null;
  const list = items && items.length ? itemList(url, items) : null;
  // What the page is about: the Person on a profile page, else its list, else
  // its entity.
  let mainRef = null;
  if (pageType === "ProfilePage") mainRef = ref(PERSON_ID);
  else if (list) mainRef = ref(list["@id"]);
  else if (main) mainRef = ref(main["@id"]);
  const page = compact({
    "@type": pageType,
    "@id": `${url}#webpage`,
    url,
    name: fullTitle,
    description: meta.description,
    isPartOf: ref(WEBSITE_ID),
    inLanguage: view?.lang || "en",
    primaryImageOfPage: meta.image ? { "@type": "ImageObject", url: meta.image } : null,
    breadcrumb: path === "/" ? null : ref(`${url}#breadcrumb`),
    mainEntity: mainRef,
    about: pageType === "ProfilePage" ? ref(PERSON_ID) : null,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      page,
      personNode(),
      websiteNode(),
      ...(path === "/" ? [] : [breadcrumbNode(url, trail)]),
      ...(main ? [main] : []),
      ...(list ? [list] : []),
    ],
  };
}
