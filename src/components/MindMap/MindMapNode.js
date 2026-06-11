import React, { useState } from 'react';

const MindMapNode = ({
  x = 0,
  y = 0,
  label,
  sublabel,
  tooltip,
  color,
  radius = 40,
  onClick,
  isExpanded = false,
  isCenter = false,
  isCategory = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const truncate = (str, n) => (str && str.length > n ? `${str.slice(0, n - 1)}…` : str);
  const displayLabel = truncate(label, 14);
  const displaySublabel = sublabel ? truncate(sublabel, 16) : null;

  let fontSize = 10;
  if (isCenter) fontSize = 16;
  else if (isCategory) fontSize = 13;

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={label}
    >
      <title>{tooltip || label}</title>
      <g
        style={{
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 180ms ease',
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }}
      >
        {isExpanded && (
          <circle r={radius + 10} fill="none" stroke={color} strokeWidth={2.5} opacity={0.35} />
        )}
        <circle
          r={radius}
          fill={isCenter ? '#1c1917' : color}
          fillOpacity={isCategory || isCenter ? 0.92 : 0.8}
          stroke={isCenter ? '#ffffff' : color}
          strokeWidth={isExpanded || hovered ? 3 : 1.5}
          strokeOpacity={isCenter ? 0.35 : 1}
          filter="url(#mm-node-shadow)"
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          dy={displaySublabel ? '-0.65em' : 0}
          fontSize={fontSize}
          fontWeight={isCenter || isCategory ? '700' : '600'}
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'Inter, sans-serif' }}
        >
          {displayLabel}
        </text>
        {displaySublabel && (
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            dy="0.85em"
            fontSize={fontSize - 2}
            fill="white"
            opacity={0.75}
            style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'Inter, sans-serif' }}
          >
            {displaySublabel}
          </text>
        )}
      </g>
    </g>
  );
};

export default MindMapNode;
