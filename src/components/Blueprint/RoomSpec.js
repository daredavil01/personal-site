import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { COLLECTIONS, FEATURES, fmt, resolve } from "./features";

// The specification beside the plan: what the selected room is, how it works,
// and the way in. On narrow screens the room chips stand in for the plan,
// which is drawn too small there to tap accurately.

export const RoomChips = ({ selectedId, onSelect }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rooms">
    {FEATURES.map((f) => (
      <button
        key={f.id}
        type="button"
        aria-pressed={f.id === selectedId}
        onClick={() => onSelect(f.id)}
        className="bp-chip bp-chip-red bp-mono text-[10px] uppercase tracking-wider px-2 py-1"
      >
        {`${f.no} ${f.name}`}
      </button>
    ))}
  </div>
);

const RoomSpec = ({ feature, ctx, selectedId, onSelect }) => {
  if (!feature) return null;
  const area = resolve(feature.area, ctx);
  const specs = feature.specs.map((line) => resolve(line, ctx)).filter(Boolean);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] items-start">
      <RoomChips selectedId={selectedId} onSelect={onSelect} />

      <article key={feature.id} className="bp-panel bp-fade-in p-4 md:p-5 flex flex-col gap-3" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3 border-b bp-rule pb-2">
          <p className="bp-mono text-[10px] uppercase tracking-[0.25em] bp-red m-0">
            {`Room ${feature.no}`}
          </p>
          {area && (
            <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-soft m-0">{area}</p>
          )}
        </div>
        <h3 className="font-headline text-xl font-black bp-ink m-0">{feature.name}</h3>
        <p className="font-body text-sm bp-soft m-0">{feature.blurb}</p>

        <div>
          <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink mb-1.5">Specification</p>
          <ol className="list-none p-0 m-0 flex flex-col gap-1.5">
            {specs.map((line, i) => (
              <li key={i} className="flex gap-2 font-body text-[13px] leading-snug bp-ink">
                <span className="bp-mono text-[10px] bp-red pt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>

        {feature.id === "archives" && (
          <div>
            <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink mb-1.5">Collections</p>
            <ul className="list-none p-0 m-0 grid grid-cols-2 gap-x-3 gap-y-1">
              {COLLECTIONS.map((col) => (
                <li key={col.id} className="flex justify-between gap-2 text-[13px]">
                  <Link to={col.path} className="font-body bp-ink hover:underline">{col.label}</Link>
                  {fmt(col.count(ctx)) && <span className="bp-mono bp-soft">{fmt(col.count(ctx))}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {feature.path && (
            <Link
              to={feature.path}
              className="bp-chip bp-mono text-[11px] uppercase tracking-wider px-3 py-1.5 no-underline"
            >
              {`${feature.pathLabel} →`}
            </Link>
          )}
          {feature.sheet && (
            <a href={`#${feature.sheet}`} className="bp-chip bp-mono text-[11px] uppercase tracking-wider px-3 py-1.5 no-underline">
              {`${feature.pathLabel} ↓`}
            </a>
          )}
          {!feature.path && !feature.sheet && (
            <span className="bp-mono text-[11px] uppercase tracking-wider px-3 py-1.5 bp-red border border-current">
              Staff only
            </span>
          )}
          <a href="#a-02" className="bp-chip bp-mono text-[11px] uppercase tracking-wider px-3 py-1.5 no-underline">
            Trace it through the stack ↓
          </a>
        </div>
      </article>
    </div>
  );
};

RoomSpec.propTypes = {
  feature: PropTypes.shape({}),
  ctx: PropTypes.shape({}),
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

RoomSpec.defaultProps = {
  feature: null,
  ctx: null,
  selectedId: null,
};

export default RoomSpec;
