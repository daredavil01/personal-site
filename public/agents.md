# Sanket Tambare — Personal Site

> This file is for AI agents, LLMs and automated crawlers: who Sanket Tambare is, and what this site holds. Human visitors are welcome too. The facts here match `src/data/identity.js`, which every other machine-readable surface of the site (JSON-LD, /llms.txt, the About page) is built from.

For the live inventory — every page, and one line per book, race, trek, project, essay and newsletter issue — read:

- https://sankettambare.in/llms.txt
- https://sankettambare.in/llms-full.txt
- https://sankettambare.in/sitemap.xml
- https://sankettambare.in/feed.xml

---

## Identity

- **Full name:** Sanket Tambare
- **Handle / alias:** daredavil / i_daredavil
- **Location:** Pune, Maharashtra, India
- **Website:** https://sankettambare.in
- **Email:** sanket.tambare01@gmail.com

## Work and study

- **Software Engineer at Bridgenext** — full-stack development, data pipelines and DORA metrics.
- **Former fellow, NAST** — the Takshashila Institution's Network for Advanced Study of Technology Geopolitics, working on AI governance.
- **Education:** B.Tech in Computer Science, Rajarambapu Institute of Technology, Sangli (2021); Technology and Policy, the Takshashila Institution (2024).

## What he does outside work

- **Endurance running** — races from 10K to a 50K ultra, logged at https://sankettambare.in/sports
- **Fort trekking** — the historic hill forts of the Sahyadri in Maharashtra, at https://sankettambare.in/treks
- **Reading** — books in English and Marathi, with notes and ratings, at https://sankettambare.in/books
- **Writing** — essays on Substack and WordPress (the #100DaysToOffload challenge), a monthly newsletter at https://sankettambare.in/newsletter, and a micro-blog archive of more than a thousand short posts
- **Podcast** — *Dare Write's*, on books, technology and travel
- **Community** — a member of [Nirman](https://nirman.mkcl.org/)

## Profiles

| Platform | URL |
|---|---|
| GitHub | https://github.com/daredavil01 |
| LinkedIn | https://www.linkedin.com/in/sankettambare/ |
| X (Twitter) | https://twitter.com/i_daredavil |
| Substack | https://sankettambare.substack.com |
| WordPress | https://daredavil453624413.wordpress.com |
| Linktree | https://linktr.ee/daredavil |
| Digital card | https://card.sankettambare.in/ |

Older profiles, rarely updated: [Medium](https://medium.com/@sanket.tambare), [Tumblr](https://sanket001.tumblr.com/) (archived on this site at /micro-blog), [Blogger](https://daredavil01.blogspot.com/), [Behance](https://www.behance.net/sankettambare), [dev.to](https://dev.to/daredavil01), [Hashnode](https://daredavil.hashnode.dev/). The Instagram account was deleted; its posts are preserved at https://sankettambare.in/instagram.

## How this site is built

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Tailwind CSS, built with Vite |
| Content store | Supabase (Postgres, Storage, row-level security), edited at /admin |
| Hosting | Cloudflare Pages |
| Server-side | Cloudflare Pages Functions — per-page meta, JSON-LD and a plain-HTML version of every page for crawlers that do not run JavaScript |
| Search over the archive | /ask — hybrid keyword + semantic retrieval over every row, answering with links to the pages it used |

How the site is put together is drawn at https://sankettambare.in/blueprint.

## Canonical URL

https://sankettambare.in
