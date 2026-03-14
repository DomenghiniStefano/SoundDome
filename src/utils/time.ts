export function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const secs = (clamped % 60).toFixed(2);
  return `${minutes}:${secs.padStart(5, '0')}`;
}

export function parseTime(input: string): number {
  const parts = input.split(':');
  if (parts.length === 2) {
    return Math.max(0, Number(parts[0]) * 60 + Number(parts[1]));
  }
  return Math.max(0, Number(input) || 0);
}

export function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}
