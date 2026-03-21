import React from 'react';
import Table from './Table';
import instaData from '../../data/instagram';

const getInstaStats = () => {
  const totalPosts = instaData.length;
  const totalPhotos = instaData.reduce(
    (acc, curr) => acc + (curr.slideImages ? curr.slideImages.length : 0),
    0,
  );

  return [
    { label: 'Photography Collections', value: totalPosts },
    { label: 'Photos Uploaded', value: totalPhotos },
  ];
};

const InstagramStats = () => (
  <>
    <h3>Photography</h3>
    <Table data={getInstaStats()} />
  </>
);

export default InstagramStats;
