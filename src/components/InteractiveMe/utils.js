function parseDateMs(dateStr, type) {
  if (type === 'trek') {
    // Format: "DD-MM-YYYY"
    const [dd, mm, yyyy] = dateStr.split('-');
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }
  // Sports format: "Month DD, YYYY"
  return new Date(dateStr).getTime();
}

export function normalizeEntry(entry, type) {
  const images = entry.slideImages || entry.photos || [];
  if (!images.length) return null;
  return {
    id: `${type}-${entry.id}`,
    type,
    title: type === 'sport' ? entry.title : entry.fort_name,
    imageUrl: images[0].url,
    dateMs: parseDateMs(type === 'sport' ? entry.date : entry.date, type),
    meta: type === 'sport'
      ? { date: entry.date, place: entry.place, distance: entry.distance, time: entry.time }
      : { date: entry.date, endurance: entry.endurance_level, duration: entry.trek_time },
  };
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
