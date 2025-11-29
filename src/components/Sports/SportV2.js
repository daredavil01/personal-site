import React, { useState } from "react";
import PropTypes from "prop-types";
import ImageSlider from "../Instagram/ImageSlider";

const SportV2 = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Parse time to get minutes for progress calculation
  const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    if (parts.length === 3) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  };

  // Calculate pace (minutes per km)
  const calculatePace = (time, distance) => {
    const timeInMinutes = parseTime(time);
    const distanceInKm = parseFloat(distance.replace(/[^\d.]/g, ''));
    // Avoid division by zero
    if (distanceInKm === 0) return 'N/A';
    return (timeInMinutes / distanceInKm).toFixed(2);
  };

  // Get distance category color
  const getDistanceColor = (distance) => {
    const dist = distance.toLowerCase();
    if (dist.includes('10')) return '#4CAF50';
    if (dist.includes('21')) return '#2196F3';
    if (dist.includes('35')) return '#FF9800';
    if (dist.includes('42')) return '#F44336';
    return '#9E9E9E';
  };

  const pace = calculatePace(data.time, data.distance);
  const distanceColor = getDistanceColor(data.distance);

  const cardStyles = {
    container: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      borderRadius: '16px',
      boxShadow: isHovered
        ? '0 8px 32px rgba(0,0,0,0.15)'
        : '0 4px 16px rgba(0,0,0,0.1)',
      margin: '20px 0',
      padding: '24px',
      transition: 'all 0.3s ease',
      border: `3px solid ${distanceColor}`,
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px',
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: '700',
      color: '#2c3e50',
      margin: '0',
      flex: '1',
    },
    badge: {
      background: distanceColor,
      color: 'white',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      marginLeft: '12px',
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
      marginBottom: '16px',
    },
    stat: {
      textAlign: 'center',
      padding: '12px',
      background: 'rgba(255,255,255,0.8)',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    },
    // Updated Style: Added margin: 0
    statLabel: {
      fontSize: '0.75rem',
      color: '#666',
      fontWeight: '500',
      marginBottom: '4px',
      margin: 0,
    },
    // Updated Style: Added margin: 0
    statValue: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#2c3e50',
      margin: 0,
    },
    description: {
      color: '#555',
      fontSize: '0.9rem',
      lineHeight: '1.5',
      marginBottom: '16px',
      fontStyle: 'italic',
    },
    progressContainer: {
      marginBottom: '16px',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      background: '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      background: `linear-gradient(90deg, ${distanceColor} 0%, ${distanceColor}80 100%)`,
      borderRadius: '4px',
      transition: 'width 0.8s ease',
    },
    expandButton: {
      background: 'transparent',
      border: `2px solid ${distanceColor}`,
      color: distanceColor,
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      marginBottom: '16px',
    },
    expandedContent: {
      maxHeight: isExpanded ? '1000px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.3s ease',
    },
    certificateLink: {
      display: 'inline-block',
      background: '#2e59ba',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      textDecoration: 'none',
      fontSize: '0.8rem',
      fontWeight: '600',
      marginTop: '12px',
      transition: 'all 0.3s ease',
    },
    imageSection: {
      marginTop: '16px',
    },
    imageTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '12px',
      textAlign: 'center',
    },
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      style={cardStyles.container}
      className="sport-v2-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      onKeyPress={(e) => (e.key === 'Enter' ? handleCardClick() : null)}
      role="button"
      tabIndex="0"
    >
      <div style={cardStyles.header}>
        <h3 style={cardStyles.title} className="sport-v2-title">{data.title}</h3>
        <span style={cardStyles.badge}>{data.distance}</span>
      </div>

      <p style={cardStyles.description} className="sport-v2-description">&ldquo;{data.description}&rdquo;</p>

      <div style={cardStyles.stats}>
        {/* Changed divs to p tags below */}
        <div style={cardStyles.stat} className="sport-v2-stat">
          <p style={cardStyles.statLabel} className="sport-v2-stat-label">Date</p>
          <p style={cardStyles.statValue} className="sport-v2-stat-value">{data.date}</p>
        </div>
        <div style={cardStyles.stat} className="sport-v2-stat">
          <p style={cardStyles.statLabel} className="sport-v2-stat-label">Place</p>
          <p style={cardStyles.statValue} className="sport-v2-stat-value">{data.place}</p>
        </div>
        <div style={cardStyles.stat} className="sport-v2-stat">
          <p style={cardStyles.statLabel} className="sport-v2-stat-label">Time</p>
          <p style={cardStyles.statValue} className="sport-v2-stat-value">{data.time}</p>
        </div>
        <div style={cardStyles.stat} className="sport-v2-stat">
          <p style={cardStyles.statLabel} className="sport-v2-stat-label">Pace</p>
          <p style={cardStyles.statValue} className="sport-v2-stat-value">{pace} min/km</p>
        </div>
      </div>

      <div style={cardStyles.progressContainer}>
        <div style={cardStyles.progressBar} className="sport-v2-progress-bar">
          <div
            style={{
              ...cardStyles.progressFill,
              width: `${Math.min((parseTime(data.time) / 180) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        className={`sport-v2-expand-button ${isExpanded ? 'sport-v2-expand-button-active' : ''}`}
        style={{
          ...cardStyles.expandButton,
          background: isExpanded ? distanceColor : 'transparent',
          color: isExpanded ? 'white' : distanceColor,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? 'Hide Details' : 'Show Details'}
      </button>

      <div
        style={cardStyles.expandedContent}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <a
          href={data.timeCertificateLink}
          target="_blank"
          rel="noopener noreferrer"
          style={cardStyles.certificateLink}
          className="sport-v2-certificate-link"
          onClick={(e) => e.stopPropagation()}
        >
          📋 View Certificate
        </a>

        <div style={cardStyles.imageSection}>
          <h4 style={cardStyles.imageTitle} className="sport-v2-image-title">🏃‍♂️ Event Highlights</h4>
          <ImageSlider data={data.slideImages} />
        </div>
      </div>
    </div>
  );
};

SportV2.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    date: PropTypes.string,
    description: PropTypes.string,
    place: PropTypes.string,
    distance: PropTypes.string,
    time: PropTypes.string,
    timeCertificateLink: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default SportV2;
