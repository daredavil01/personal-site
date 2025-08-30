import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import Main from "../layouts/Main";

import Education from "../components/Resume/Education";
import Experience from "../components/Resume/Experience";
import Skills from "../components/Resume/Skills";
import Certification from "../components/Resume/Ceritification";
import ResumeV2 from "../components/Resume/ResumeV2";

import degrees from "../data/resume/degrees";
import positions from "../data/resume/positions";
import certifications from "../data/resume/certifications";
import { skills, categories } from "../data/resume/skills";

const sections = ["Education", "Experience", "Certification", "Skills"];

const Resume = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewVersion, setViewVersion] = useState("v2"); // Changed default to v2
  const [showWelcome, setShowWelcome] = useState(true);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Confetti effect for interactive view
  useEffect(() => {
    if (showWelcome && viewVersion === "v2") {
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
      const newConfetti = [];

      for (let i = 0; i < 150; i += 1) {
        newConfetti.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -10,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          speed: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 10 - 5,
        });
      }

      setConfetti(newConfetti);

      const interval = setInterval(() => {
        setConfetti((prev) => prev
          .map((particle) => ({
            ...particle,
            y: particle.y + particle.speed,
            rotation: particle.rotation + particle.rotationSpeed,
          }))
          .filter((particle) => particle.y < window.innerHeight + 50));
      }, 50);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [showWelcome, viewVersion]);

  const styles = {
    container: {
      padding: isMobile ? "0.5rem" : "1.5rem",
    },
    toggleContainer: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "2rem",
      gap: "12px",
    },
    toggleButton: {
      padding: "12px 24px",
      borderRadius: "25px",
      border: "2px solid #2e59ba",
      background: "transparent",
      color: "#2e59ba",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
    },
    toggleButtonActive: {
      background: "#2e59ba",
      color: "white",
    },
    welcomeOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      animation: "fadeIn 0.5s ease-in",
    },
    welcomePopup: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "2rem",
      borderRadius: "20px",
      textAlign: "center",
      maxWidth: "400px",
      margin: "1rem",
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      animation: "slideIn 0.5s ease-out",
    },
    welcomeTitle: {
      fontSize: "1.8rem",
      fontWeight: "700",
      marginBottom: "1rem",
    },
    welcomeText: {
      fontSize: "1rem",
      marginBottom: "1.5rem",
      lineHeight: "1.5",
    },
    welcomeButton: {
      background: "white",
      color: "#667eea",
      border: "none",
      padding: "12px 24px",
      borderRadius: "25px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    confettiContainer: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 999,
    },
    confettiPiece: {
      position: "absolute",
      width: "10px",
      height: "10px",
      borderRadius: "50%",
    },
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    setConfetti([]);
  };

  return (
    <Main
      title="Resume"
      description="Sanket Tambare's Resume. Arthena, Matroid, YC, Skeptical Investments, Stanford ICME, Planet Labs, and Facebook."
    >
      {/* Confetti for entire page */}
      {showWelcome && viewVersion === "v2" && (
        <div style={styles.confettiContainer}>
          {confetti.map((particle) => (
            <div
              key={particle.id}
              style={{
                ...styles.confettiPiece,
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                backgroundColor: particle.color,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                transform: `rotate(${particle.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Welcome Popup for interactive view */}
      {showWelcome && viewVersion === "v2" && (
        <div style={styles.welcomeOverlay}>
          <div style={styles.welcomePopup}>
            <h2 style={styles.welcomeTitle}>🎉 Welcome to My Professional Resume!</h2>
            <p style={styles.welcomeText}>
              Explore my professional journey through an interactive dashboard with detailed
              experience, education, skills, and certifications. Ready to discover my career path?
            </p>
            <button
              type="button"
              style={styles.welcomeButton}
              onClick={handleWelcomeClose}
            >
              Let&apos;s Explore! 💼
            </button>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {/* Toggle Buttons */}
        <div style={styles.toggleContainer}>
          <button
            type="button"
            style={{
              ...styles.toggleButton,
              ...(viewVersion === "v1" ? styles.toggleButtonActive : {})
            }}
            onClick={() => setViewVersion("v1")}
          >
            📋 Default View
          </button>
          <button
            type="button"
            style={{
              ...styles.toggleButton,
              ...(viewVersion === "v2" ? styles.toggleButtonActive : {})
            }}
            onClick={() => setViewVersion("v2")}
          >
            🚀 Interactive View
          </button>
        </div>

        {viewVersion === "v1" ? (
          <article className="post" id="resume">
            <header>
              <div className="title">
                <h2>
                  <Link to="resume">Resume</Link>
                </h2>
                <div className="link-container">
                  {sections.map((sec) => (
                    <h4 key={sec}>
                      <a href={`#${sec.toLowerCase()}`}>{sec}</a>
                    </h4>
                  ))}
                </div>
              </div>
            </header>
            <Education data={degrees} />
            <Experience data={positions} />
            <Certification data={certifications} />
            <Skills skills={skills} categories={categories} />
          </article>
        ) : (
          <ResumeV2
            degrees={degrees}
            positions={positions}
            certifications={certifications}
            skills={skills}
            categories={categories}
          />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            transform: translateY(-50px) scale(0.9);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}
      </style>
    </Main>
  );
};

export default Resume;
