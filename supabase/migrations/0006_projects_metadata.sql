-- Backfills the metadata columns 0005 added, from what each project's live site
-- and repository actually say (visited 2026-09-11). Apply AFTER 0005.
--
-- Keyed on `id`, not `title`: one row's title carried a leading space, which is
-- exactly the kind of thing title keys lose. 0005 trims titles; this re-runs the
-- trim so 0006 is safe to apply on its own too.
--
-- Lines marked `REVIEW:` are reasonable inference from a README rather than
-- something the source states outright — read those four and put them in your
-- own words in /admin.

update public.projects set title = btrim(title) where title <> btrim(title);

-- ---------------------------------------------------------------------------
-- 1. Expense Management Web-App — github.com/daredavil01/expense-mgmt-webapp
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Web App',
  status   = 'Archived',
  role     = 'Solo build',
  tech_stack = array['Firebase', 'Firestore'],
  highlights = array[
    'Admin-provisioned accounts only — a private firm, so no public registration',
    'Expense logging across multiple sites for geographically spread teams',
    'Manager verification and approval workflow over the raw entries'
  ],
  links = '[{"label": "Live demo", "url": "https://expensetracker-ed3f6.web.app"}]'::jsonb,
  problem = 'A medium-scale construction firm had employees spending across several sites at once, with no central record of what was spent where. Reconciliation happened on paper, after the fact.',
  solution = 'A Firestore-backed web app where employees log categorised expenses against a site and managers verify them. Because the firm is private, administrators provision accounts directly rather than opening registration.',
  -- REVIEW: drawn from the repo README and the project report PDF it ships.
  outcome = 'Deployed on Firebase Hosting with a demo account for walkthroughs. The repository carries a project report documenting the architecture. Superseded by the firm''s own tooling; kept here as the first thing I shipped end to end.'
where id = 1;

-- ---------------------------------------------------------------------------
-- 2. Personal Website — this repository
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Website',
  status   = 'Live',
  role     = 'Solo build',
  tech_stack = array['React', 'Vite', 'Tailwind CSS', 'Supabase', 'Cloudflare Pages'],
  highlights = array[
    'Custom /admin dashboard over Supabase, with row-level security as the access boundary',
    'One central tag system shared across books, blogs, treks, races, micro-posts and projects',
    'Images compress in the browser before upload — 150 KB target, 300 KB hard cap'
  ],
  links = '[{"label": "GitHub", "url": "https://github.com/daredavil01/personal-site"}]'::jsonb,
  problem = 'Everything I make — writing, races, treks, books, projects — lived on other people''s platforms, in other people''s formats, behind other people''s algorithms.',
  solution = 'One site over a Supabase Postgres store, with a schema-driven admin dashboard so every content type is edited the same way, and a tag layer that cross-links them. Built with React and Vite, deployed on Cloudflare Pages.',
  outcome = 'The canonical home for everything I publish, updated from a phone. The audience is on mobile networks, so every uploaded image is resized and re-encoded in the browser before it ever reaches storage.'
where id = 2;

-- ---------------------------------------------------------------------------
-- 3. RunLog — the prototype RunFolio replaced. Its deployment now 404s, so it
--    is archived and hidden rather than left as a broken link on the page.
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Web App',
  status   = 'Archived',
  role     = 'Solo build',
  visible  = false,
  tech_stack = array['Next.js', 'Firebase', 'Express.js'],
  highlights = array[
    'First attempt at a public race portfolio for runners',
    'Superseded by RunFolio, rebuilt on Astro'
  ],
  problem = 'Race results scatter across timing-company PDFs, Strava and a camera roll. There was nowhere to put a running history that someone else could actually look at.',
  solution = 'A Next.js front end over Firebase with an Express API, where an athlete could log marathons and show them on one page.',
  -- REVIEW: the Vercel deployment returns 404 as of 2026-09-11; the link field
  -- is left as-is rather than pointed at an invented replacement.
  outcome = 'Retired. The idea was right and the stack was not — RunFolio rebuilt it on Astro with Strava sync, and the Vercel deployment was taken down.'
