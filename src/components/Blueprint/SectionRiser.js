import React, { useState } from "react";
import PropTypes from "prop-types";
import { FEATURES, LAYERS, featureById } from "./features";
import { RoomChips } from "./RoomSpec";

// Sheet A-02: a section cut through the building. The floors are the layers
// of the stack, from the two shells under the roof down to the scripts in the
// plant room. Selecting a room runs a red riser through every floor that
// feature touches and calls out the file it touches there; clicking a floor
// turns the question round and lists every room standing on it.

const W = 1000;
const ROOF_TOP = 34;
const EAVES = 110;
const FLOOR_H = 76;
const LEFT = 120;
const RIGHT = 620;
const RISER_X = 520;
const CALLOUT_X = 660;

// Floor rectangles. The shells live in the roof, so the first layer is drawn
// as the gable and the rest as storeys below it.
const FLOORS = LAYERS.map((layer, i) => {
  if (i === 0) return { ...layer, top: ROOF_TOP, bottom: EAVES, mid: 84 };
  const top = EAVES + (i - 1) * FLOOR_H;
  return { ...layer, top, bottom: top + FLOOR_H, mid: top + FLOOR_H / 2 };
});
const GRADE = FLOORS.find((f) => f.id === "db").top;
const BASE = FLOORS[FLOORS.length - 1].bottom;
const H = BASE + 50;

const activate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// Two lines at most, broken on words, so a callout never runs off the sheet.
const wrap = (text, max = 40) => {
  const lines = [""];
  String(text).split(" ").forEach((word) => {
    const current = lines[lines.length - 1];
    if (current && `${current} ${word}`.length > max) lines.push(word);
    else lines[lines.length - 1] = current ? `${current} ${word}` : word;
  });
  if (lines.length > 2) return [lines[0], `${lines.slice(1).join(" ").slice(0, max - 1)}…`];
  return lines;
};

