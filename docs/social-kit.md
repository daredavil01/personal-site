# Social kit (`/admin/social`)

One form for a blog post, then copy-ready **ChatGPT prompts** for sharing it:
three Substack Notes, a LinkedIn post, WhatsApp / Facebook / Threads messages,
and an image prompt per chosen size. **The site calls no model and makes no
request per post.** It pulls the post from the Substack RSS feed (one request
for the latest 20) or takes it pasted, fills researched templates in the
browser, and the owner runs each prompt in ChatGPT.

| Piece | Where |
|---|---|
| Templates (the only copy) | `src/lib/socialPrompts.js` |
| Page | `src/pages/admin/SocialKit.js` |
| Saved kits | `social_kits` (`supabase/migrations/0036_social_kits.sql`), `src/lib/api/socialKits.js` |
| Feed | `functions/rss-feed.js?full=1` → raw `content:encoded` per item; text conversion in the browser (`src/lib/htmlText.js`) |
| Tests | `src/lib/socialPrompts.test.js`, `src/lib/htmlText.test.js` |

## Workflow

1. Paste the post's link and press **Pull**, or pick one of the feed's latest
   posts. Title, subtitle (the RSS `<description>`), text and language fill in;
   everything stays editable. Older posts and WordPress posts are not in the
   feed — paste their text.
2. Set the image headline (≤ 6 words; blank uses the title) and subhead, the
   style, the colours, the banner size and which other sizes to make, and where
   LinkedIn's link goes.
3. **Build prompts.** The kit is saved (one per post, keyed on the normalised
   URL). Edit any prompt and **Save changes**.
4. **Copy** or **Copy & open ChatGPT**. "All social posts in one chat" pastes
   the post once and asks for every platform; the per-platform cards are for
   redoing one.

## Why it is built this way

- **No model call.** Prompts cost nothing and carry no quota, key or failure
  mode; ChatGPT with the owner's own account writes the posts and draws the
  images (it renders text in images; the site's free model ladder cannot).
- **The feed, not a per-post fetch.** Substack blocks CORS, and its API 403s
  some server requests; the existing RSS proxy already reaches it. The body is
  passed through as HTML and converted in the browser because ~0.5 MB of
  HTML-to-text on the edge could cost more than Workers Free's 10 ms of CPU.
- **Templates are versioned.** `TEMPLATE_VERSION` is stored on each kit; a kit
  built with older templates shows a badge and can be rebuilt.

## The rules and where they come from

Re-read on 2026-10-23. The owner's brief adds three rules to every prompt:
concise, interactive (each post ends on a question) and with emoji, written in
the post's language.

| Rule | Source |
|---|---|
| Notes: 3 Notes, one standalone idea each, mixed lengths (micro / short / medium) | [Level Up With AI — Notes prompt](https://levelupwithai.substack.com/p/dont-know-what-to-write-on-notes) |
| Notes: short is fine — Bestseller median ~172 characters | [Write Build Scale — 2.7M Notes](https://writebuildscale.substack.com/p/i-analyzed-27-million-substack-notes) |
| Notes: end on a direct, low-effort question that names its answer format (most comments per like) | [Write Build Scale — 2.7M Notes](https://writebuildscale.substack.com/p/i-analyzed-27-million-substack-notes) |
| Notes: no rhetorical questions, no generic motivational endings | [Level Up With AI](https://levelupwithai.substack.com/p/dont-know-what-to-write-on-notes) |
| Notes: short single lines with white space | [Write Build Scale — guide](https://writebuildscale.substack.com/p/the-ultimate-guide-to-writing-substack) |
| LinkedIn: headline inside ~140 characters (mobile "see more"; ~210 desktop) | [Contentin — line-break formatting](https://contentin.io/glossary/line-break-formatting/) |
| LinkedIn: say "headline / subheading", not "hook / rehook"; one-line sentences | [Savvy Snack](https://savvysnack.substack.com/p/write-linkedin-posts-with-chatgpt) |
| LinkedIn: line breaks and emoji carry the layout; the composer strips bold | [Contentin](https://contentin.io/glossary/line-break-formatting/) |
| LinkedIn: no Unicode bold (screen readers, search) | [LinkedIn formatting guides](https://linkedgrow.ai/blog/linkedin-post-formatting-guide) |
| LinkedIn: link in the first comment by default, switchable — the 2025 data is mixed | [Ordinal link-penalty study](https://www.tryordinal.com/blog/linkedin-link-penalty-study), [Oktopost](https://www.oktopost.com/blog/outbound-links-on-linkedin/) |
| Threads: ≤ 500 characters; open-ended questions are the main engagement format; links hurt reach → link in the first reply | [Buffer — Threads](https://buffer.com/resources/threads-content-ideas/) |
| WhatsApp: text Status ≤ 700 characters, keep it brief; a pasted URL becomes a link preview | [Timelines.ai](https://timelines.ai/how-to-use-whatsapp-status-for-marketing) |
| Prompt shape: role → context → delimited source → task → rules → output format | [promptoptimizer — repurposing](https://promptoptimizer.tools/blog/how-to-use-chatgpt-to-repurpose-content), [GainApp](https://blog.gainapp.com/chatgpt-prompts-for-linkedin/) |
| Images: labelled segments; state the use; scene → subject → details → constraints | [OpenAI cookbook — image prompting](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) |
| Images: literal text in quotes, rendered verbatim, "exactly once"; no other text, watermarks, logos | [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide), [Runware — GPT Image 2](https://runware.ai/docs/models/openai-gpt-image-2/guides/prompting) |
| Images: call out placement and negative space; no tiny text | [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) |
| Images: non-Latin text renders worse → warn on a Devanagari headline | [ChatGPT — Wikipedia](https://en.wikipedia.org/wiki/ChatGPT) |
| Images: the headline ≤ 6 words survives a ~300 px thumbnail | The site's own card rule (CLAUDE.md, OG cards) |
| Banner: Substack's social preview is 1456×1048 (14:10) | [Substack image size FAQ](https://frequentlyaskedquestions.substack.com/p/substack-image-size-faq-the-definitive) |

## Changing a template

Edit `src/lib/socialPrompts.js`, add the source for any new rule to the table
above, bump `TEMPLATE_VERSION`, and run `npx jest src/lib/socialPrompts.test.js`.
