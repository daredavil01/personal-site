import React from "react";
import BrandMark from "./BrandMark";
import FitBox from "./FitBox";
import { hashString } from "../../lib/generativeArt";
import { highlightSegments, quoteWrap, QUOTES } from "./shareDesign";

// The ten compositions. Each receives one resolved context `c` from ShareCard:
//   c.t       theme tokens            c.accent  accent after any custom pick
//   c.pf      font pairing            c.d       the design (every option)
//   c.m       share model             c.title / c.body   text after edits + case
//   c.H       frame height or null    c.P       padding in px
//   c.fixed   whether the frame has a fixed height
// Every type size is `calc(<px> * var(--k))` so FitBox can shrink a layout's
// text stack to its frame. No layout reads raw item fields or knows the kind
// beyond what the model says.

const LABEL_FONT = '"Plus Jakarta Sans", "Inter", sans-serif';
const k = (px) => `calc(${Math.round(px)}px * var(--k, 1))`;
export const withAlpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

const flexAlign = (align) => ({ left: "flex-start", justify: "flex-start", center: "center", right: "flex-end" }[align] || "flex-start");
const headAlign = (align) => (align === "justify" ? "left" : align);

// ---- Shared parts ----------------------------------------------------------

const Eyebrow = ({ c, style }) => (c.d.showEyebrow && c.m.eyebrow ? (
  <span style={{
    fontFamily: LABEL_FONT, fontSize: 22, letterSpacing: "0.3em", textTransform: "uppercase", color: c.accent, fontWeight: 600, ...style,
  }}
  >
    {c.m.eyebrow}
  </span>
) : null);

const Header = ({ c, center = false }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: center ? "center" : "space-between", gap: 24, flexShrink: 0, flexDirection: center ? "column" : "row",
  }}
  >
    <BrandMark src={c.t.logo} alt="" style={{ height: 76, width: "auto", objectFit: "contain" }} />
    <Eyebrow c={c} />
  </div>
);

const metaRows = (c) => (c.d.showMeta ? (c.m.metaRows || []).filter((row) => c.d.showDate || !row.isDate) : []);

const Meta = ({ c, style }) => {
  const rows = metaRows(c);
  if (!rows.length) return null;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "12px 32px", justifyContent: flexAlign(c.d.align), ...style,
    }}
    >
      {rows.map((row) => (
        <span
          key={row.label}
          style={{
            display: "flex", alignItems: "center", gap: 8, fontFamily: LABEL_FONT, fontSize: k(22), letterSpacing: "0.08em", textTransform: "uppercase", color: c.t.muted,
          }}
        >
          {row.icon ? <span className="material-symbols-outlined" style={{ fontSize: k(26), color: c.accent }}>{row.icon}</span> : null}
          {row.label}
        </span>
      ))}
    </div>
  );
};

const Tags = ({ c, inline = false, style }) => {
  const tags = c.d.showTags ? (c.m.tags || []) : [];
  if (!tags.length) return null;
  const shown = tags.slice(0, 8);
  const extra = tags.length - shown.length;
  if (inline) {
    return (
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 24, color: c.accent, fontFamily: c.pf.body, ...style,
      }}
      >
        {shown.map((tag) => <span key={tag}>{`#${tag}`}</span>)}
        {extra > 0 ? <span style={{ color: c.t.muted }}>{`+${extra}`}</span> : null}
      </div>
    );
  }
  const chip = {
    border: `1.5px solid ${c.t.chip.border}`, background: c.t.chip.bg, color: c.t.chip.ink, borderRadius: 10, padding: "6px 16px", fontSize: 21, fontFamily: LABEL_FONT,
  };
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 12, justifyContent: flexAlign(c.d.align), flexShrink: 0, ...style,
    }}
    >
      {shown.map((tag) => <span key={tag} style={chip}>{`#${tag}`}</span>)}
      {extra > 0 ? <span style={chip}>{`+${extra}`}</span> : null}
    </div>
  );
};

