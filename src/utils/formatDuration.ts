// Format duration as MM:SS or H:MM:SS
export function formatDuration(ms?: number): string {
  if (!ms && ms !== 0) return '';
  const totalSec = Math.max(0, Math.round((ms || 0) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
