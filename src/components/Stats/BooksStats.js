import React from 'react';
import Table from './Table';
import booksData from '../../data/books';

const getBooksStats = () => {
  const total = booksData.length;
  const marathi = booksData.filter((b) => b.language === 'Marathi').length;
  const english = booksData.filter((b) => b.language === 'English').length;

  return [
    { label: 'Total Books Read', value: total },
    { label: 'English Books', value: english },
    { label: 'Marathi Books', value: marathi },
  ];
};

const BooksStats = () => (
  <>
    <h3>Reading Statistics</h3>
    <Table data={getBooksStats()} />
  </>
);

export default BooksStats;
