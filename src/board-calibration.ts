/** Shared, browser-local coordinate override written by /calibrate.html.
 *
 * The game deliberately treats it as a visual override only: it never changes
 * site semantics, costs, or legality, which remain authoritative in the
 * engine.  Reload the game after editing coordinates in the collector.
 */
import embeddedCalibration from './generated/board-calibration-defaults.json';

export type CalibrationMark = {
  id: string;
  kind: 'token' | 'hotspot';
  asset?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export const calibrationStorageKey = 'arnak.board-calibrator.v2';

export function readBoardCalibration(): Record<string, CalibrationMark[]> {
  const defaults = (embeddedCalibration as { boards: Record<string, CalibrationMark[]> }).boards;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(calibrationStorageKey) || '{}');
    if (!value || typeof value !== 'object') return defaults;
    const local = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([board, marks]) => [
      board,
      Array.isArray(marks) ? marks.filter((mark): mark is CalibrationMark => Boolean(mark) && typeof mark === 'object' && typeof (mark as CalibrationMark).id === 'string' && Number.isFinite((mark as CalibrationMark).x) && Number.isFinite((mark as CalibrationMark).y)) : [],
    ]));
    return { ...defaults, ...local };
  } catch { return defaults; }
}

export function calibrationMark(board: string, id: string) {
  const marks = readBoardCalibration()[board] ?? [];
  // Stable IDs are authoritative.  Labels are only a legacy migration
  // fallback; allowing an old label to win first made the game read a stale
  // anchor even though the collector was showing a newer named mark.
  return [...marks].reverse().find((mark) => mark.id === id)
    ?? [...marks].reverse().find((mark) => mark.label === id);
}
