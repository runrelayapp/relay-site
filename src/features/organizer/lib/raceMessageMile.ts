import { clampRaceMileMarker } from '@/shared/lib/raceMileMarker';

export {
  clampRaceMileMarker as clampRaceMile,
  formatMileMarkerLabel,
  formatPreviewMileFromStored,
  formatPreviewMileLabel,
  parseMileMarkerLabel,
  RACE_MILE_MARKER_DEFAULT as ORGANIZER_RACE_MILE_DEFAULT,
  RACE_MILE_MARKER_MAX as ORGANIZER_RACE_MILE_MAX,
  RACE_MILE_MARKER_MIN as ORGANIZER_RACE_MILE_MIN,
  RACE_MILE_MARKER_STEP as ORGANIZER_RACE_MILE_STEP
} from '@/shared/lib/raceMileMarker';

export function formatMileDistanceValue(miles: number): string {
  const clamped = clampRaceMileMarker(miles);
  if (clamped === 0) {
    return '0';
  }
  if (Math.abs(clamped - Math.round(clamped)) < 0.001) {
    return String(Math.round(clamped));
  }
  return clamped.toFixed(1);
}
