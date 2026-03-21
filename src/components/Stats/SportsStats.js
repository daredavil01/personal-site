import React from 'react';
import Table from './Table';
import sportsData from '../../data/sports';

const getSportsStats = () => {
  const total = sportsData.length;
  const halfMarathons = sportsData.filter((s) => s.distance.toLowerCase().includes('21')).length;
  const tenKms = sportsData.filter((s) => s.distance.toLowerCase().includes('10')).length;
  const fullMarathons = sportsData.filter((s) => s.distance.toLowerCase().includes('42')).length;
  const ultras = sportsData.filter(
    (s) => s.distance.toLowerCase().includes('35') || s.distance.toLowerCase().includes('50'),
  ).length;

  return [
    { label: 'Total Running Events', value: total },
    { label: 'Ultra Marathons', value: ultras },
    { label: 'Full Marathons', value: fullMarathons },
    { label: 'Half Marathons', value: halfMarathons },
    { label: '10K Runs', value: tenKms },
  ];
};

const SportsStats = () => (
  <>
    <h3>Sports & Marathons</h3>
    <Table data={getSportsStats()} />
  </>
);

export default SportsStats;
