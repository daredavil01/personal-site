import React from "react";
import Main from "../layouts/Main";
import DigitalLibrary from "../components/Books/DigitalLibrary";
import { useBooks } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";

const Books = () => {
  const { data: booksData, loading, error } = useBooks();

  return (
    <Main>
      {loading && <LoadingBlock label="Loading books…" />}
      {error && <ErrorBlock />}
      {!loading && !error && <DigitalLibrary books={booksData} />}
    </Main>
  );
};

export default Books;