const Footer = ({
  c, rule = true, signature = true, center = false, style,
}) => {
  const showSig = signature && c.d.showSignature;
  if (!showSig && !c.d.showUrl && !c.m.footerNote) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: center ? "center" : "space-between", gap: 24, flexShrink: 0, borderTop: rule ? `2px solid ${c.t.rule}` : "none", paddingTop: rule ? 26 : 0, flexDirection: center ? "column" : "row", ...style,
    }}
    >
      {showSig ? <BrandMark src={c.t.signature} alt="" style={{ height: 62, width: "auto", objectFit: "contain" }} /> : <span />}
      {c.d.showUrl ? (
        <div style={{ textAlign: center ? "center" : "right", color: c.t.muted }}>
          {c.m.footerNote ? (
            <div style={{
              fontFamily: LABEL_FONT, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase",
            }}
            >
              {c.m.footerNote}
            </div>
          ) : null}
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 18 }}>{c.m.footerUrl}</div>
        </div>
      ) : null}
    </div>
  );
};

const Hero = ({
  c, height, cap, radius = 24, border = true, fit, style,
}) => (c.showHero ? (
  <div style={{
    height: height == null ? undefined : height, flexShrink: 0, display: "flex", justifyContent: "center", ...style,
  }}
  >
    <img
      src={c.m.imageUrl}
      alt=""
      crossOrigin="anonymous"
      style={{
        height: height == null ? "auto" : "100%",
        maxHeight: height == null ? cap : undefined,
        width: height != null && (fit || c.d.imageFit) === "cover" ? "100%" : "auto",
        maxWidth: "100%",
        objectFit: fit || c.d.imageFit,
        objectPosition: "top",
        borderRadius: radius,
        border: border ? `2px solid ${c.t.rule}` : "none",
      }}
    />
  </div>
) : null);

// A photo shown whole (never cropping a face) over a blurred copy of itself,
// so a frame of a different shape has no bars. "Fill" crops instead.
const PhotoFill = ({ c, style, cap }) => {
  const natural = style?.height == null;
  return (
  <div style={{
    position: "relative", overflow: "hidden", background: "#1c1917", display: "flex", justifyContent: "center", ...style,
  }}
  >
    {c.d.imageFit === "contain" ? (
      <img
        src={c.m.imageUrl}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.8)", transform: "scale(1.15)",
        }}
      />
    ) : null}
    <img
      src={c.m.imageUrl}
      alt=""
      crossOrigin="anonymous"
      style={natural ? {
        position: "relative", display: "block", width: "auto", maxWidth: "100%", height: "auto", maxHeight: cap,
      } : {
        position: "relative", width: "100%", height: "100%", objectFit: c.d.imageFit, objectPosition: "top",
      }}
    />
  </div>
  );
};

const markStyle = (c) => {
  if (c.d.highlightStyle === "underline") {
    return {
      textDecoration: "underline", textDecorationColor: c.accent, textDecorationThickness: "0.09em", textUnderlineOffset: "0.16em",
    };
  }
  if (c.d.highlightStyle === "ink") return { color: c.accent };
  return {
    background: `linear-gradient(transparent 52%, ${withAlpha(c.accent, 0.42)} 52%, ${withAlpha(c.accent, 0.42)} 92%, transparent 92%)`,
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
  };
};

/** Text with the highlighted phrase marked; optionally wrapped in quote marks. */
const Marked = ({ c, text, quoted = false, dropCap = false }) => {
  const segments = highlightSegments(quoted ? quoteWrap(text, c.d.quoteMarks) : text, c.highlight);
  let capped = false;
  return segments.map((seg, i) => {
    let { text: chunk } = seg;
    let cap = null;
    if (dropCap && !capped && chunk) {
      capped = true;
      const first = Array.from(chunk)[0];
      chunk = chunk.slice(first.length);
      cap = (
        <span style={{
          float: "left", fontFamily: c.pf.display, fontSize: "3.3em", lineHeight: 0.82, marginRight: "0.08em", marginTop: "0.06em", color: c.accent, fontWeight: c.pf.displayWeight,
        }}
        >
          {first}
        </span>
      );
    }
    // eslint-disable-next-line react/no-array-index-key
    return <React.Fragment key={i}>{cap}{seg.mark ? <span style={markStyle(c)}>{chunk}</span> : chunk}</React.Fragment>;
  });
};

const bodyFont = (c) => (c.d.bodyFace === "display" ? c.pf.display : c.pf.body);
const bodyWeight = (c) => {
  if (c.d.weight === "bold") return 700;
  return c.d.bodyFace === "display" ? c.pf.displayWeight : c.pf.bodyWeight;
};

