/* eslint no-use-before-define: 2 */ // --> ON

import React, { useState, useCallback, useEffect } from "react";

import Table from "./Table";
import initialData from "../../data/stats/site";

const Stats = () => {
  const [data, setResponseData] = useState(initialData);
  // TODO think about persisting this somewhere
  const fetchData = useCallback(async () => {
    // request must be authenticated if private
    const res = await fetch(
      "https://api.github.com/repos/daredavil01/personal-site"
    );
    const resData = await res.json();

    const commits = await fetch(
      "https://api.github.com/repos/daredavil01/personal-site/commits"
    );
    const commitsData = await commits.json();
    if (commitsData.length > 0) {
      resData.commits = commitsData.length;
    }
    setResponseData(
      initialData.map((field) => ({
        ...field,
        // update value if value was returned by call to github
        value: Object.keys(resData).includes(field.key)
          ? resData[field.key]
          : field.value,
      }))
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <h3>Some stats about this site</h3>
      <Table data={data} />
    </div>
  );
};

export default Stats;
