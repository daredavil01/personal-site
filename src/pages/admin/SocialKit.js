import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button, { IconButton } from "./ui/Button";
import Badge from "./ui/Badge";
import ConfirmDialog from "./ui/ConfirmDialog";
import {
  Checkbox, Input, Select, Textarea,
} from "./ui/Input";
import { Spinner, ErrorState, EmptyState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import {
  Copy, ExternalLink, Megaphone, RefreshCw, Trash2,
} from "./ui/icons";
import { faintText, hairline, mutedText } from "./ui/tokens";
import {
  BANNER_PRESETS, IMAGE_SIZES, IMAGE_STYLES, LINKEDIN_LINK, MAX_CONTENT_CHARS, PALETTES,
  TEMPLATE_VERSION, buildSocialPrompts, hasDevanagari, headlineTooLong,
} from "../../lib/socialPrompts";
import { isMarathi } from "../../lib/logbook";
import { normaliseUrl } from "../../lib/htmlText";
import {
  deleteSocialKit, getFeedPosts, getSocialKit, listSocialKits, saveSocialKit,
} from "../../lib/api/socialKits";

// One form for a blog post, then ChatGPT prompts for its social posts and
// graphics. No model is called anywhere on this page: the post comes from the
// Substack RSS feed (or is pasted), the prompts are researched templates filled
// in the browser (src/lib/socialPrompts.js, sources in docs/social-kit.md), and
// the owner runs them in ChatGPT. Kits are saved per post in social_kits (0036).

const CHATGPT_URL = "https://chatgpt.com/";

const EMPTY_POST = {
  url: "", title: "", subtitle: "", content: "", language: "English", source: "pasted",
};
const DEFAULT_OPTIONS = {
  headline: "",
  subhead: "",
  style: IMAGE_STYLES[0].key,
  palette: PALETTES[0].key,
  banner: BANNER_PRESETS[0].key,
  customW: "",
  customH: "",
  sizes: IMAGE_SIZES.map((s) => s.key),
  linkedinLink: LINKEDIN_LINK[0].key,
};

// The output cards, in reading order. Image cards are added per chosen size.
const TEXT_CARDS = [
  { key: "combined", title: "All social posts in one chat", hint: "Paste once; ChatGPT writes the Notes, the LinkedIn post and the share messages together." },
  { key: "notes", title: "Substack Notes", hint: "Three Notes of different lengths, each ending on an easy question." },
  { key: "linkedin", title: "LinkedIn", hint: "A headline inside the ~140 characters shown before “see more”, plus three alternatives." },
  { key: "share", title: "WhatsApp / Facebook / Threads", hint: "One message per app; the Threads link goes in the first reply." },
];

const imageCardTitle = (key, options) => {
  if (key === "banner") {
    const preset = BANNER_PRESETS.find((b) => b.key === options.banner);
    const size = preset?.key === "custom" ? `${options.customW}×${options.customH}` : preset?.label.split(" · ")[1];
    return `Image: blog banner${size ? ` · ${size}` : ""}`;
  }
  return `Image: ${IMAGE_SIZES.find((s) => s.key === key)?.label || key}`;
};

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

const PromptCard = ({
  title, hint, value, onChange, onCopy,
}) => (
  <Card
    title={title}
    description={hint}
    actions={(
      <>
        <Button size="sm" icon={Copy} onClick={() => onCopy(false)}>Copy</Button>
        <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => onCopy(true)}>Copy &amp; open ChatGPT</Button>
      </>
    )}
  >
    <Textarea
      rows={10}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-xs leading-relaxed"
      aria-label={`${title} prompt`}
    />
    <p className={`text-xs ${faintText} mt-1.5 mb-0`}>{`${value.length.toLocaleString()} characters`}</p>
  </Card>
);

