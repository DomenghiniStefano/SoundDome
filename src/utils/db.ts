import _ from 'lodash';

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}

export function sliderToDb(sliderValue: number): number {
  const v = _.clamp(sliderValue, 0, 100);
  if (v === 0) return -60;
  if (v === 100) return 0;
  const normalized = v / 100;
  return -60 * Math.pow(1 - normalized, 2);
}

export function dbToSlider(db: number): number {
  if (db <= -60) return 0;
  if (db >= 0) return 100;
  const normalized = 1 - Math.sqrt(-db / 60);
  return Math.round(normalized * 100);
}

/**
 * Convert slider value (0-100) directly to linear gain (0-1).
 * Uses logarithmic curve so 50% feels like half volume.
 */
export function sliderToGain(sliderValue: number): number {
  return dbToGain(sliderToDb(sliderValue));
}
