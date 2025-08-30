import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import EducationV2 from "./ResumeV2/EducationV2";
import ExperienceV2 from "./ResumeV2/ExperienceV2";
import SkillsV2 from "./ResumeV2/SkillsV2";
import CertificationV2 from "./ResumeV2/CertificationV2";

const ResumeV2 = ({ degrees, positions, certifications, skills, categories }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeSection, setActiveSection] = useState("overview");
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    setAnimateIn(true);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    container: {
      padding: isMobile ? "1rem" : "2rem",
      maxWidth: "1200px",
      margin: "0 auto",
      opacity: animateIn ? 1 : 0,
      transform: animateIn ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.6s ease-out",
    },
    header: {
      textAlign: "center",
      marginBottom: "3rem",
      padding: "2rem",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      borderRadius: "20px",
      color: "white",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    title: {
      fontSize: isMobile ? "2rem" : "3rem",
      fontWeight: "700",
      marginBottom: "1rem",
      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
    },
    subtitle: {
      fontSize: isMobile ? "1rem" : "1.2rem",
      opacity: "0.9",
      marginBottom: "2rem",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "1rem",
      marginBottom: "2rem",
    },
    statCard: {
      background: "rgba(255,255,255,0.1)",
      padding: "1rem",
      borderRadius: "12px",
      textAlign: "center",
      backdropFilter: "blur(10px)",
    },
    statValue: {
      fontSize: isMobile ? "1.5rem" : "2rem",
      fontWeight: "700",
      marginBottom: "0.5rem",
    },
    statLabel: {
      fontSize: "0.8rem",
      opacity: "0.8",
    },
    navigation: {
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: "0.5rem",
      marginBottom: "3rem",
    },
    navButton: {
      padding: "0.8rem 1.5rem",
      borderRadius: "25px",
      border: "2px solid #667eea",
      background: "transparent",
      color: "#667eea",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
    },
    navButtonActive: {
      background: "#667eea",
      color: "white",
      transform: "scale(1.05)",
    },
    content: {
      minHeight: "400px",
    },
  };

  const stats = {
    experience: positions.length,
    education: degrees.length,
    certifications: certifications.length,
    skills: skills.length,
  };

  const sections = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "experience", label: "💼 Experience", icon: "💼" },
    { id: "education", label: "🎓 Education", icon: "🎓" },
    { id: "skills", label: "🛠️ Skills", icon: "🛠️" },
    { id: "certifications", label: "🏆 Certifications", icon: "🏆" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h3 style={{ marginBottom: "2rem", color: "#333" }}>
              Welcome to my professional journey! 🚀
            </h3>
            <p style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "#666" }}>
              I&apos;m a passionate software developer with expertise in full-stack development,
              data analysis, and cloud technologies. Explore my experience, education,
              skills, and certifications to learn more about my professional background.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <button
                type="button"
                style={{
                  ...styles.navButton,
                  ...styles.navButtonActive,
                }}
                onClick={() => setActiveSection("experience")}
              >
                View My Experience →
              </button>
            </div>
          </div>
        );
      case "experience":
        return <ExperienceV2 data={positions} />;
      case "education":
        return <EducationV2 data={degrees} />;
      case "skills":
        return <SkillsV2 skills={skills} categories={categories} />;
      case "certifications":
        return <CertificationV2 data={certifications} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container} className="resume-v2-container">
      <div style={styles.header} className="resume-v2-header">
        <h1 style={styles.title}>Professional Resume</h1>
        <p style={styles.subtitle}>
          Interactive overview of my professional experience and achievements
        </p>
        <div style={styles.statsContainer}>
          <div style={styles.statCard} className="resume-v2-stat-card">
            <div style={styles.statValue}>{stats.experience}</div>
            <div style={styles.statLabel}>Experience</div>
          </div>
          <div style={styles.statCard} className="resume-v2-stat-card">
            <div style={styles.statValue}>{stats.education}</div>
            <div style={styles.statLabel}>Education</div>
          </div>
          <div style={styles.statCard} className="resume-v2-stat-card">
            <div style={styles.statValue}>{stats.certifications}</div>
            <div style={styles.statLabel}>Certifications</div>
          </div>
          <div style={styles.statCard} className="resume-v2-stat-card">
            <div style={styles.statValue}>{stats.skills}</div>
            <div style={styles.statLabel}>Skills</div>
          </div>
        </div>
      </div>

      <div style={styles.navigation}>
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`resume-v2-nav-button ${activeSection === section.id ? 'resume-v2-nav-button-active' : ''}`}
            style={{
              ...styles.navButton,
              ...(activeSection === section.id ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveSection(section.id)}
          >
            {section.icon} {section.label}
          </button>
        ))}
      </div>

      <div style={styles.content} className="resume-v2-content">
        {renderContent()}
      </div>
    </div>
  );
};

ResumeV2.propTypes = {
  degrees: PropTypes.arrayOf(PropTypes.shape({
    school: PropTypes.string.isRequired,
    degree: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
  })).isRequired,
  positions: PropTypes.arrayOf(PropTypes.shape({
    company: PropTypes.string.isRequired,
    position: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    daterange: PropTypes.string.isRequired,
    points: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  certifications: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    issuedDate: PropTypes.string.isRequired,
  })).isRequired,
  skills: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    competency: PropTypes.number.isRequired,
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};

export default ResumeV2;