const Title = ({ c, size, style }) => (c.title ? (
  <h1 style={{
    margin: 0,
    fontFamily: c.pf.display,
    fontWeight: c.pf.displayWeight,
    fontSize: k(size * (c.pf.scale || 1)),
    lineHeight: 1.06,
    letterSpacing: c.d.tracking === "wide" ? "0.04em" : "-0.01em",
    textTransform: c.pf.displayCaps ? "uppercase" : undefined,
    color: c.t.titleInk || c.t.ink,
    textShadow: c.t.riso ? `5px 4px 0 ${c.t.riso}` : c.t.glow,
    textAlign: headAlign(c.d.align),
    overflowWrap: "anywhere",
    ...style,
  }}
  >
    {c.title}
  </h1>
) : null);

const Subtitle = ({ c }) => (c.m.subtitle ? (
  <p style={{
    margin: 0, fontFamily: c.pf.body, fontStyle: "italic", fontSize: k(32), color: c.t.muted, textAlign: headAlign(c.d.align),
  }}
  >
    {c.m.subtitle}
  </p>
) : null);

const Body = ({
  c, size, display = false, quoted = false, dropCap = false, style,
}) => (c.body ? (
  <p
    data-clamp
    style={{
      margin: 0,
      whiteSpace: "pre-line",
      fontFamily: display ? c.pf.display : bodyFont(c),
      fontWeight: display ? c.pf.displayWeight : bodyWeight(c),
      fontSize: k(size * (c.pf.scale || 1)),
      lineHeight: c.leading,
      letterSpacing: c.tracking,
      textTransform: display && c.pf.displayCaps ? "uppercase" : undefined,
      color: c.t.ink,
      textAlign: c.d.align,
      overflowWrap: "anywhere",
      ...style,
    }}
  >
    <Marked c={c} text={c.body} quoted={quoted} dropCap={dropCap} />
  </p>
) : null);

const Column = ({ c, children, gap = 40 }) => (
  <div style={{
    position: "relative", display: "flex", flexDirection: "column", gap, padding: c.P, flex: c.fixed ? "1 1 0" : "0 0 auto", minHeight: 0,
  }}
  >
    {children}
  </div>
);

// Frame-height fractions for a photo.
// S/M/L are fixed heights; Full is null (natural height) and `heroCap` is the
// most a full photo may take of a fixed frame. On "Fit" it is not capped.
const heroH = (c, frac) => (c.d.imageSize === "full" ? null
  : Math.round((c.H || 1350) * frac * ({ s: 0.7, m: 1, l: 1.35 }[c.d.imageSize] || 1)));
// A long post keeps room for its words on a fixed frame; "Fit" shows both whole.
const editorialCap = (c) => {
  if (!c.body) return 0.66;
  return c.body.length > 300 ? 0.42 : 0.56;
};
const heroCap = (c, frac) => (c.fixed ? Math.round(c.H * frac) : undefined);

// ---- Layouts ---------------------------------------------------------------

const Editorial = ({ c }) => (
  <>
    <div style={{ height: 12, background: c.accent, flexShrink: 0 }} />
    <Column c={c}>
      <Header c={c} />
      <Hero c={c} height={heroH(c, 0.28)} cap={heroCap(c, editorialCap(c))} />
      <FitBox fixed={c.fixed} valign={c.d.valign} align={flexAlign(c.d.align)} gap={26} fitKey={c.fitKey}>
        <Title c={c} size={c.title.length > 48 ? 64 : 80} />
        <Subtitle c={c} />
        <Meta c={c} />
        <Body c={c} size={c.bodySize} quoted={c.m.quote && c.d.quoteMarks !== "none"} />
      </FitBox>
      <Tags c={c} />
      <Footer c={c} />
    </Column>
  </>
);

