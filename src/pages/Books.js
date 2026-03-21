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
      <style>{`
        .editorial-shadow {
          box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.4);
        }
      `}</style>
      <DigitalLibrary books={booksData} />
    </Main>
  );
};

export default Books;
