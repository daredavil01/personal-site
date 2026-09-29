---
name: newsletter
description: Draft the monthly newsletter issue for a month (e.g. "/newsletter 2026-09" or "write the September newsletter"). Runs npm run newsletter:draft, writes the headline, letter and poll from the month's real data, re-renders the share card, and hands the issue to Sanket to review and publish in /admin. Never publishes.
---

# Monthly newsletter

An issue is a `now_months` row. The data half is deterministic and already
done by a script; your job is only the prose. Read `docs/newsletter.md` if
anything below is unclear.

## Input

A month as `YYYY-MM`. If the user gave a month name, convert it. If none was
given, use the month that just ended (on the 1st–5th) or the current month
(otherwise), and say which you picked.

## Steps

1. **Collect.** Run:

   ```bash
   npm run newsletter:draft -- <YYYY-MM>
   ```

   This merges every race, trek, book, blog and micro-post of the month into
   the row, renders the share card, and writes
   `knowledge_base/newsletter/<YYYY-MM>.brief.json`. If it fails for a missing
   `SUPABASE_SERVICE_ROLE_KEY`, stop and tell the user. Use `--dry-run` first
   if the user only asked to preview.

2. **Read the brief.** It holds the month's sections, its stats, the number of
   active days, the last two letters (`previousNotes`) and last month's poll
   result (`lastPoll`). **These are the only facts you may use.** Never invent
   a number, a place, a time or a feeling that the brief does not support.

3. **Write** `knowledge_base/newsletter/<YYYY-MM>.md`:

   ```markdown
   ---
   headline: Rain, ridges and a PB
   poll:
     q: Which fort should I climb next?
     options: [Rajgad, Torna, Harihar]
   ---
   Dear reader,

   The letter…
   ```

   - **Headline:** 6 words or fewer. It is the share card's title and must
     survive a WhatsApp thumbnail.
   - **Letter:** first person, warm, 150–250 words, as Sanket. Match the voice
     of `previousNotes` when there are any. Say what the month *meant*, not
     what it contained — the sections already list the contents. Mention one
     or two specific items by name. English unless the month's writing is
     mostly Marathi.
   - **Last month's poll:** if `lastPoll` has votes, say which option won and
     what happens next, in one sentence.
   - **Poll:** one question readers can answer about next month, 2–4 short
     options. Skip it if nothing natural comes up.

4. **Write it to the row** and re-render the card with the new headline:

   ```bash
   npm run newsletter:draft -- <YYYY-MM> --note knowledge_base/newsletter/<YYYY-MM>.md
   ```

5. **Hand off.** Tell the user, in three lines: the headline, the admin link
   from the brief (`adminUrl`) where they review and press **Publish on
   save**, and that **Copy for Substack** on the same page produces the email
   version. Do not publish, do not commit `knowledge_base/` (it is gitignored),
   and do not edit the row any other way.

## If the month looks wrong

- Missing a race or trek: it is not in the archive yet. Tell the user to add it
  at `/admin`, then re-run step 1 — the script is idempotent.
- An item the user does not want: they delete it in `/admin`. Warn them that
  the next script run adds it back if it is still in the archive for that
  month — so trim in `/admin` after the last script run, not before.
