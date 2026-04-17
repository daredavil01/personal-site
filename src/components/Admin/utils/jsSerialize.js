// Custom JS serializer that outputs template literals for image URL fields.
// Any object field named "url" whose value starts with "/images/" is output
// as `${process.env.PUBLIC_URL}/images/...` instead of a quoted string.

const needsTemplateLiteral = (key, value) =>
  key === 'url' && typeof value === 'string' && value.startsWith('/images/');

const serializeValue = (value, key, indent) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (needsTemplateLiteral(key, value)) {
      return `\`\${process.env.PUBLIC_URL}${value}\``;
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return serializeArray(value, indent);
  if (typeof value === 'object') return serializeObject(value, indent);
  return JSON.stringify(value);
};

const serializeObject = (obj, indent = 0) => {
  const pad = '  '.repeat(indent + 1);
  const closePad = '  '.repeat(indent);
  const entries = Object.entries(obj).map(
    ([k, v]) => `${pad}${k}: ${serializeValue(v, k, indent + 1)}`
  );
  return `{\n${entries.join(',\n')},\n${closePad}}`;
};

const serializeArray = (arr, indent = 0) => {
  if (arr.length === 0) return '[]';
  const pad = '  '.repeat(indent + 1);
  const closePad = '  '.repeat(indent);
  const items = arr.map((item) => `${pad}${serializeValue(item, null, indent + 1)}`);
  return `[\n${items.join(',\n')},\n${closePad}]`;
};

export const jsSerialize = (data) => serializeArray(data, 0);

export default jsSerialize;
