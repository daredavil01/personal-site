import React from 'react';
import PropTypes from 'prop-types';

const TagBubbles = ({ bubbles, onBubblePop }) => (
  <>
    {bubbles.map((bubble) => {
      const animationDuration = (() => {
        if (bubble.animationType === 'fast') return '6s';
        if (bubble.animationType === 'slow') return '12s';
        return '10s';
      })();

      const animationName = `bubble${bubble.animationType.charAt(0).toUpperCase() + bubble.animationType.slice(1)}`;

      return (
        <div
          key={bubble.id}
          onClick={() => onBubblePop(bubble.id)}
          className={`tag-bubble ${bubble.popped ? 'popped' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBubblePop(bubble.id);
            }
          }}
          style={{
            position: 'fixed',
            left: `${bubble.x}px`,
            top: '0',
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            background: bubble.color,
            borderRadius: '50%',
            border: `3px solid ${bubble.color.replace('0.4', '0.8')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1500,
            animation: `${animationName} ${animationDuration} ease-in-out forwards`,
            animationDelay: `${bubble.id * 0.1}s`,
            transform: `translateY(${bubble.y}px)`,
            boxShadow: `0 8px 24px ${bubble.color}, inset 0 2px 12px rgba(255,255,255,0.3)`,
            backdropFilter: 'blur(4px)',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontSize: `${bubble.size / 5}px`,
              fontWeight: '700',
              color: bubble.color.replace('0.4', '1'),
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
            }}
          >
            {bubble.tag}
          </span>
        </div>
      );
    })}
  </>
);

TagBubbles.propTypes = {
  bubbles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      tag: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      size: PropTypes.number.isRequired,
      speed: PropTypes.number.isRequired,
      animationType: PropTypes.oneOf(['fast', 'slow', 'bouncy']).isRequired,
      popped: PropTypes.bool.isRequired,
    }),
  ).isRequired,
  onBubblePop: PropTypes.func.isRequired,
};

export default TagBubbles;
