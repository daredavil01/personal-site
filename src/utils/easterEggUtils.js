/**
 * Generate random bubbles with tags for the Tag Rain Easter egg
 * @param {Array} tags - Array of tag strings
 * @param {number} count - Number of bubbles to generate
 * @returns {Array} Array of bubble objects
 */
export const generateBubbles = (tags, count = 20) => {
  const colors = [
    'rgba(255, 99, 132, 0.4)',
    'rgba(54, 162, 235, 0.4)',
    'rgba(255, 206, 86, 0.4)',
    'rgba(75, 192, 192, 0.4)',
    'rgba(153, 102, 255, 0.4)',
    'rgba(255, 159, 64, 0.4)',
    'rgba(199, 99, 255, 0.4)',
    'rgba(255, 99, 255, 0.4)',
  ];

  const animationTypes = ['fast', 'slow', 'bouncy'];
  const newBubbles = [];

  for (let i = 0; i < count; i += 1) {
    newBubbles.push({
      id: i,
      tag: tags[Math.floor(Math.random() * tags.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * (window.innerWidth - 200),
      y: -100 - Math.random() * 500,
      size: Math.random() * 60 + 80,
      speed: Math.random() * 1.5 + 1,
      animationType: animationTypes[Math.floor(Math.random() * animationTypes.length)],
      popped: false,
    });
  }

  return newBubbles;
};

/**
 * Extract unique tags from book data
 * @param {Array} data - Array of book objects
 * @returns {Array} Sorted array of unique tags
 */
export const extractUniqueTags = (data) => {
  const uniqueTags = new Set();
  data.forEach((book) => book.tags && book.tags.forEach((tag) => uniqueTags.add(tag)));
  const tagsList = [...uniqueTags].sort();

  // Fallback if no tags found
  if (tagsList.length === 0) {
    tagsList.push('Fiction', 'Non-Fiction', 'Technology', 'Philosophy', 'Self-Help');
  }

  return tagsList;
};
