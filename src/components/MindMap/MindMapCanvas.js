import React, { useState } from 'react';
import MindMapNode from './MindMapNode';
import MindMapDetailPanel from './MindMapDetailPanel';

const CENTER = { x: 800, y: 600 };
const R1 = 280;
const R2 = 170;
const CHILD_ARC = Math.PI * 0.85;
const MAX_CHILDREN = 10;

const catAngle = (i, total) => (2 * Math.PI * i) / total - Math.PI / 2;

const childPositions = (catX, catY, parentAngle, items) => {
  const count = items.length;
  return items.map((item, i) => {
    const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * CHILD_ARC;
    const a = parentAngle + offset;
    return {
      item,
      x: catX + R2 * Math.cos(a),
      y: catY + R2 * Math.sin(a),
    };
  });
};

const cubicEdge = (x1, y1, x2, y2) => {
  const dx = (x2 - x1) * 0.45;
  const dy = (y2 - y1) * 0.45;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1 + dy}, ${x2 - dx} ${y2 - dy}, ${x2} ${y2}`;
};

const MindMapCanvas = ({ categories }) => {
  const [expandedCat, setExpandedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const total = categories.length;
  const catNodes = categories.map((cat, i) => {
    const a = catAngle(i, total);
    return {
      ...cat,
      x: CENTER.x + R1 * Math.cos(a),
      y: CENTER.y + R1 * Math.sin(a),
      angle: a,
    };
  });

  const handleCatClick = (catId) => {
    setExpandedCat((prev) => (prev === catId ? null : catId));
  };

  const handleCenterClick = () => {
    setExpandedCat(null);
  };

  const handleChildClick = (type, item) => {
    setSelectedItem({ type, data: item });
  };

  return (
    <>
      <div
        className="w-full overflow-auto rounded-2xl"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox="0 0 1600 1200"
          width="1600"
          height="1200"
          style={{ display: 'block', minWidth: '1600px' }}
          aria-label="Personal site mind map"
        >
          {/* Edges: center → categories */}
          <g>
            {catNodes.map((cat) => (
              <line
                key={`edge-center-${cat.id}`}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={cat.x}
                y2={cat.y}
                stroke={cat.color}
                strokeWidth={2}
                opacity={0.35}
              />
            ))}
          </g>

          {/* Edges: category → children (only for expanded) */}
          {catNodes.map((cat) => {
            if (cat.id !== expandedCat) return null;
            const visibleItems = cat.items.slice(0, MAX_CHILDREN);
            const hasMore = cat.items.length > MAX_CHILDREN;
            const childList = hasMore ? [...visibleItems, '__overflow__'] : visibleItems;
            const positions = childPositions(cat.x, cat.y, cat.angle, childList);
            return positions.map((pos, i) => (
              <path
                key={`edge-child-${cat.id}-${i}`}
                d={cubicEdge(cat.x, cat.y, pos.x, pos.y)}
                fill="none"
                stroke={cat.color}
                strokeWidth={1.5}
                opacity={0.3}
              />
            ));
          })}

          {/* Center node */}
          <MindMapNode
            x={CENTER.x}
            y={CENTER.y}
            label="Sanket"
            sublabel="Explore me"
            color="#78716c"
            radius={56}
            onClick={handleCenterClick}
            isCenter
          />

          {/* Category nodes */}
          {catNodes.map((cat) => (
            <MindMapNode
              key={cat.id}
              x={cat.x}
              y={cat.y}
              label={cat.label}
              sublabel={`${cat.items.length} items`}
              color={cat.color}
              radius={44}
              onClick={() => handleCatClick(cat.id)}
              isExpanded={expandedCat === cat.id}
              isCategory
            />
          ))}

          {/* Child nodes per expanded category */}
          {catNodes.map((cat) => {
            const isExpanded = cat.id === expandedCat;
            const visibleItems = cat.items.slice(0, MAX_CHILDREN);
            const hasMore = cat.items.length > MAX_CHILDREN;
            const overflowCount = cat.items.length - MAX_CHILDREN;
            const childList = hasMore ? [...visibleItems, '__overflow__'] : visibleItems;
            const positions = childPositions(cat.x, cat.y, cat.angle, childList);

            return (
              <g
                key={`children-${cat.id}`}
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                  pointerEvents: isExpanded ? 'auto' : 'none',
                }}
              >
                {positions.map((pos, i) => {
                  const isOverflow = pos.item === '__overflow__';
                  if (isOverflow) {
                    return (
                      <MindMapNode
                        key={`overflow-${cat.id}`}
                        x={pos.x}
                        y={pos.y}
                        label={`+${overflowCount}`}
                        sublabel="more"
                        color={cat.color}
                        radius={28}
                        onClick={() => { window.location.href = cat.path; }}
                      />
                    );
                  }

                  const { item } = pos;
                  const labelKey = cat.type === 'trek' ? 'fort_name' : cat.type === 'blog' ? 'blog_title' : 'title';
                  const sublabelKey = cat.type === 'book' ? 'author' : cat.type === 'marathon' ? 'distance' : cat.type === 'trek' ? 'date' : cat.type === 'project' ? 'date' : 'blog_date';

                  return (
                    <MindMapNode
                      key={`child-${cat.id}-${i}`}
                      x={pos.x}
                      y={pos.y}
                      label={item[labelKey] || ''}
                      sublabel={item[sublabelKey] ? String(item[sublabelKey]).slice(0, 10) : undefined}
                      color={cat.color}
                      radius={34}
                      onClick={() => handleChildClick(cat.type, item)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
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
