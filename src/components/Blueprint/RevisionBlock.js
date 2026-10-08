import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { fmt } from "./features";

// The revision block every drawing set ends with: one line per major version,
// newest first, read from the changelog tables. Nothing is shown until the
// rows arrive, and the block is left out entirely if they never do.

const RevisionBlock = ({ majors, headlines, limit }) => {
  if (!majors || !majors.length) return null;
  const byMajor = new Map((headlines || []).map((h) => [h.major, h.headline]));
  const rows = majors.slice(0, limit);

  return (
    <div className="bp-scroll">
      <table className="w-full min-w-[560px] border-collapse bp-mono text-[11px]">
        <caption className="sr-only">Revision history: the most recent major versions of the site</caption>
        <thead>
          <tr className="text-left">
            {["Rev", "Latest", "Releases", "Description"].map((h) => (
              <th key={h} scope="col" className="border bp-rule px-2 py-1.5 uppercase tracking-[0.18em] text-[10px] bp-red font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.major}>
              <td className="border bp-rule px-2 py-1.5 bp-ink">
                <Link to={`/changelog?v=${m.major}`} className="bp-ink hover:underline">{`v${m.major}`}</Link>
              </td>
              <td className="border bp-rule px-2 py-1.5 bp-soft">{m.latest}</td>
              <td className="border bp-rule px-2 py-1.5 bp-soft">{fmt(m.count)}</td>
              <td className="border bp-rule px-2 py-1.5 font-body text-xs bp-ink">{byMajor.get(m.major) || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

RevisionBlock.propTypes = {
  majors: PropTypes.arrayOf(PropTypes.shape({})),
  headlines: PropTypes.arrayOf(PropTypes.shape({})),
  limit: PropTypes.number,
};

RevisionBlock.defaultProps = {
  majors: null,
  headlines: null,
  limit: 8,
};

export default RevisionBlock;
