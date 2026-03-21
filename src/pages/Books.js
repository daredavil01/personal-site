import React from "react";
import Main from "../layouts/Main";
import DigitalLibrary from "../components/Books/DigitalLibrary";
import booksData from "../data/books";

const Books = () => {
  return (
    <Main
      title="Books"
      description="A curated selection of literature that shaped my perspective on design, philosophy, and technology."
    >
      <DigitalLibrary books={booksData} />
    </Main>
  );
};

export default Books;
