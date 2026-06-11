import React, { useEffect, useMemo, useState } from 'react';
import MindMapNode from './MindMapNode';
import MindMapDetailPanel from './MindMapDetailPanel';
import usePanZoom from './usePanZoom';
import {
  CATEGORY_RADIUS,
  CENTER_RADIUS,
  CHILD_RADIUS,
  OVERVIEW_BOX,
  focusBox,
  layoutCategories,
  layoutChildren,
} from './mindmapLayout';

const LABEL_KEYS = {
  book: 'title', marathon: 'title', trek: 'fort_name', project: 'title', blog: 'blog_title',
};
const SUBLABEL_KEYS = {
  book: 'author', marathon: 'distance', trek: 'date', project: 'date', blog: 'blog_date',
};

const cubicEdge = (x1, y1, x2, y2) => {
  const dx = (x2 - x1) * 0.45;
  const dy = (y2 - y1) * 0.45;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1 + dy}, ${x2 - dx} ${y2 - dy}, ${x2} ${y2}`;
};

// Renders the child bubbles of an expanded category with a staggered
// "burst out of the parent" entrance animation.
const ExpandedChildren = ({ cat, layout, onChildClick }) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <g>
      {layout.positions.map((pos, i) => {
        const key = pos.item.id || pos.item.title || i;
        const delay = Math.min((pos.ring * 90) + (i * 12), 650);
        return (
          <path
            key={`edge-${key}`}
            d={cubicEdge(cat.x, cat.y, pos.x, pos.y)}
            fill="none"
            stroke={cat.color}
            strokeWidth={1.5}
            style={{ opacity: entered ? 0.3 : 0, transition: `opacity 400ms ease ${delay}ms` }}
          />
        );
      })}
      {layout.positions.map((pos, i) => {
        const key = pos.item.id || pos.item.title || i;
        const delay = Math.min((pos.ring * 90) + (i * 12), 650);
        const label = pos.item[LABEL_KEYS[cat.type]] || '';
        const sublabelRaw = pos.item[SUBLABEL_KEYS[cat.type]];
        return (
          <g
            key={`node-${key}`}
            style={{
              transform: entered ? `translate(${pos.x}px, ${pos.y}px)` : `translate(${cat.x}px, ${cat.y}px)`,
              opacity: entered ? 1 : 0,
              transition: `transform 550ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 350ms ease ${delay}ms`,
            }}
          >
            <MindMapNode
              label={label}
              sublabel={sublabelRaw ? String(sublabelRaw) : undefined}
              tooltip={label}
              color={cat.color}
              radius={CHILD_RADIUS}
              onClick={() => onChildClick(cat.type, pos.item)}
            />
          </g>
        );
      })}
    </g>
  );
};

const controlButtonClass = 'w-9 h-9 flex items-center justify-center rounded-lg bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition-colors';

const MindMapCanvas = ({ categories }) => {
  const [expandedCat, setExpandedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const {
    svgRef, viewBox, animateTo, zoomCenter, didDrag, handlers,
  } = usePanZoom({ initialViewBox: OVERVIEW_BOX, minWidth: 220, maxWidth: 3600 });

  const catNodes = useMemo(() => layoutCategories(categories), [categories]);
  const childLayouts = useMemo(() => {
    const map = {};
    catNodes.forEach((cat) => { map[cat.id] = layoutChildren(cat); });
    return map;
  }, [catNodes]);

  const collapse = () => {
    setExpandedCat(null);
    animateTo(OVERVIEW_BOX);
  };

  const toggleCategory = (cat) => {
    if (expandedCat === cat.id) {
      collapse();
      return;
    }
    setExpandedCat(cat.id);
    animateTo(focusBox(cat, childLayouts[cat.id].maxRadius));
  };

  const handleChildClick = (type, item) => {
    if (didDrag.current) return;
    setSelectedItem({ type, data: item });
  };

  const activeCat = catNodes.find((cat) => cat.id === expandedCat) || null;

  return (
    <>
      <div className="relative w-full h-[70vh] min-h-[480px] rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          width="100%"
          height="100%"
          style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
          aria-label="Personal site mind map"
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerLeave={handlers.onPointerLeave}
          onPointerCancel={handlers.onPointerCancel}
        >
          <defs>
            <filter id="mm-node-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.25" />
            </filter>
            <pattern id="mm-dots" width="46" height="46" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="#a8a29e" opacity="0.3" />
            </pattern>
          </defs>

          {/* Dotted backdrop; clicking empty space collapses the open category */}
          <rect
            x="-4000"
            y="-4000"
            width="8000"
            height="8000"
            fill="url(#mm-dots)"
            onClick={() => { if (!didDrag.current && expandedCat) collapse(); }}
          />

          {/* Centre → category edges */}
          {catNodes.map((cat) => (
            <line
              key={`edge-${cat.id}`}
              x1={0}
              y1={0}
              x2={cat.x}
              y2={cat.y}
              stroke={cat.color}
              strokeWidth={2}
              style={{
                opacity: !expandedCat || expandedCat === cat.id ? 0.4 : 0.1,
                transition: 'opacity 300ms ease',
              }}
            />
          ))}

          {/* Expanded category children (keyed so each expansion replays the animation) */}
          {activeCat && (
            <ExpandedChildren
              key={activeCat.id}
              cat={activeCat}
              layout={childLayouts[activeCat.id]}
              onChildClick={handleChildClick}
            />
          )}

          {/* Pulsing ring behind the centre node */}
          <circle cx={0} cy={0} r={CENTER_RADIUS} fill="none" stroke="#78716c" strokeWidth={2}>
            <animate attributeName="r" values={`${CENTER_RADIUS};${CENTER_RADIUS + 42}`} dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.45;0" dur="2.4s" repeatCount="indefinite" />
          </circle>

          <MindMapNode
            label="Sanket"
            sublabel="Explore me"
            tooltip="Reset the view"
            color="#78716c"
            radius={CENTER_RADIUS}
            onClick={() => { if (!didDrag.current) collapse(); }}
            isCenter
          />

          {catNodes.map((cat) => (
            <g
              key={cat.id}
              style={{
                opacity: !expandedCat || expandedCat === cat.id ? 1 : 0.35,
                transition: 'opacity 300ms ease',
              }}
            >
              <MindMapNode
                x={cat.x}
                y={cat.y}
                label={cat.label}
                sublabel={`${cat.items.length} items`}
                tooltip={`${cat.label} — ${cat.items.length} items`}
                color={cat.color}
                radius={CATEGORY_RADIUS}
                onClick={() => { if (!didDrag.current) toggleCategory(cat); }}
                isExpanded={expandedCat === cat.id}
                isCategory
              />
            </g>
          ))}
        </svg>

        {/* Category legend / quick-jump chips */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[75%]">
          {catNodes.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-label font-bold transition-all border backdrop-blur-sm text-stone-700 dark:text-stone-300 ${expandedCat === cat.id ? 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 shadow' : 'bg-white/70 dark:bg-stone-900/70 border-transparent hover:border-stone-300 dark:hover:border-stone-600'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active category badge */}
        {activeCat && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border border-stone-200 dark:border-stone-700 text-xs font-label font-bold text-stone-700 dark:text-stone-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCat.color }} />
            {activeCat.label} · {activeCat.items.length} items
            <button
              type="button"
              onClick={collapse}
              className="ml-1 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              aria-label="Collapse category"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button type="button" onClick={() => zoomCenter(0.8)} className={controlButtonClass} aria-label="Zoom in">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button type="button" onClick={() => zoomCenter(1.25)} className={controlButtonClass} aria-label="Zoom out">
            <span className="material-symbols-outlined text-lg">remove</span>
          </button>
          <button type="button" onClick={collapse} className={controlButtonClass} aria-label="Reset view">
            <span className="material-symbols-outlined text-lg">fit_screen</span>
          </button>
        </div>
      </div>

      {selectedItem && (
        <MindMapDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
};

export default MindMapCanvas;
