export const parseDistance = (distStr) => {
  if (!distStr) return 0;
  const match = distStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

export const formatSecondsToTime = (totalSeconds) => {
  if (!totalSeconds || totalSeconds === Infinity) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatSecondsToPace = (totalSeconds, distanceKm) => {
  if (!totalSeconds || !distanceKm) return "0:00";
  const secsPerKm = totalSeconds / distanceKm;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.floor(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
