import React, { useState, useMemo } from "react";
import sportsData from "../../data/sports";
import SportV2 from "./SportV2";

// Helper function moved outside the component
function parseTime(timeStr) {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
}

const SportsV2 = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState("cards");
  const [sortBy, setSortBy] = useState("date");
  const [filterDistance, setFilterDistance] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stats = useMemo(() => {
    if (!sportsData || sportsData.length === 0) {
      return { totalRaces: 0, totalDistance: "0.0", averagePace: "0.00" };
    }

    const totalDistance = sportsData.reduce((sum, race) => {
      const distance = parseFloat(race.distance.replace(/[^\d.]/g, ""));
      return sum + distance;
    }, 0);

    if (totalDistance === 0) {
      return {
        totalRaces: sportsData.length,
        totalDistance: "0.0",
        averagePace: "0.00",
      };
    }

    const totalTime = sportsData.reduce(
      (sum, race) => sum + parseTime(race.time),
      0
    );

    const averagePace = totalTime / totalDistance;

    return {
      totalRaces: sportsData.length,
      totalDistance: totalDistance.toFixed(1),
      averagePace: averagePace.toFixed(2),
    };
  }, []);

  // Memoized the years array
  const years = useMemo(() => {
    const yearSet = new Set(
      sportsData.map((race) => new Date(race.date).getFullYear().toString())
    );
    return [...yearSet].sort((a, b) => b - a);
  }, []);

  const filteredAndSortedData = useMemo(() => {
    const filtered = sportsData.filter((race) => {
      if (filterDistance !== "all") {
        const distance = race.distance.toLowerCase();
        if (filterDistance === "10k" && !distance.includes("10")) return false;
        if (filterDistance === "21k" && !distance.includes("21")) return false;
        if (filterDistance === "35k" && !distance.includes("35")) return false;
        if (filterDistance === "42k" && !distance.includes("42")) return false;
      }

      if (filterYear !== "all") {
        const raceYear = new Date(race.date).getFullYear().toString();
        if (raceYear !== filterYear) return false;
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          race.title.toLowerCase().includes(searchLower)
          || race.place.toLowerCase().includes(searchLower)
          || race.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Use a stable sort by creating a copy before sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date) - new Date(a.date);
        case "time":
          return parseTime(a.time) - parseTime(b.time);
        case "distance": {
          const distA = parseFloat(a.distance.replace(/[^\d.]/g, ""));
          const distB = parseFloat(b.distance.replace(/[^\d.]/g, ""));
          return distB - distA;
        }
        default:
          return 0;
      }
    });
  }, [filterDistance, filterYear, searchTerm, sortBy]);

  const styles = {
    container: {
      padding: isMobile ? "0.5rem" : "1.5rem",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    header: {
      textAlign: "center",
      marginBottom: "2rem",
    },
    title: {
      fontSize: isMobile ? "1.8rem" : "2.5rem",
      fontWeight: "700",
      marginBottom: "0.5rem",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      fontSize: isMobile ? "1rem" : "1.2rem",
      color: "#666",
      marginBottom: "2rem",
    },
    controls: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginBottom: "2rem",
      justifyContent: "center",
      alignItems: "center",
    },
    controlGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    label: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#555",
    },
    select: {
      padding: "8px 12px",
      borderRadius: "8px",
      border: "2px solid #e0e0e0",
      fontSize: "0.9rem",
      background: "white",
      cursor: "pointer",
    },
    input: {
      padding: "8px 12px",
      borderRadius: "8px",
      border: "2px solid #e0e0e0",
      fontSize: "0.9rem",
      minWidth: "200px",
    },
    viewToggle: {
      display: "flex",
      gap: "8px",
      marginBottom: "2rem",
      justifyContent: "center",
    },
    toggleButton: {
      padding: "10px 20px",
      borderRadius: "25px",
      border: "2px solid #667eea",
      background: "transparent",
      color: "#667eea",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.3s ease",
    },
    toggleButtonActive: {
      background: "#667eea",
      color: "white",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
      gap: "16px",
      marginBottom: "2rem",
    },
    statCard: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "20px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    },
    statValue: {
      fontSize: isMobile ? "1.5rem" : "2rem",
      fontWeight: "700",
      marginBottom: "4px",
    },
    statLabel: {
      fontSize: "0.8rem",
      opacity: "0.9",
    },
    resultsCount: {
      textAlign: "center",
      fontSize: "1.1rem",
      color: "#666",
      marginBottom: "2rem",
      fontWeight: "600",
    },
  };

  return (
    <div style={styles.container} className="sports-v2-container">
      <div style={styles.header}>
        <h1 style={styles.title} className="sports-v2-title">🏃‍♂️ Marathon Journey</h1>
        <p style={styles.subtitle} className="sports-v2-subtitle">
          Interactive visualization of my running achievements
        </p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard} className="sports-v2-stat-card">
          <div style={styles.statValue}>{stats.totalRaces}</div>
          <div style={styles.statLabel}>Total Races</div>
        </div>
        <div style={styles.statCard} className="sports-v2-stat-card">
          <div style={styles.statValue}>{stats.totalDistance}K</div>
          <div style={styles.statLabel}>Total Distance</div>
        </div>
        <div style={styles.statCard} className="sports-v2-stat-card">
          <div style={styles.statValue}>{stats.averagePace}</div>
          <div style={styles.statLabel}>Avg Pace (min/km)</div>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label htmlFor="search-input" style={styles.label} className="sports-v2-label">
            Search
            <input
              id="search-input"
              type="text"
              placeholder="Search races..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
              className="sports-v2-input"
            />
          </label>
        </div>

        <div style={styles.controlGroup}>
          <label htmlFor="distance-select" style={styles.label} className="sports-v2-label">
            Distance
            <select
              id="distance-select"
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
              style={styles.select}
              className="sports-v2-select"
            >
              <option value="all">All Distances</option>
              <option value="10k">10K</option>
              <option value="21k">21K</option>
              <option value="35k">35K</option>
              <option value="42k">42K</option>
            </select>
          </label>
        </div>

        <div style={styles.controlGroup}>
          <label htmlFor="year-select" style={styles.label} className="sports-v2-label">
            Year
            <select
              id="year-select"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={styles.select}
              className="sports-v2-select"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={styles.controlGroup}>
          <label htmlFor="sort-select" style={styles.label} className="sports-v2-label">
            Sort By
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
              className="sports-v2-select"
            >
              <option value="date">Date (Newest)</option>
              <option value="time">Time (Fastest)</option>
              <option value="distance">Distance (Longest)</option>
            </select>
          </label>
        </div>
      </div>

      <div style={styles.viewToggle}>
        <button
          type="button"
          className={`sports-v2-toggle-button ${viewMode === "cards" ? 'sports-v2-toggle-button-active' : ''}`}
          style={{
            ...styles.toggleButton,
            ...(viewMode === "cards" ? styles.toggleButtonActive : {}),
          }}
          onClick={() => setViewMode("cards")}
        >
          📊 Cards View
        </button>
        <button
          type="button"
          className={`sports-v2-toggle-button ${viewMode === "timeline" ? 'sports-v2-toggle-button-active' : ''}`}
          style={{
            ...styles.toggleButton,
            ...(viewMode === "timeline" ? styles.toggleButtonActive : {}),
          }}
          onClick={() => setViewMode("timeline")}
        >
          📅 Timeline View
        </button>
      </div>

      <div style={styles.resultsCount} className="sports-v2-results-count">
        Showing {filteredAndSortedData.length} of {sportsData.length} races
      </div>

      {viewMode === "cards" ? (
        <div>
          {filteredAndSortedData.map((race) => (
            <SportV2 key={race.id} data={race} />
          ))}
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: "30px" }}>
          <div
            className="sports-v2-timeline-line"
            style={{
              position: "absolute",
              left: "15px",
              top: "0",
              bottom: "0",
              width: "2px",
              background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
            }}
          />
          {filteredAndSortedData.map((race) => (
            <div
              key={race.id}
              style={{ position: "relative", marginBottom: "30px" }}
            >
              <div
                className="sports-v2-timeline-dot"
                style={{
                  position: "absolute",
                  left: "-22px",
                  top: "20px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#667eea",
                  border: "3px solid white",
                  boxShadow: "0 0 0 3px #667eea",
                }}
              />
              <SportV2 data={race} />
            </div>
          ))}
        </div>
      )}

      {filteredAndSortedData.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#666" }} className="sports-v2-no-results">
          <h3>No races found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default SportsV2;