where id = 3;

-- ---------------------------------------------------------------------------
-- 4. RunSmart — runningplan1.netlify.app/training-plan
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Tool',
  status   = 'Live',
  role     = 'Solo build',
  tech_stack = array['Next.js', 'React', 'Netlify'],
  highlights = array[
    'A 5K or 10K time trial in; a half or full marathon plan out',
    'Returns personalised paces, times and a weekly training schedule',
    'No account, no signup — one form, one plan'
  ],
  problem = 'Most training plans are written for an imaginary average runner. They prescribe paces without knowing anything about the fitness of the person reading them.',
  solution = 'Ask for one honest data point — a recent 5K or 10K time trial — and a target race, then derive the training paces and weekly schedule from that instead of from a generic template.',
  -- REVIEW: the site states the inputs and outputs but names no methodology, so
  -- none is claimed here. Add the formula (VDOT, Riegel, your own) if you want it stated.
  outcome = 'Live on Netlify. Supports half and full marathon targets from a 5K or 10K trial.'
where id = 4;

-- ---------------------------------------------------------------------------
-- 5. Social-Ape — github.com/daredavil01/social-explorers-client (MIT)
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Web App',
  status   = 'Archived',
  role     = 'Solo build',
  tech_stack = array['React', 'Firebase', 'Firestore'],
  highlights = array[
    'Auth, feed, profiles, likes, comments and notifications',
    'REST API on Firebase Cloud Functions, in a separate repository',
    'MIT licensed'
  ],
  links = '[{"label": "Live demo", "url": "https://socialexplorers-aae2b.web.app/"}, {"label": "Backend repo", "url": "https://github.com/daredavil01/SocialExplorers-firebase-functions"}]'::jsonb,
  problem = 'I wanted to understand what a social platform is actually made of — not read about it, build one.',
  solution = 'A React client against a REST API on Firebase Cloud Functions, covering the full loop: signup, a home feed, user profiles, likes, comments and notifications.',
  -- REVIEW: inferred from the README and repo history.
  outcome = 'Shipped and demoable, then left alone. It did its job as the project where auth, state and a real backend stopped being theory.'
where id = 5;

-- ---------------------------------------------------------------------------
-- 6. YUNG Foundation Website — yungfoundationsatpuda.org
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Website',
  status   = 'Live',
  role     = 'Solo build',
  org      = 'YUNG Foundation',
  tech_stack = array['Astro', 'Supabase', 'Tailwind CSS'],
  highlights = array[
    '550 bamboo-school students, 270 of them mainstreamed into formal schooling',
    '4,000+ birth certificates filed for families without documentation',
    '50,000+ sanitary pads distributed through the women''s health programme',
    'Six programmes, a gallery, a blog, a team page and a donation route'
  ],
  problem = 'A grassroots organisation working in the remotest tribal villages of the Satpuda range and Narmada valley — in Nandurbar and Dhule districts — had no public presence. No way to show the work, recruit fellows, or take a donation.',
  solution = 'A content-managed Astro site over Supabase, covering all six programmes, an image gallery, a blog, the team, resources, events and donations. Its mission line leads: कृती शाश्वत विकासासाठी — action for sustainable development.',
  outcome = 'Live at yungfoundationsatpuda.org, carrying the foundation''s own impact numbers where anyone can check them.'
where id = 6;

