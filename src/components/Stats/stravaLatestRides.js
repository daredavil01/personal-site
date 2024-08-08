import React from "react";

const StravaEmbed = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      borderWidth: "2px",
      border: "2px solid black",
      padding: "10px",
      marginBottom: "40px",
    }}
  >
    <iframe
      title="Strava Activity Summary"
      height="160"
      width="300"
      src="https://www.strava.com/athletes/135540983/activity-summary/113c888109e9a16f2e9f1e6210e1471663dde0fa"
      style={{
        marginBottom: "20px",
        marginRight: "20px",
        alignContent: "center",
        border: "2px solid black",
      }} // Adding space between iframes
    />
    <iframe
      height="454"
      width="300"
      src="https://www.strava.com/athletes/135540983/latest-rides/113c888109e9a16f2e9f1e6210e1471663dde0fa"
      title="Strava Latest Rides"
      style={{
        marginBottom: "20px",
        marginRight: "20px",
        border: "2px solid black",
      }} // Adding space between iframes
    />
  </div>
);

export default StravaEmbed;
