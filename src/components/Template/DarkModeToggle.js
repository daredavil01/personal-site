import React, { useState, useEffect } from 'react';

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    // Apply dark mode class to body
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const styles = {
    toggle: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      background: 'transparent',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    icon: {
      fontSize: '20px',
      transition: 'transform 0.3s ease',
      transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)',
    },
  };

  return (
    <button
      type="button"
      className="dark-mode-toggle"
      style={styles.toggle}
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span style={styles.icon}>
        {isDarkMode ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
