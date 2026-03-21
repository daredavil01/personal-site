import React from 'react';
import Table from './Table';
import blogsData from '../../data/100DaysToOffload';

const getOffloadStats = () => {
  const total = blogsData.length;

  return [
    { label: 'Published Posts (Goal: 100)', value: total },
    { label: 'Remaining Goal', value: 100 - total },
    {
      label: 'Substack Posts',
      value: blogsData.filter((p) => p.blog_platform === 'Substack').length,
    },
    {
      label: 'WordPress Posts',
      value: blogsData.filter((p) => p.blog_platform === 'WordPress').length,
    },
  ];
};

const OffloadStats = () => (
  <>
    <h3>100 Days To Offload</h3>
    <Table data={getOffloadStats()} />
  </>
);

export default OffloadStats;