const PullQuote = ({ c }) => {
  const text = c.body || c.title;
  const [open] = QUOTES[c.d.quoteMarks] || QUOTES.curly;
  const qc = { ...c, body: text };
  return (
    <Column c={c} gap={34}>
      <Header c={c} />
      <FitBox fixed={c.fixed} valign={c.d.valign} align={flexAlign(c.d.align)} gap={30} fitKey={c.fitKey}>
        {open ? (
          <span style={{
            fontFamily: c.pf.display, fontSize: k(300), lineHeight: 0.62, height: k(150), color: c.accent, fontWeight: 700, textShadow: c.t.riso ? `6px 4px 0 ${c.t.riso}` : undefined,
          }}
          >
            {open}
          </span>
        ) : null}
        <Body c={qc} size={c.bodySize * 1.12} display style={{ fontWeight: c.d.weight === "bold" ? 700 : Math.min(c.pf.displayWeight, 600) }} />
        <div style={{ width: 130, height: 7, background: c.accent, borderRadius: 4 }} />
        <div style={{
          display: "flex", flexDirection: "column", gap: 8, alignItems: flexAlign(c.d.align),
        }}
        >
          <span style={{
            fontFamily: c.pf.body, fontSize: k(30), color: c.t.ink, fontWeight: 600,
          }}
          >
            {`— ${c.m.author}`}
          </span>
          {c.body && c.title ? (
            <span style={{
              fontFamily: c.pf.body, fontStyle: "italic", fontSize: k(26), color: c.t.muted,
            }}
            >
              {c.title}
            </span>
          ) : null}
          <Meta c={c} />
        </div>
      </FitBox>
      <Tags c={c} />
      <Footer c={c} />
    </Column>
  );
};

