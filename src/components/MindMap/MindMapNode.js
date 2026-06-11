import React from 'react';

const MindMapNode = ({
  x,
  y,
  label,
  sublabel,
  color,
  radius = 40,
  onClick,
  isExpanded = false,
  isCenter = false,
  isCategory = false,
}) => {
  const truncate = (str, n) => (str && str.length > n ? `${str.slice(0, n - 1)}…` : str);
  const displayLabel = truncate(label, 14);
  const displaySublabel = sublabel ? truncate(sublabel, 16) : null;

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={label}
    >
      {isExpanded && (
        <circle r={radius + 8} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
      )}
      <circle
        r={radius}
        fill={isCenter ? '#1c1917' : color}
        fillOpacity={isCategory ? 0.88 : 0.72}
        stroke={isCenter ? '#ffffff' : color}
        strokeWidth={isExpanded ? 2.5 : 1.5}
        strokeOpacity={isCenter ? 0.3 : 1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        dy={displaySublabel ? '-0.65em' : 0}
        fontSize={isCenter ? 14 : isCategory ? 12 : 10}
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
          fontSize={8}
          fill="white"
          opacity={0.7}
          style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'Inter, sans-serif' }}
        >
          {displaySublabel}
        </text>
      )}
    </g>
  );
};

export default MindMapNode;
