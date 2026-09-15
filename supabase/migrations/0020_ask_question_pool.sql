-- /ask: a rotating pool of starter questions.
--
-- 0019 replaced four weak starter chips with six good ones. Six fixed chips are
-- still a small window onto 51 books, 25 races, 20 treks, 16 projects and 1,661
-- micro-posts, and a returning visitor sees the same six every time.
--
-- suggested_questions is text[] and cannot carry a category, and a plain shuffle
-- of a long flat list regularly offers four questions about books at once. So the
-- pool is jsonb — [{q, c}] — and the UI draws one question from each of four
-- random categories per page load. suggested_questions stays exactly as 0019 left
-- it and becomes the fallback: a bad edit at /admin degrades to six good
-- questions rather than to none.
--
-- Idempotent; safe to re-run.

alter table public.ask_settings
  add column if not exists question_pool jsonb not null default '[]'::jsonb;

comment on column public.ask_settings.question_pool is
  'Starter questions as [{q, c}], c being one of reading/running/treks/writing/work/site. The UI shows one from each of four random categories. Empty falls back to suggested_questions.';

-- Every question here is a shape the conversation log shows the archive answers
-- well: thematic, single-item, facts-backed, or answerable from the 0019 roster.
-- Superlatives the data does not record ('his favourite book') are absent on
-- purpose — they refuse, and a chip that refuses reads as a broken feature.
-- Mirrored in DEFAULT_QUESTION_POOL (src/data/askConfig.js), which answers when
-- Supabase is unreachable; keep the two in step.
update public.ask_settings set question_pool = '[
  {
    "q": "What kind of books does he read?",
    "c": "reading"
  },
  {
    "q": "What has he read in Marathi?",
    "c": "reading"
  },
  {
    "q": "What does he read about technology?",
    "c": "reading"
  },
  {
    "q": "Has he written reviews of the books he''s read?",
    "c": "reading"
  },
  {
    "q": "मराठी पुस्तकांविषयी सांग.",
    "c": "reading"
  },
  {
    "q": "What are his personal bests across distances?",
    "c": "running"
  },
  {
    "q": "Tell me about the 50K ultra at Lonavala",
    "c": "running"
  },
  {
    "q": "How far has he run in total?",
    "c": "running"
  },
  {
    "q": "What has running taught him?",
    "c": "running"
  },
  {
    "q": "How does he train for a marathon?",
    "c": "running"
  },
  {
    "q": "त्याने पळालेल्या मॅरेथॉनविषयी सांग.",
    "c": "running"
  },
  {
    "q": "Which forts has he trekked?",
    "c": "treks"
  },
  {
    "q": "Which of his treks was the hardest?",
    "c": "treks"
  },
  {
    "q": "Which trek would he recommend to a beginner?",
    "c": "treks"
  },
  {
    "q": "Tell me about the Harishchandragad trek",
    "c": "treks"
  },
  {
    "q": "त्याने केलेल्या ट्रेकबद्दल माहिती दे.",
    "c": "treks"
  },
  {
    "q": "What is the 100 Days to Offload challenge?",
    "c": "writing"
  },
  {
    "q": "What does he write about most?",
    "c": "writing"
  },
  {
    "q": "What does he think about privacy and surveillance?",
    "c": "writing"
  },
  {
    "q": "What does he think about AI and writing?",
    "c": "writing"
  },
  {
    "q": "What does he think about digital wellbeing?",
    "c": "writing"
  },
  {
    "q": "What is he working on right now?",
    "c": "work"
  },
  {
    "q": "What does he do for a living?",
    "c": "work"
  },
  {
    "q": "Tell me about the E20 data story",
    "c": "work"
  },
  {
    "q": "What are his strongest skills?",
    "c": "work"
  },
  {
    "q": "Which projects has he built?",
    "c": "work"
  },
  {
    "q": "How was this second brain built?",
    "c": "site"
  },
  {
    "q": "What is this site, in one minute?",
    "c": "site"
  },
  {
    "q": "Which themes connect his books, runs and writing?",
    "c": "site"
  }
]'::jsonb where id = 1;