const Riser = ({ feature }) => {
  const touched = FLOORS.filter((f) => feature.layers[f.id]);
  if (!touched.length) return null;
  const y1 = touched[0].mid;
  const y2 = touched[touched.length - 1].mid;
  const span = FLOORS.filter((f) => f.mid >= y1 && f.mid <= y2);
  return (
    <g pointerEvents="none">
      <text x={RISER_X} y={18} textAnchor="middle" className="bp-svg-label bp-fill-red" fontSize="11">
        {`Riser ${feature.no} · ${feature.name}`}
      </text>
      <rect x={RISER_X - 7} y={y1 - 12} width="14" height={y2 - y1 + 24} rx="7" className="bp-fill-red-soft bp-stroke-red" strokeWidth="2" />
      <line key={feature.id} x1={RISER_X} y1={y1} x2={RISER_X} y2={y2} className="bp-stroke-red bp-flow" strokeWidth="2.5" />
      {span.map((floor) => {
        const text = feature.layers[floor.id];
        if (!text) {
          return (
            <text key={floor.id} x={CALLOUT_X} y={floor.mid + 4} className="bp-svg-mono bp-fill-soft" fontSize="11">
              passes through
            </text>
          );
        }
        const lines = wrap(text);
        return (
          <g key={floor.id} className="bp-fade-in">
            <circle cx={RISER_X} cy={floor.mid} r="12" fill="none" className="bp-stroke-red" strokeWidth="1.5" />
            <circle cx={RISER_X} cy={floor.mid} r="6" className="bp-fill-red" />
            <line x1={RISER_X + 12} y1={floor.mid} x2={CALLOUT_X - 10} y2={floor.mid} className="bp-stroke-red" strokeWidth="1.2" />
            <text x={CALLOUT_X} y={floor.mid - 12} className="bp-svg-label bp-fill-red" fontSize="10">
              {floor.label}
            </text>
            {lines.map((line, i) => (
              <text key={i} x={CALLOUT_X} y={floor.mid + 5 + i * 15} className="bp-svg-mono bp-fill-ink" fontSize="12">
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
};

// Floor mode: every room that touches the chosen floor, as a clickable list.
const Occupants = ({ floor, onSelect }) => {
  const rooms = FEATURES.filter((f) => f.layers[floor.id]);
  return (
    <g className="bp-fade-in">
      <text x={CALLOUT_X} y={18} className="bp-svg-label bp-fill-red" fontSize="11">
        {`${floor.label}: ${rooms.length} rooms stand here`}
      </text>
      {rooms.map((f, i) => {
        const y = 44 + i * 40;
        return (
          <g
            key={f.id}
            className="bp-hit"
            role="button"
            tabIndex={0}
            aria-label={`${f.name}: ${f.layers[floor.id]}`}
            onClick={() => onSelect(f.id)}
            onKeyDown={activate(() => onSelect(f.id))}
          >
            <rect className="bp-hit-shape" x={CALLOUT_X - 8} y={y - 14} width={W - CALLOUT_X} height="36" />
            <text x={CALLOUT_X} y={y} className="bp-svg-label bp-fill-ink" fontSize="10">
              {`${f.no} ${f.name}`}
            </text>
            <text x={CALLOUT_X} y={y + 15} className="bp-svg-mono bp-fill-soft" fontSize="11">
              {wrap(f.layers[floor.id], 46)[0]}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const SectionRiser = ({ selectedId, onSelect }) => {
  const [floorId, setFloorId] = useState(null);
  const feature = featureById(selectedId);
  const floor = FLOORS.find((f) => f.id === floorId) || null;

  const pickRoom = (id) => {
    setFloorId(null);
    onSelect(id);
  };
  const pickFloor = (id) => setFloorId((current) => (current === id ? null : id));

  return (
    <div className="flex flex-col gap-4">
      <RoomChips selectedId={floor ? null : selectedId} onSelect={pickRoom} />
      <div className="bp-scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[720px] h-auto block"
          role="group"
          aria-label="Section through the stack. Select a room to trace it through the floors, or a floor to list the rooms on it."
        >
          <defs>
            <pattern id="bp-section-earth" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" className="bp-stroke-soft" strokeWidth="1" />
            </pattern>
            <pattern id="bp-section-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="10" className="bp-stroke-red" strokeWidth="2" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Ground: hatched earth from grade (the B1 mark) down, outside the walls. */}
          <rect x={0} y={GRADE} width={LEFT - 6} height={H - GRADE} fill="url(#bp-section-earth)" opacity="0.5" />
          <line x1={0} y1={GRADE} x2={RIGHT + 24} y2={GRADE} className="bp-stroke" strokeWidth="3" />

          {/* The chosen floor, redlined. */}
          {floor && (
            floor.id === "shell"
              ? <polygon points={`${LEFT - 10},${EAVES} ${(LEFT + RIGHT) / 2},${ROOF_TOP} ${RIGHT + 10},${EAVES}`} fill="url(#bp-section-hatch)" />
              : <rect x={LEFT} y={floor.top} width={RIGHT - LEFT} height={FLOOR_H} fill="url(#bp-section-hatch)" />
          )}

          {/* Roof: the two shells either side of the ridge. */}
          <polygon
            points={`${LEFT - 10},${EAVES} ${(LEFT + RIGHT) / 2},${ROOF_TOP} ${RIGHT + 10},${EAVES}`}
            className="bp-fill-faint bp-stroke"
            strokeWidth="2.5"
          />
          <line x1={(LEFT + RIGHT) / 2} y1={ROOF_TOP} x2={(LEFT + RIGHT) / 2} y2={EAVES} className="bp-stroke-soft" strokeWidth="1" strokeDasharray="4 4" />
          <text x={(LEFT * 3 + RIGHT) / 4 + 20} y={EAVES - 14} textAnchor="middle" className="bp-svg-label bp-fill-ink" fontSize="11">Atlas</text>
          <text x={(LEFT + RIGHT * 3) / 4 - 50} y={EAVES - 14} textAnchor="middle" className="bp-svg-label bp-fill-ink" fontSize="11">Classic</text>

          {/* Storeys, slabs and the two edge columns. */}
          {FLOORS.slice(1).map((f) => (
            <g key={f.id}>
              <rect x={LEFT} y={f.top} width={RIGHT - LEFT} height={FLOOR_H} fill="none" className="bp-stroke" strokeWidth="1.5" />
              <rect x={LEFT - 6} y={f.bottom - 5} width={RIGHT - LEFT + 12} height="5" className={f.top >= GRADE ? "bp-fill-ink" : "bp-fill-soft"} />
              <text x={LEFT + 30} y={f.top + 32} className="bp-svg-label bp-fill-ink" fontSize="13">{f.label}</text>
              <text x={LEFT + 30} y={f.top + 50} className="bp-svg-mono bp-fill-soft" fontSize="11">{f.note}</text>
            </g>
          ))}
          {[LEFT + 10, RIGHT - 18].map((x) => (
            <rect key={x} x={x} y={EAVES} width="8" height={BASE - EAVES} className="bp-fill-faint bp-stroke-soft" strokeWidth="1" />
          ))}
          {/* Footings. */}
          {[LEFT + 14, RIGHT - 14].map((x) => (
            <polygon key={x} points={`${x - 26},${BASE + 22} ${x + 26},${BASE + 22} ${x + 12},${BASE} ${x - 12},${BASE}`} className="bp-fill-faint bp-stroke" strokeWidth="1.5" />
          ))}

          {/* Level markers: each at the top of its floor, the roof's at the ridge. */}
          {FLOORS.map((f) => {
            const y = f.id === "shell" ? ROOF_TOP : f.top;
            return (
              <g key={`lvl-${f.id}`}>
                <line x1={8} y1={y} x2={f.id === "shell" ? (LEFT + RIGHT) / 2 - 12 : LEFT - 14} y2={y} className="bp-stroke-faint" strokeWidth="1" />
                <polygon points={`12,${y - 9} 24,${y - 9} 18,${y}`} className="bp-fill-ink" />
                <text x={30} y={y - 3} className="bp-svg-mono bp-fill-soft" fontSize="10">{f.level}</text>
              </g>
            );
          })}

          {/* Floor hit areas. */}
          {FLOORS.map((f) => (
            <g
              key={`hit-${f.id}`}
              className="bp-hit"
              role="button"
              tabIndex={0}
              aria-pressed={floorId === f.id}
              aria-label={`Floor ${f.level}, ${f.label}: list the rooms that stand on it`}
              onClick={() => pickFloor(f.id)}
              onKeyDown={activate(() => pickFloor(f.id))}
            >
              {f.id === "shell"
                ? <polygon className="bp-hit-shape" points={`${LEFT + 20},${EAVES - 4} ${(LEFT + RIGHT) / 2},${ROOF_TOP + 8} ${RIGHT - 20},${EAVES - 4}`} />
                : <rect className="bp-hit-shape" x={LEFT + 4} y={f.top + 4} width={RIGHT - LEFT - 8} height={FLOOR_H - 8} />}
            </g>
          ))}

          {floor && <Occupants floor={floor} onSelect={pickRoom} />}
          {!floor && feature && <Riser feature={feature} />}
        </svg>
      </div>
    </div>
  );
};

SectionRiser.propTypes = {
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

SectionRiser.defaultProps = {
  selectedId: null,
};

export default SectionRiser;
