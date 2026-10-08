// WOFF 1.0 -> plain SFNT (TTF/OTF), for resvg.
//
// The card fonts in scripts/og-fonts are .woff because satori reads WOFF, but
// resvg's font database only parses raw TrueType/OpenType. A WOFF 1.0 file is
// the same tables, each optionally zlib-deflated, behind a different header —
// so unwrapping it is a header rewrite and an inflate per table, not a
// dependency. (WOFF2 uses Brotli plus table transforms; it is not handled.)

import zlib from "node:zlib";

export function woffToSfnt(woff) {
  const buf = Buffer.from(woff);
  if (buf.toString("ascii", 0, 4) !== "wOFF") return buf; // already an SFNT
  const flavor = buf.readUInt32BE(4);
  const numTables = buf.readUInt16BE(12);

  const tables = [];
  for (let i = 0; i < numTables; i += 1) {
    const at = 44 + i * 20;
    const offset = buf.readUInt32BE(at + 4);
    const compLength = buf.readUInt32BE(at + 8);
    const origLength = buf.readUInt32BE(at + 12);
    const raw = buf.subarray(offset, offset + compLength);
    tables.push({
      tag: buf.subarray(at, at + 4),
      checksum: buf.readUInt32BE(at + 16),
      data: compLength < origLength ? zlib.inflateSync(raw) : raw,
    });
  }

  // The offset table's binary-search fields, as the OpenType spec defines them.
  const pow = 2 ** Math.floor(Math.log2(numTables));
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(Math.log2(pow), 8);
  header.writeUInt16BE(numTables * 16 - pow * 16, 10);

  const chunks = [header];
  let offset = header.length;
  tables.forEach((t, i) => {
    const rec = 12 + i * 16;
    t.tag.copy(header, rec);
    header.writeUInt32BE(t.checksum, rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(t.data.length, rec + 12);
    const padded = Buffer.alloc((t.data.length + 3) & ~3); // eslint-disable-line no-bitwise
    t.data.copy(padded);
    chunks.push(padded);
    offset += padded.length;
  });
  return Buffer.concat(chunks);
}

export default woffToSfnt;
