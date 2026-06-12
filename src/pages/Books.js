import React from "react";
import Main from "../layouts/Main";
import DigitalLibrary from "../components/Books/DigitalLibrary";
import booksData from "../data/books";

const Books = () => {
  return (
    <Main>
      <DigitalLibrary books={booksData} />
    </Main>
  );
};

export default Books;