const Poster = ({ c }) => {
  const text = c.body && c.body.length <= 280 ? c.body : (c.title || c.body);
  const photo = c.showHero;
  return (
    <>
      {photo ? (
        <>
          <img
            src={c.m.imageUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            }}
          />
          {/* A scrim in the theme's own ground, opaque where the words sit, so
              the ink keeps its contrast whatever the photo is. */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${withAlpha(c.t.base, 0.1)} 0%, ${withAlpha(c.t.base, 0.55)} 30%, ${withAlpha(c.t.base, 0.93)} 52%, ${c.t.base} 75%)` }} />
        </>
      ) : null}
      {c.d.showEyebrow && c.m.eyebrow ? (
        <span style={{
          position: "absolute", left: Math.round(c.P * 0.38), top: c.P, writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: LABEL_FONT, fontSize: 20, letterSpacing: "0.4em", textTransform: "uppercase", color: c.accent, fontWeight: 700,
        }}
        >
          {c.m.eyebrow}
        </span>
      ) : null}
      <Column c={c} gap={30}>
        <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <BrandMark src={c.t.logo} alt="" style={{ height: 70, width: "auto" }} />
        </div>
        <FitBox fixed={c.fixed} valign={photo && c.d.valign === "top" ? "bottom" : c.d.valign} align={flexAlign(c.d.align)} gap={30} minK={0.3} fitKey={c.fitKey} style={photo ? { flex: "0 1 auto", maxHeight: "62%", marginTop: "auto" } : undefined}>
          <div style={{ width: 150, height: 16, background: c.accent }} />
          <p
            data-clamp
            style={{
              margin: 0,
              whiteSpace: "pre-line",
              fontFamily: c.pf.display,
              fontWeight: c.d.weight === "bold" ? 900 : c.pf.displayWeight,
              fontSize: k(c.posterSize * (c.pf.scale || 1)),
              lineHeight: Math.min(c.leading, 1.08),
              letterSpacing: c.d.tracking === "normal" ? "-0.02em" : c.tracking,
              textTransform: c.pf.displayCaps ? "uppercase" : undefined,
              color: c.t.titleInk || c.t.ink,
              textShadow: c.t.riso ? `6px 5px 0 ${c.t.riso}` : c.t.glow,
              textAlign: c.d.align,
              overflowWrap: "anywhere",
            }}
          >
            <Marked c={c} text={text} />
          </p>
          <span style={{
            fontFamily: LABEL_FONT, fontSize: k(24), letterSpacing: "0.18em", textTransform: "uppercase", color: c.t.muted,
          }}
          >
            {[c.m.author, c.d.showDate ? c.m.date : ""].filter(Boolean).join("  ·  ")}
          </span>
        </FitBox>
        <Tags c={c} />
        <Footer c={c} rule={false} />
      </Column>
    </>
  );
};

const Polaroid = ({ c }) => {
  const caption = c.title || (c.body || "").split(/(?<=[.!?।])\s|\n/)[0].slice(0, 70);
  const frameH = heroH(c, c.body ? 0.34 : 0.42);
  return (
    <Column c={c} gap={34}>
      <Header c={c} />
      <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <div style={{
          background: "#fbfaf6", padding: "26px 26px 0", width: "86%", transform: `rotate(${c.d.align === "right" ? 2 : -2}deg)`, boxShadow: "0 22px 50px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column",
        }}
        >
          {c.showHero ? <PhotoFill c={c} style={{ height: frameH }} cap={heroCap(c, c.body ? 0.5 : 0.6)} /> : null}
          <div style={{
            height: frameH ?? 420, background: `linear-gradient(135deg, ${c.accent}, ${withAlpha(c.accent, 0.55)})`, overflow: "hidden", display: c.showHero ? "none" : "flex", alignItems: "center", justifyContent: "center",
          }}
          >
            {c.showHero ? null : (
              <span style={{
                fontFamily: c.pf.display, fontSize: 260, color: "#fff", opacity: 0.9,
              }}
              >
                {Array.from(caption || "·")[0]}
              </span>
            )}
          </div>
          <div style={{
            minHeight: 128, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 18px",
          }}
          >
            <span style={{
              fontFamily: c.pf.display, fontSize: 46 * (c.pf.scale || 1), color: "#26221d", textAlign: "center", lineHeight: 1.1,
            }}
            >
              {caption}
            </span>
          </div>
        </div>
      </div>
      <FitBox fixed={c.fixed} valign={c.d.valign} align={flexAlign(c.d.align)} gap={20} fitKey={c.fitKey}>
        <Meta c={c} />
        <Body c={{ ...c, body: c.title ? c.body : (c.body || "").slice(caption.length).trim() }} size={c.bodySize * 0.82} />
      </FitBox>
      <Tags c={c} />
      <Footer c={c} />
    </Column>
  );
};

const Note = ({ c }) => (
  <Column c={c} gap={30}>
    <FitBox fixed={c.fixed} valign={c.d.valign === "top" ? "middle" : c.d.valign} align="stretch" fitKey={c.fitKey}>
      <div style={{
        background: c.t.panel, border: `2px solid ${c.t.rule}`, borderRadius: 40, padding: 56, display: "flex", flexDirection: "column", gap: 30, boxShadow: c.t.dark ? "none" : "0 20px 60px rgba(0,0,0,0.08)",
      }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{
            width: 92, height: 92, borderRadius: "50%", overflow: "hidden", border: `3px solid ${c.accent}`, background: c.t.base, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
          >
            <BrandMark src={c.t.dark ? c.t.logo : "/images/brand/logo_circle.png"} alt="" style={{ width: "88%", height: "88%", objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <span style={{
              fontFamily: c.pf.body, fontWeight: 700, fontSize: k(34), color: c.t.ink,
            }}
            >
              {c.m.author}
            </span>
            <span style={{ fontFamily: c.pf.body, fontSize: k(24), color: c.t.muted }}>
              {[`@${(c.m.footerUrl || "").split("/")[0]}`, c.d.showEyebrow ? c.m.eyebrow : ""].filter(Boolean).join(" · ")}
            </span>
          </div>
          {c.d.showDate && c.m.date ? (
            <span style={{ fontFamily: c.pf.body, fontSize: k(24), color: c.t.muted }}>{c.m.date}</span>
          ) : null}
        </div>
        {c.title ? (
          <div style={{
            fontFamily: c.pf.display, fontWeight: c.pf.displayWeight, fontSize: k(44 * (c.pf.scale || 1)), lineHeight: 1.15, color: c.t.titleInk || c.t.ink, textAlign: headAlign(c.d.align),
          }}
          >
            {c.title}
          </div>
        ) : null}
        <Body c={c} size={c.bodySize * 0.92} />
        {c.showHero ? <PhotoFill c={c} style={{ height: heroH(c, 0.26), borderRadius: 24 }} cap={heroCap(c, 0.44)} /> : null}
        <Tags c={c} inline />
        <div style={{
          display: "flex", gap: 46, color: c.t.muted, borderTop: `1.5px solid ${c.t.rule}`, paddingTop: 22,
        }}
        >
          {["chat_bubble", "repeat", "favorite", "ios_share"].map((icon) => (
            <span key={icon} className="material-symbols-outlined" style={{ fontSize: 34, color: icon === "favorite" ? c.accent : undefined }}>{icon}</span>
          ))}
        </div>
      </div>
    </FitBox>
    <Footer c={c} rule={false} />
  </Column>
);

const MagColumn = ({ c }) => (
  <Column c={c} gap={30}>
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flexShrink: 0,
    }}
    >
      <span style={{
        fontFamily: c.pf.display, fontWeight: c.pf.displayWeight, fontSize: 40, letterSpacing: "0.12em", textTransform: "uppercase", color: c.t.ink,
      }}
      >
        {c.d.showEyebrow ? c.m.eyebrow : ""}
      </span>
      <div style={{ width: "100%", borderTop: `5px solid ${c.t.ink}`, borderBottom: `1.5px solid ${c.t.ink}`, height: 9 }} />
      <div style={{
        width: "100%", display: "flex", justifyContent: "space-between", fontFamily: LABEL_FONT, fontSize: 18, letterSpacing: "0.16em", textTransform: "uppercase", color: c.t.muted,
      }}
      >
        <span>{c.d.showDate ? c.m.date : ""}</span>
        <span>{(c.m.footerUrl || "").split("/")[0]}</span>
      </div>
    </div>
    {c.showHero ? <PhotoFill c={c} style={{ height: heroH(c, 0.22), flexShrink: 0 }} cap={heroCap(c, 0.42)} /> : null}
    <FitBox fixed={c.fixed} valign={c.d.valign} align={flexAlign(c.d.align)} gap={22} fitKey={c.fitKey}>
      <Title c={c} size={c.title.length > 48 ? 60 : 74} />
      <Subtitle c={c} />
      {c.title ? (
        <span style={{
          fontFamily: LABEL_FONT, fontSize: k(20), letterSpacing: "0.22em", textTransform: "uppercase", color: c.accent, fontWeight: 700,
        }}
        >
          {`By ${c.m.author}`}
        </span>
      ) : null}
      <Body c={c} size={c.bodySize * 0.9} dropCap style={{ textAlign: c.d.align === "left" ? "justify" : c.d.align, hyphens: "auto" }} />
    </FitBox>
    <Tags c={c} />
    <Footer c={c} />
  </Column>
);

const Minimal = ({ c }) => (
  <Column c={{ ...c, P: Math.round(c.P * 1.35) }} gap={30}>
    <FitBox fixed={c.fixed} valign={c.d.valign === "top" ? "middle" : c.d.valign} align={flexAlign(c.d.align)} gap={34} fitKey={c.fitKey}>
      <Body c={{ ...c, body: c.body || c.title }} size={c.bodySize * 1.08} display={c.d.bodyFace === "display"} />
      <div style={{
        width: 14, height: 14, borderRadius: "50%", background: c.accent,
      }}
      />
    </FitBox>
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: c.t.muted, fontFamily: LABEL_FONT, fontSize: 20, letterSpacing: "0.2em", textTransform: "uppercase", flexShrink: 0,
    }}
    >
      <span>{[c.m.author, c.d.showDate ? c.m.date : ""].filter(Boolean).join("  ·  ")}</span>
      {c.d.showUrl ? <span style={{ letterSpacing: "0.05em", textTransform: "none", fontFamily: '"JetBrains Mono", monospace', fontSize: 17 }}>{c.m.footerUrl}</span> : null}
    </div>
    <Tags c={c} style={{ justifyContent: "center" }} />
  </Column>
);

const Barcode = ({ c }) => {
  const seed = hashString(c.m.footerUrl || "x");
  const bars = Array.from({ length: 42 }, (_, i) => 2 + ((Math.floor(seed / 2 ** (i % 24)) + i * 7) % 7));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      {bars.map((w, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} style={{ width: w, height: 70, background: c.t.ink, opacity: i % 5 === 0 ? 0.55 : 1 }} />
      ))}
    </div>
  );
};

const Ticket = ({ c }) => {
  const stats = (c.m.stats || []).slice(0, 3);
  const notch = {
    position: "absolute", top: -30, width: 60, height: 60, borderRadius: "50%", background: c.t.base,
  };
  return (
    <Column c={c} gap={30}>
      <Header c={c} />
      <FitBox fixed={c.fixed} valign={c.d.valign} align="stretch" fitKey={c.fitKey}>
        <div style={{
          background: c.t.panel, border: `2px solid ${c.t.rule}`, borderRadius: 30, overflow: "hidden", display: "flex", flexDirection: "column",
        }}
        >
          {c.showHero ? <PhotoFill c={c} style={{ height: heroH(c, 0.24) }} cap={heroCap(c, 0.36)} /> : null}
          <div style={{
            padding: "40px 52px", display: "flex", flexDirection: "column", gap: 18, alignItems: flexAlign(c.d.align),
          }}
          >
            <span style={{
              fontFamily: LABEL_FONT, fontSize: 20, letterSpacing: "0.32em", textTransform: "uppercase", color: c.accent, fontWeight: 700,
            }}
            >
              {`Admit one · ${c.m.eyebrow || ""}`}
            </span>
            <Title c={c} size={c.title.length > 32 ? 62 : 82} />
            <Meta c={{ ...c, m: { ...c.m, metaRows: (c.m.metaRows || []).filter((r) => !(c.m.stats || []).some((s) => s.value === r.label)) } }} />
          </div>
          <div style={{ position: "relative", borderTop: `4px dashed ${c.t.rule}`, margin: "0 0" }}>
            <span style={{ ...notch, left: -32 }} />
            <span style={{ ...notch, right: -32 }} />
          </div>
          {stats.length ? (
            <div style={{
              display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, padding: "36px 52px", gap: 24,
            }}
            >
              {stats.map((s, i) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6, borderLeft: i ? `2px solid ${c.t.rule}` : "none", paddingLeft: i ? 24 : 0 }}>
                  <span style={{
                    fontFamily: LABEL_FONT, fontSize: k(19), letterSpacing: "0.22em", textTransform: "uppercase", color: c.t.muted,
                  }}
                  >
                    {s.label}
                  </span>
                  <span style={{
                    fontFamily: c.pf.display, fontWeight: c.pf.displayWeight, fontSize: k((stats.length > 2 ? 60 : 78) * (c.pf.scale || 1)), lineHeight: 1, color: i === 0 ? c.accent : c.t.ink, fontVariantNumeric: "tabular-nums",
                  }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {c.body ? (
            <div style={{ padding: stats.length ? "0 52px 36px" : "36px 52px" }}>
              <Body c={c} size={c.bodySize * 0.72} />
            </div>
          ) : null}
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 52px 36px", gap: 24,
          }}
          >
            <Barcode c={c} />
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 20, color: c.t.muted, textAlign: "right",
            }}
            >
              {`No. ${String(hashString(c.m.footerUrl || "")).slice(0, 6)}`}
              <br />
              {c.d.showDate ? c.m.date : ""}
            </span>
          </div>
        </div>
      </FitBox>
      <Tags c={c} />
      <Footer c={c} rule={false} />
    </Column>
  );
};

const IndexCard = ({ c }) => {
  const spine = c.tagColor || c.accent;
  const label = {
    fontFamily: LABEL_FONT, fontSize: k(18), letterSpacing: "0.26em", textTransform: "uppercase", color: c.t.muted, fontWeight: 700,
  };
  const rows = metaRows(c);
  const stamp = (c.m.stats || [])[0];
  return (
    <Column c={c} gap={30}>
      <Header c={c} />
      <FitBox fixed={c.fixed} valign={c.d.valign === "top" ? "middle" : c.d.valign} align="stretch" fitKey={c.fitKey}>
        <div style={{
          position: "relative", display: "flex", background: c.t.panel, border: `2px solid ${c.t.rule}`, borderRadius: 18, overflow: "hidden", boxShadow: c.t.dark ? "none" : "0 18px 40px rgba(0,0,0,0.1)",
        }}
        >
          <div style={{ width: 36, background: spine, flexShrink: 0 }} />
          <div style={{
            flex: 1,
            padding: "48px 56px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            backgroundImage: `linear-gradient(${withAlpha(c.accent, 0.55)} 0 3px, transparent 3px), repeating-linear-gradient(to bottom, transparent 0 55px, ${c.t.rule} 55px 57px)`,
            backgroundSize: "100% 100%, 100% 57px",
            backgroundPosition: "0 118px, 0 0",
            backgroundRepeat: "no-repeat, repeat",
          }}
          >
            <span style={label}>{c.d.showEyebrow ? c.m.eyebrow : "Card"}</span>
            <Title c={c} size={c.title.length > 32 ? 58 : 72} style={{ textAlign: "left", marginTop: 20 }} />
            {c.m.subtitle ? (
              <div>
                <span style={label}>Author</span>
                <div style={{
                  fontFamily: c.pf.body, fontSize: k(34), color: c.t.ink, fontStyle: "italic",
                }}
                >
                  {c.m.subtitle}
                </div>
              </div>
            ) : null}
            {rows.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 40px" }}>
                {rows.map((row) => (
                  <span key={row.label} style={{ fontFamily: c.pf.body, fontSize: k(26), color: c.t.ink }}>
                    {row.label}
                  </span>
                ))}
              </div>
            ) : null}
            {c.body ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={label}>Notes</span>
                <Body c={c} size={c.bodySize * 0.82} />
              </div>
            ) : null}
          </div>
          {stamp ? (
            <div style={{
              position: "absolute", right: 46, top: 40, width: 150, height: 150, borderRadius: "50%", border: `5px solid ${withAlpha(c.accent, 0.75)}`, color: withAlpha(c.accent, 0.85), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-14deg)", fontFamily: LABEL_FONT, fontWeight: 800, letterSpacing: "0.14em",
            }}
            >
              <span style={{ fontSize: 20, textTransform: "uppercase" }}>{stamp.label}</span>
              <span style={{ fontSize: 38 }}>{stamp.value}</span>
            </div>
          ) : null}
        </div>
      </FitBox>
      <Tags c={c} />
      <Footer c={c} />
    </Column>
  );
};

const Letter = ({ c }) => {
  const mr = c.m.lang === "mr";
  return (
    <Column c={{ ...c, P: Math.round(c.P * 1.1) }} gap={32}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}
      >
        <BrandMark src={c.t.logo} alt="" style={{ height: 70, width: "auto" }} />
        <span style={{
          fontFamily: c.pf.body, fontStyle: "italic", fontSize: 26, color: c.t.muted, textAlign: "right",
        }}
        >
          {[c.d.showEyebrow ? c.m.eyebrow : "", c.d.showDate ? c.m.date : ""].filter(Boolean).join(" — ")}
        </span>
      </div>
      <div style={{ height: 2, background: c.accent, flexShrink: 0, width: 160 }} />
      <FitBox fixed={c.fixed} valign={c.d.valign} align={flexAlign(c.d.align)} gap={26} fitKey={c.fitKey}>
        {c.title ? (
          <span style={{
            fontFamily: c.pf.display, fontWeight: c.pf.displayWeight, fontSize: k(46 * (c.pf.scale || 1)), color: c.t.titleInk || c.t.ink, lineHeight: 1.15, textAlign: headAlign(c.d.align),
          }}
          >
            {c.title}
          </span>
        ) : null}
        <span style={{
          fontFamily: c.pf.body, fontSize: k(c.bodySize * 0.92), color: c.t.ink, fontStyle: mr ? "normal" : "italic",
        }}
        >
          {mr ? "प्रिय वाचक," : "Dear reader,"}
        </span>
        <Body c={c} size={c.bodySize * 0.9} />
        <div style={{
          display: "flex", flexDirection: "column", gap: 4, alignItems: c.d.align === "center" ? "center" : "flex-start", marginTop: 8,
        }}
        >
          <span style={{ fontFamily: c.pf.body, fontSize: k(c.bodySize * 0.8), color: c.t.muted }}>{mr ? "तुमचा," : "Yours,"}</span>
          {c.d.showSignature ? (
            <BrandMark src={c.t.signature} alt="" style={{ height: 110, width: "auto", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: c.pf.display, fontSize: k(44), color: c.t.ink }}>{c.m.author}</span>
          )}
        </div>
      </FitBox>
      <Tags c={c} />
      <Footer c={c} signature={false} />
    </Column>
  );
};

export const LAYOUT_COMPONENTS = {
  editorial: Editorial,
  pullquote: PullQuote,
  poster: Poster,
  polaroid: Polaroid,
  note: Note,
  column: MagColumn,
  minimal: Minimal,
  ticket: Ticket,
  index: IndexCard,
  letter: Letter,
};
