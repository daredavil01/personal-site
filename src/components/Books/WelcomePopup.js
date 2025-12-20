import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const WelcomePopup = ({ onClose }) => {
  const [confetti, setConfetti] = useState([]);

  // Confetti effect with book emojis
  useEffect(() => {
    const bookEmojis = ['📚', '📖', '📕', '📗', '📘', '📙', '📔', '📓'];
    const newConfetti = [];

    for (let i = 0; i < 50; i += 1) {
      newConfetti.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10 - Math.random() * 100,
        emoji: bookEmojis[Math.floor(Math.random() * bookEmojis.length)],
        size: Math.random() * 16 + 20, // 20-36px
        speed: Math.random() * 2 + 1,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 6 - 3,
        sway: Math.random() * 40 - 20, // -20 to 20 for horizontal sway
        swaySpeed: Math.random() * 0.05 + 0.02,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }

    setConfetti(newConfetti);

    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      setConfetti((prev) => prev
        .map((particle) => ({
          ...particle,
          y: particle.y + particle.speed,
          x: particle.x + Math.sin(frame * particle.swaySpeed + particle.swayOffset) * 0.5,
          rotation: particle.rotation + particle.rotationSpeed,
        }))
        .filter((particle) => particle.y < window.innerHeight + 50));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const welcomeStyles = {
    confettiContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10001,
      overflow: 'hidden',
    },
    confettiPiece: {
      position: 'absolute',
      userSelect: 'none',
      pointerEvents: 'none',
      zIndex: 10001,
    },
    welcomeOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.4s ease-out',
    },
    welcomePopup: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '3rem 2.5rem',
      borderRadius: '24px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '1rem',
      boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      animation: 'slideIn 0.6s ease-out',
    },
    welcomeTitle: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '1rem',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    welcomeText: {
      fontSize: '1.05rem',
      marginBottom: '1.75rem',
      lineHeight: '1.6',
      opacity: '0.95',
    },
    welcomeButton: {
      background: 'white',
      color: '#667eea',
      border: 'none',
      padding: '14px 32px',
      borderRadius: '30px',
      fontSize: '1.05rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  };

  return (
    <>
      {/* Confetti with book emojis */}
      <div style={welcomeStyles.confettiContainer}>
        {confetti.map((particle) => (
          <div
            key={particle.id}
            style={{
              ...welcomeStyles.confettiPiece,
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              fontSize: `${particle.size}px`,
              transform: `rotate(${particle.rotation}deg)`,
            }}
          >
            {particle.emoji}
          </div>
        ))}
      </div>

      {/* Welcome Popup */}
      <div style={welcomeStyles.welcomeOverlay}>
        <div style={welcomeStyles.welcomePopup}>
          <h2 style={welcomeStyles.welcomeTitle}>
            📚 Welcome to Sanket&apos;s Reading Library!
          </h2>
          <p style={welcomeStyles.welcomeText}>
            Explore my reading journey with interactive filters, statistics,
            blog posts, and personalized recommendations. Ready to discover some great reads?
          </p>
          <button
            type="button"
            style={welcomeStyles.welcomeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
          >
            Let&apos;s Explore! 📖
          </button>
        </div>
      </div>
    </>
  );
};

WelcomePopup.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default WelcomePopup;