const SocialKit = () => {
  const toast = useToast();
  const [post, setPost] = useState(EMPTY_POST);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [prompts, setPrompts] = useState(null);
  const [kitMeta, setKitMeta] = useState(null); // { id, templateVersion, edited }
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [feed, setFeed] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [pullNote, setPullNote] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  const unsaved = useUnsavedGuard(dirty);

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    try {
      setHistory(await listSocialKits());
    } catch (err) {
      setHistoryError(err);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedError(null);
    try {
      setFeed(await getFeedPosts());
    } catch (err) {
      setFeedError(err.message);
      setFeed([]);
    }
  }, []);

  useEffect(() => { loadHistory(); loadFeed(); }, [loadHistory, loadFeed]);

  const setPostField = (key, value) => setPost((prev) => ({ ...prev, [key]: value }));
  const setOption = (key, value) => setOptions((prev) => ({ ...prev, [key]: value }));
  const toggleSize = (key) => setOptions((prev) => ({
    ...prev,
    sizes: prev.sizes.includes(key) ? prev.sizes.filter((k) => k !== key) : [...prev.sizes, key],
  }));

  // Fills the form from a feed item. A blank headline and subhead keep
  // following the post's title and subtitle.
  const fill = (item) => {
    setPost({
      url: item.url,
      title: item.title,
      subtitle: item.subtitle,
      content: item.content,
      language: isMarathi(`${item.title}\n${item.content}`) ? "Marathi" : "English",
      source: "rss",
    });
    setPrompts(null);
    setKitMeta(null);
    setDirty(false);
    setPullNote({ tone: "success", text: "Pulled from the Substack feed. Check the text, then build the prompts." });
  };

  const pull = () => {
    const key = normaliseUrl(post.url.trim());
    if (!key) return;
    const saved = (history || []).find((k) => normaliseUrl(k.url) === key);
    const item = (feed || []).find((p) => p.key === key);
    if (item) {
      fill(item);
      if (saved) setPullNote({ tone: "warning", text: "Pulled from the feed. A kit for this post is already saved — building and saving will replace it." });
      return;
    }
    // Text the owner pasted stays; text an earlier pull filled in does not.
    setPost((prev) => (prev.source === "rss" ? { ...EMPTY_POST, url: prev.url } : prev));
    setPrompts(null);
    setKitMeta(null);
    setPullNote({
      tone: "warning",
      text: feedError
        ? `The feed could not be read (${feedError}). Paste the title, subtitle and text below.`
        : "Not among the feed's latest posts (older posts and WordPress aren't in it). Paste the title, subtitle and text below.",
    });
  };

  const pickRecent = (url) => {
    const item = (feed || []).find((p) => p.url === url);
    if (item) fill(item);
  };

  const input = useMemo(() => ({
    ...post,
    ...options,
    headline: options.headline.trim() || post.title.trim(),
    subhead: options.subhead.trim() || post.subtitle.trim(),
  }), [post, options]);

  const customOk = options.banner !== "custom"
    || (Number(options.customW) >= 200 && Number(options.customH) >= 200
      && Number(options.customW) <= 4096 && Number(options.customH) <= 4096);
  const ready = post.url.trim() && post.title.trim() && post.content.trim() && customOk;

  const save = async (next) => {
    setSaving(true);
    try {
      const saved = await saveSocialKit(next);
      setKitMeta({ id: saved.id, templateVersion: saved.templateVersion, edited: saved.edited });
      setDirty(false);
      loadHistory();
      return true;
    } catch (err) {
      toast.error(`Not saved: ${err.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const build = async () => {
    if (!ready) return;
    const built = buildSocialPrompts(input);
    setPrompts(built);
    const ok = await save({
      ...post, options, prompts: built, templateVersion: TEMPLATE_VERSION, edited: false,
    });
    if (ok) toast.success("Prompts built and saved.");
  };

  const editPrompt = (path, value) => {
    setPrompts((prev) => (path.image
      ? { ...prev, images: { ...prev.images, [path.image]: value } }
      : { ...prev, [path.text]: value }));
    setDirty(true);
  };

  const saveEdits = async () => {
    const ok = await save({
      ...post, options, prompts, templateVersion: kitMeta?.templateVersion ?? TEMPLATE_VERSION, edited: true,
    });
    if (ok) toast.success("Saved.");
  };

  const copy = async (text, open) => {
    const ok = await copyText(text);
    if (ok) toast.success(open ? "Copied — paste it into the new ChatGPT chat." : "Copied.");
    else toast.error("The browser blocked the clipboard. Select the text and copy it by hand.");
    if (open) window.open(CHATGPT_URL, "_blank", "noopener");
  };

  const open = (id) => unsaved.guard(async () => {
    try {
      const kit = await getSocialKit(id);
      setPost({
        url: kit.url,
        title: kit.title,
        subtitle: kit.subtitle,
        content: kit.content,
        language: kit.language,
        source: kit.source,
      });
      setOptions({ ...DEFAULT_OPTIONS, ...kit.options });
      setPrompts(kit.prompts && Object.keys(kit.prompts).length ? kit.prompts : null);
      setKitMeta({ id: kit.id, templateVersion: kit.templateVersion, edited: kit.edited });
      setDirty(false);
      setPullNote(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message);
    }
  });

  const startOver = () => unsaved.guard(() => {
    setPost(EMPTY_POST);
    setOptions(DEFAULT_OPTIONS);
    setPrompts(null);
    setKitMeta(null);
    setDirty(false);
    setPullNote(null);
  });

  const remove = async () => {
    await deleteSocialKit(deleting.id);
    if (kitMeta?.id === deleting.id) {
      setKitMeta(null);
      setPrompts(null);
    }
    setDeleting(null);
    toast.success("Deleted.");
    loadHistory();
  };

  const shownHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return (history || []).filter((k) => !q || `${k.title} ${k.url}`.toLowerCase().includes(q));
  }, [history, historyQuery]);

  const { headline } = input;
  const outdated = kitMeta && kitMeta.templateVersion < TEMPLATE_VERSION;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social kit"
        description="Pull a blog post, then copy ready-made ChatGPT prompts for its Substack Notes, LinkedIn post, WhatsApp/Facebook/Threads messages and graphics. Nothing here calls a model."
        actions={<Button variant="ghost" icon={RefreshCw} onClick={startOver}>Start over</Button>}
      />

      <Card title="1. The post" description="Paste a link and pull it from the Substack feed (its latest posts), or fill the fields by hand.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Blog link" required span="full">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://sankettambare.substack.com/p/…"
                value={post.url}
                onChange={(e) => setPostField("url", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pull(); } }}
              />
              <Button variant="primary" onClick={pull} disabled={!post.url.trim() || feed === null}>
                {feed === null ? "Reading feed…" : "Pull"}
              </Button>
            </div>
          </Field>
          {feed && feed.length > 0 && (
            <Field label="Or pick a recent post" span="full">
              <Select value="" onChange={(e) => pickRecent(e.target.value)}>
                <option value="">{`${feed.length} latest posts on Substack…`}</option>
                {feed.map((item) => (
                  <option key={item.url} value={item.url}>{`${item.title}${item.date ? ` — ${when(item.date)}` : ""}`}</option>
                ))}
              </Select>
            </Field>
          )}
          {pullNote && (
            <div className="md:col-span-2">
              <Badge tone={pullNote.tone}>{pullNote.tone === "success" ? "From the feed" : "Paste it"}</Badge>
              <span className={`text-sm ${mutedText} ml-2`}>{pullNote.text}</span>
            </div>
          )}
          <Field label="Title" required>
            <Input value={post.title} onChange={(e) => setPostField("title", e.target.value)} />
          </Field>
          <Field label="Language" hint="Captions are written in the post's language; image prompts stay in English.">
            <Select value={post.language} onChange={(e) => setPostField("language", e.target.value)}>
              <option value="English">English</option>
              <option value="Marathi">Marathi</option>
            </Select>
          </Field>
          <Field label="Subtitle" span="full">
            <Input value={post.subtitle} onChange={(e) => setPostField("subtitle", e.target.value)} />
          </Field>
          <Field
            label="Content"
            required
            span="full"
            hint={post.content.length > MAX_CONTENT_CHARS
              ? `${post.content.length.toLocaleString()} characters — the prompts carry the first ${MAX_CONTENT_CHARS.toLocaleString()}, cut at a paragraph.`
              : `${post.content.length.toLocaleString()} characters`}
          >
            <Textarea
              rows={10}
              value={post.content}
              onChange={(e) => {
                setPostField("content", e.target.value);
                if (post.source === "rss") setPostField("source", "pasted");
              }}
            />
          </Field>
        </div>
      </Card>

      <Card title="2. Options" description="What the image prompts put on the picture, which sizes to make, and where LinkedIn's link goes.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Headline on the image"
            hint={`Blank uses the title. Six words or fewer reads at thumbnail size.${hasDevanagari(headline) ? " Image models garble Devanagari often — an English headline is safer." : ""}`}
            error={headlineTooLong(headline) ? "Longer than six words — shorten it for a thumbnail." : null}
          >
            <Input value={options.headline} placeholder={post.title} onChange={(e) => setOption("headline", e.target.value)} />
          </Field>
          <Field label="Subhead on the image" hint="Blank uses the subtitle.">
            <Input value={options.subhead} placeholder={post.subtitle} onChange={(e) => setOption("subhead", e.target.value)} />
          </Field>
          <Field label="Style">
            <Select value={options.style} onChange={(e) => setOption("style", e.target.value)}>
              {IMAGE_STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Colours">
            <Select value={options.palette} onChange={(e) => setOption("palette", e.target.value)}>
              {PALETTES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Blog banner size">
            <Select value={options.banner} onChange={(e) => setOption("banner", e.target.value)}>
              {BANNER_PRESETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </Select>
          </Field>
          {options.banner === "custom" && (
            <Field label="Custom size (px)" error={customOk ? null : "Each side 200–4096 px."}>
              <div className="flex items-center gap-2">
                <Input type="number" min={200} max={4096} placeholder="Width" value={options.customW} onChange={(e) => setOption("customW", e.target.value)} />
                <span className={mutedText}>×</span>
                <Input type="number" min={200} max={4096} placeholder="Height" value={options.customH} onChange={(e) => setOption("customH", e.target.value)} />
              </div>
            </Field>
          )}
          <Field label="LinkedIn link" hint="2025 data mostly shows in-post links cost reach; it is mixed, so it is your call.">
            <Select value={options.linkedinLink} onChange={(e) => setOption("linkedinLink", e.target.value)}>
              {LINKEDIN_LINK.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Also make" span="full">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {IMAGE_SIZES.map((s) => (
                // eslint-disable-next-line jsx-a11y/label-has-associated-control -- Checkbox renders an <input>
                <label key={s.key} htmlFor={`size-${s.key}`} className="flex items-center gap-2 text-sm">
                  <Checkbox id={`size-${s.key}`} checked={options.sizes.includes(s.key)} onChange={() => toggleSize(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button variant="primary" icon={Megaphone} onClick={build} loading={saving && !prompts} disabled={!ready || saving}>
            {prompts ? "Rebuild prompts" : "Build prompts"}
          </Button>
          {!ready && <span className={`text-sm ${mutedText}`}>Needs a link, a title and the post text.</span>}
          {prompts && kitMeta?.edited && (
            <span className={`text-sm ${mutedText}`}>Rebuilding replaces your hand edits.</span>
          )}
        </div>
      </Card>

      {prompts && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-body font-semibold text-base mb-0">3. Prompts</h2>
            {outdated && <Badge tone="warning">Built with older templates — rebuild to update</Badge>}
            {dirty && <Badge tone="accent">Unsaved edits</Badge>}
            <div className="ml-auto">
              <Button variant="primary" onClick={saveEdits} disabled={!dirty || saving} loading={saving && dirty}>Save changes</Button>
            </div>
          </div>
          {TEXT_CARDS.filter((c) => typeof prompts[c.key] === "string").map((c) => (
            <PromptCard
              key={c.key}
              title={c.title}
              hint={c.hint}
              value={prompts[c.key]}
              onChange={(v) => editPrompt({ text: c.key }, v)}
              onCopy={(openChat) => copy(prompts[c.key], openChat)}
            />
          ))}
          {Object.entries(prompts.images || {}).map(([key, value]) => (
            <PromptCard
              key={key}
              title={imageCardTitle(key, options)}
              hint="Paste into ChatGPT and ask it to create the image."
              value={value}
              onChange={(v) => editPrompt({ image: key }, v)}
              onCopy={(openChat) => copy(value, openChat)}
            />
          ))}
        </div>
      )}

      <Card title="Saved kits" description="One per post. Opening one loads its post, options and prompts.">
        {historyError && <ErrorState error={historyError} action={<Button onClick={loadHistory}>Retry</Button>} />}
        {!historyError && !history && <Spinner label="Loading saved kits…" />}
        {history && history.length === 0 && (
          <EmptyState icon={Megaphone} title="No kits yet" description="Build prompts for a post and it is saved here." />
        )}
        {history && history.length > 0 && (
          <div className="flex flex-col gap-3">
            <Input
              type="search"
              placeholder="Search saved kits…"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              aria-label="Search saved kits"
            />
            <ul className="flex flex-col gap-2 mb-0">
              {shownHistory.map((k) => (
                <li key={k.id} className={`flex flex-wrap items-center gap-2 rounded-md border p-2 ${hairline} ${kitMeta?.id === k.id ? "ring-2 ring-admin-500/40" : ""}`}>
                  <button type="button" onClick={() => open(k.id)} className="text-left text-sm font-medium flex-1 min-w-[12rem] hover:underline">
                    {k.title}
                  </button>
                  <span className={`text-xs ${mutedText}`}>{when(k.updatedAt)}</span>
                  <Badge>{k.language}</Badge>
                  {k.source === "rss" && <Badge tone="success">feed</Badge>}
                  {k.edited && <Badge tone="accent">edited</Badge>}
                  {k.templateVersion < TEMPLATE_VERSION && <Badge tone="warning">older templates</Badge>}
                  <IconButton size="sm" variant="dangerGhost" icon={Trash2} onClick={() => setDeleting(k)} label={`Delete the kit for ${k.title}`} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this kit?"
        message={deleting ? `The saved prompts for “${deleting.title}” are deleted. The post itself is untouched.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={unsaved.pending}
        title="Discard your changes?"
        message="This kit has edited prompts that are not saved. Leaving now throws them away."
        confirmLabel="Discard"
        destructive
        onConfirm={unsaved.confirm}
        onClose={unsaved.cancel}
      />
    </div>
  );
};

export default SocialKit;