-- ---------------------------------------------------------------------------
-- 7. RunFolio — runfolio.in  (featured)
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Web App',
  status   = 'Live',
  role     = 'Solo build',
  featured = true,
  tech_stack = array['Astro', 'Strava API', 'Tailwind CSS'],
  highlights = array[
    'Connect Strava once and activities import, matched to the races you ran',
    'Log any race: distance, time, bib number and photos',
    'Public profile at runfolio.in/runner/<name>, as a ledger, a gallery or stats'
  ],
  problem = 'A runner''s history is scattered across timing-company result pages, a Strava feed nobody browses, and a camera roll. There is no one link you can hand someone that shows what you have actually run.',
  solution = 'A race portfolio that syncs from Strava and matches activities to logged races, then renders the whole history as a public profile in whichever layout suits it — ledger, gallery or stats.',
  outcome = 'Live at runfolio.in. The reference profile carries 26 races, 589.2 km and a marathon PB, which is the point: every finish line, worth framing.'
where id = 7;

-- ---------------------------------------------------------------------------
-- 8. Visiting Card — card.sankettambare.in
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Design',
  status   = 'Live',
  role     = 'Solo build',
  tech_stack = array['Vite', 'TypeScript', 'Cloudflare Pages'],
  highlights = array[
    'Five material worlds and four persona lenses — developer, ultra runner, Sahyadri trekker',
    'A Pages middleware rewrites the OG image and title per ?theme= and ?view=, so every shared link previews as the persona it points at',
    'Tilt it, flip it, toss it — a card you play with before you read it'
  ],
  problem = 'A business card states one role. I do not have one role, and a list of them reads like a CV nobody asked for.',
  solution = 'An interactive card with four persona lenses across five material treatments, so the reader picks which version of me they want. Sharing a specific lens rewrites the link preview to match, in a Cloudflare Pages middleware.',
  outcome = 'Live at card.sankettambare.in. It gets played with before it gets read, which is the whole idea.'
where id = 8;

-- ---------------------------------------------------------------------------
-- 9. Nisarg School Management Portal — YUNG Foundation  (featured)
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Web App',
  status   = 'Live',
  role     = 'Solo build',
  org      = 'YUNG Foundation',
  featured = true,
  tech_stack = array['React', 'Vite', 'Supabase', 'Cloudflare Pages'],
  highlights = array[
    'Offline-first — fellows enrol students from any phone, with or without a signal',
    'Bilingual Marathi and English, because the people using it work in Marathi',
    'Year-by-year academic history per student, not just a current roll',
    'Surfaces likely dropouts early, while someone can still intervene'
  ],
  problem = 'Yung Foundation fellows enrol village students in places with no reliable mobile signal. Records lived in paper registers, so a child who stopped attending was noticed months later — or not at all.',
  solution = 'A bilingual, offline-first web app that fellows use on their own phones. Enrolment and year-by-year academic history sync when a signal returns, and the portal flags students whose attendance pattern predicts a dropout.',
  outcome = 'In use by fellows in the field. The dropout signal is the part that matters: it turns a record-keeping system into something that changes an outcome.'
where id = 9;

-- ---------------------------------------------------------------------------
-- 10. E20 ka Chakravyuha — e20-story.sankettambare.in  (featured)
--     Astro v7.2.8 per its generator meta tag.
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Data Story',
  status   = 'Live',
  role     = 'Solo build',
  featured = true,
  tech_stack = array['Astro', 'Tailwind CSS'],
  highlights = array[
    'Three chapters: about sugar, about ethanol, and how the two connect',
    'An interactive simulator for the ethanol-versus-sugar trade-off',
    'Sourced to DFPD, ISMA, the DoCA price monitoring cell and Reuters',
    'Shows the 306 LMT versus 343.5 LMT production dispute rather than picking a side'
  ],
  problem = 'India hit 20% ethanol blending five years early, and in the same season sugar production fell to a five-year low while retail prices jumped from ₹48 to ₹56 a kilo in a month. Whether those facts are connected was being argued with numbers nobody was showing.',
  solution = 'An independent data story that walks through the crop economics, the twelve-year climb in blending, and the feedstock shift from cane to grain — then hands the reader a simulator to move the trade-off themselves.',
  outcome = 'Live and bilingual. Where the government and the industry disagree on a number, it prints both with their sources and dates instead of resolving it quietly.'
where id = 10;

