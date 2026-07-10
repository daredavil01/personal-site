import React from "react";
import PageShell from "../atlas/PageShell";
import DigitalLibrary from "../components/Books/DigitalLibrary";
import { useBooks } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";

const Books = () => {
  const { data: booksData, loading, error } = useBooks();

  return (
    <PageShell region="reader">
      {loading && <LoadingBlock label="Loading books…" />}
      {error && <ErrorBlock />}
      {!loading && !error && <DigitalLibrary books={booksData} />}
    </PageShell>
  );
};

export default Books;
