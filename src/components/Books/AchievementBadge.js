import React from 'react';
import PropTypes from 'prop-types';

const AchievementBadge = ({ type }) => {
  const configs = {
    speed: {
      emoji: '🏆',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
      borderColor: '#ff8c00',
      title: 'ACHIEVEMENT UNLOCKED!',
      subtitle: '⚡ Speed Reader Mode Activated! ⚡',
      description: 'Books are now in turbo mode for 10 seconds!',
      textColor: {
        title: '#000',
        subtitle: '#333',
        description: '#444',
      },
    },
    tagRain: {
      emoji: '🏷️',
      gradient: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
      borderColor: '#2575fc',
      title: 'TAG RAIN UNLOCKED!',
      subtitle: '🌧️ Tags Are Falling! 🌧️',
      description: 'Watch the tags rain down for 10 seconds!',
      textColor: {
        title: '#fff',
        subtitle: '#e0e0ff',
        description: '#f0f0ff',
      },
    },
  };

  const config = configs[type];

  const styles = {
    overlay: {
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      background: config.gradient,
      color: config.textColor.title,
      padding: '32px 42px',
      borderRadius: '24px',
      boxShadow: `0 20px 60px ${config.borderColor.replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1, $2, $3')}, 0.8), 0 0 0 6px ${config.borderColor.replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1, $2, $3')}, 0.5)`,
      zIndex: 2000,
      animation: 'slideInRight 0.6s ease-out, pulseRight 1.5s ease-in-out infinite',
      textAlign: 'center',
      minWidth: '360px',
      maxWidth: '90vw',
      border: `5px solid ${config.borderColor}`,
    },
    emoji: {
      fontSize: '4rem',
      marginBottom: '12px',
      lineHeight: 1,
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '800',
      marginBottom: '8px',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      letterSpacing: '0.5px',
    },
    subtitle: {
      fontSize: '1.15rem',
      fontWeight: '700',
      marginBottom: '6px',
      color: config.textColor.subtitle,
    },
    description: {
      fontSize: '0.95rem',
      marginTop: '10px',
      fontWeight: '600',
      color: config.textColor.description,
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.emoji}>{config.emoji}</div>
      <div style={styles.title}>{config.title}</div>
      <div style={styles.subtitle}>{config.subtitle}</div>
      <div style={styles.description}>{config.description}</div>
    </div>
  );
};

AchievementBadge.propTypes = {
  type: PropTypes.oneOf(['speed', 'tagRain']).isRequired,
};

export default AchievementBadge;
