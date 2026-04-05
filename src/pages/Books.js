import React from "react";
import Main from "../layouts/Main";
import DigitalLibrary from "../components/Books/DigitalLibrary";
import booksData from "../data/books";

const Books = () => {
  return (
    <Main
      title="Books"
      description="An interactive catalog of 100+ books read, with reviews and ratings spanning design, philosophy, technology, and Marathi literature."
    >
      <DigitalLibrary books={booksData} />
    </Main>
  );
};

export default Books;
