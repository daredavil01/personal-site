// Plain personal facts, dependency-free so both the /stats page
// (stats/personal.js) and the /ask indexer (scripts/ask-sources/stats.mjs, in
// Node) can read them. Edit values here, not in personal.js.

const BIRTH_DATE = "1999-01-22T21:23:00";

const personalFacts = {
  name: "Sanket Tambare",
  birthDate: BIRTH_DATE,
  city: "Barshi, MH",
  /** Whole years on `date`. */
  ageOn(date) {
    const birth = new Date(BIRTH_DATE);
    let years = date.getFullYear() - birth.getFullYear();
    const beforeBirthday = date.getMonth() < birth.getMonth()
      || (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate());
    if (beforeBirthday) years -= 1;
    return years;
  },
  // Extra label/value pairs to index; shown nowhere else yet.
  extra: [],
};

export default personalFacts;
