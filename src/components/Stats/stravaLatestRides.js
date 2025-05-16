import React from "react";

const StravaEmbed = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    container: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: "center",
      border: "2px solid black",
      padding: isMobile ? "5px" : "10px",
      marginBottom: isMobile ? "20px" : "40px",
      gap: isMobile ? "10px" : "20px",
    },
    iframe: {
      border: "2px solid black",
      width: isMobile ? "100%" : "300px",
      height: isMobile ? "auto" : "160px",
      marginBottom: isMobile ? "10px" : "20px",
    },
    activityIframe: {
      border: "2px solid black",
      width: isMobile ? "100%" : "300px",
      height: isMobile ? "auto" : "454px",
      marginBottom: isMobile ? "10px" : "20px",
    },
  };

  return (
    <div style={styles.container}>
      <iframe
        title="Strava Activity Summary"
        src="https://www.strava.com/athletes/135540983/activity-summary/113c888109e9a16f2e9f1e6210e1471663dde0fa"
        style={styles.iframe}
      />
      <iframe
        src="https://www.strava.com/athletes/135540983/latest-rides/113c888109e9a16f2e9f1e6210e1471663dde0fa"
        title="Strava Latest Rides"
        style={styles.activityIframe}
      />
    </div>
  );
};

export default StravaEmbed;
