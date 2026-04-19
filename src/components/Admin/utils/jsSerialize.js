// Custom JS serializer that outputs template literals for image URL fields.
// Any object field named "url" whose value starts with "/images/" is output
// as `${process.env.PUBLIC_URL}/images/...` instead of a quoted string.
// Uses a single recursive function to avoid mutual-reference linting issues.

// eslint-disable-next-line consistent-return
const serialize = (value, key, indent) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (key === 'url' && value.startsWith('/images/')) {
      return `\`\${process.env.PUBLIC_URL}${value}\``;
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const items = value.map((item) => `${pad}${serialize(item, null, indent + 1)}`);
    return `[\n${items.join(',\n')},\n${closePad}]`;
  }
  if (typeof value === 'object') {
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const entries = Object.entries(value).map(
      ([k, v]) => `${pad}${k}: ${serialize(v, k, indent + 1)}`,
    );
    return `{\n${entries.join(',\n')},\n${closePad}}`;
  }
  return JSON.stringify(value);
};

export const jsSerialize = (data) => serialize(data, null, 0);

export default jsSerialize;