-- ---------------------------------------------------------------------------
-- 11. Antyodaya Foundation Website — Antyodaya Punarvasan, Gadchiroli
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Website',
  status   = 'Live',
  role     = 'Solo build',
  org      = 'Antyodaya Punarvasan',
  tech_stack = array['Astro', 'Supabase', 'Cloudflare Workers'],
  highlights = array[
    'Five programmes: Nai Disha addiction recovery, mental health, disability inclusion, Adivasi Mitra and snakebite prevention',
    '55 active programmes, 11 team members, 33 registered volunteers',
    'Volunteer sign-up and donation routes alongside the programme pages'
  ],
  problem = 'A multipurpose social institution in Gadchiroli running addiction recovery, mental health, disability and tribal rights work had no way to explain that range to a volunteer or a donor.',
  solution = 'A content-managed Astro site on Cloudflare Workers, with a page per programme, a gallery, volunteer sign-up and donation routes.',
  outcome = 'Live, covering all five programmes. Still on a workers.dev address — a custom domain is the obvious next step.'
where id = 11;

-- ---------------------------------------------------------------------------
-- 12. CMS Site Planner — github.com/daredavil01/cms-site-planner
-- ---------------------------------------------------------------------------
update public.projects set
  category = 'Tool',
  status   = 'Live',
  role     = 'Solo build',
  -- Built as a Claude Code plugin. The stack it *targets* lives in `outcome`
  -- rather than here, so filtering by "Astro" returns Astro sites only.
  tech_stack = array['Claude Code'],
  highlights = array[
    'Produces implementation_plan.md, CLAUDE.md, status.md, CHANGELOG.md and lessons.md',
    'Targets one fixed stack on purpose — that is what makes its rules specific enough to check',
    'Greenfield only: it plans new builds, it does not audit existing codebases'
  ],
  problem = 'An agent handed a vague website brief will start writing code immediately and make every architectural decision implicitly, in passing. The decisions are then buried in the diff.',
  solution = 'A Claude Code plugin that produces documents rather than code. It interrogates the brief about i18n, media, blog, forms, gallery and roles, then emits a phased plan plus the rules, status and changelog files that keep the build honest afterwards.',
  outcome = 'It plans exactly one stack — Astro SSR on Cloudflare Workers, Supabase for Postgres, auth and storage, RLS as the access boundary, a custom admin in the same app. Narrow on purpose: rules you can actually check beat rules that apply anywhere.'
where id = 12;

-- ---------------------------------------------------------------------------
-- 13. Personal Websites & Projects Directory — daredavil01.github.io/daredavil01
-- ---------------------------------------------------------------------------
update public.projects set
  subtitle = 'One page linking every site, project and writing platform',
  category = 'Website',
  status   = 'Live',
  role     = 'Solo build',
  tech_stack = array['GitHub Pages'],
  highlights = array[
    'Structured as a day: 05:30 dawn run, 09:00 build, 13:00 read, 18:00 research, 22:00 write',
    'Links every interactive project, site and dossier in one place',
    'Collects the writing platforms too — Substack, Medium, Dev.to, Hashnode and the rest'
  ],
  problem = 'The work is spread across a dozen domains and as many publishing platforms. Anyone trying to find all of it had to already know where to look.',
  solution = 'A single directory page organised around a day rather than a category list, so the shape of how the work happens is visible alongside the links themselves.',
  outcome = 'Live on GitHub Pages, opening with the line that sums the rest up: a developer who runs at dawn and reads past midnight.'
where id = 13;

-- ---------------------------------------------------------------------------
-- Six projects shared one placeholder cover — the YUNG Foundation logo, reused
-- while they were being added. Clear them so the fallback added in 0005 shows a
-- neutral placeholder (or the first screenshot) rather than another
-- organisation's branding. Add real covers via /admin.
-- ---------------------------------------------------------------------------
update public.projects set image = null where id in (7, 8, 9, 10, 11, 12);

notify pgrst, 'reload schema';
