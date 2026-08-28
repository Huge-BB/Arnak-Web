/**
 * Visual-board coordinate layer. Each board owns an unscaled coordinate
 * system matching its source image. DOM/CSS converts these points only at
 * the rendering edge, so adjacent boards and viewport size never matter.
 */
import type { ResearchBoardId } from './types.ts';

export type BoardPoint = Readonly<{ x: number; y: number }>;
export type BoardSize = Readonly<{ width: number; height: number }>;

export const MAIN_BOARD_SIZE: BoardSize = { width: 1000, height: 1030 };
export const RESEARCH_BOARD_SIZE: BoardSize = { width: 950, height: 2705 };
export const PLAYER_VIEWPORT = {
  // player-base source export has an unused black strip on its left.
  base: { sourceX: 504, width: 766, height: 328 },
  leader: { sourceX: 0, width: 1270, height: 328 },
} as const;

export function pointStyle(point: BoardPoint, size: BoardSize) {
  return `--x:${point.x / size.width * 100}%;--y:${point.y / size.height * 100}%`;
}
export function playerPointStyle(point: BoardPoint, leader = false) {
  const viewport = leader ? PLAYER_VIEWPORT.leader : PLAYER_VIEWPORT.base;
  return `--x:${(point.x - viewport.sourceX) / viewport.width * 100}%;--y:${point.y / viewport.height * 100}%`;
}

export const BASE_IDOL_SLOTS: readonly BoardPoint[] = [
  { x: 865, y: 63 }, { x: 930, y: 63 }, { x: 997, y: 63 }, { x: 1064, y: 63 },
];
export const LEADER_LAYOUT = {
  falconer: { eagleTrack: [{ x: 286, y: 49 }, { x: 360, y: 65 }, { x: 439, y: 65 }, { x: 519, y: 65 }, { x: 600, y: 65 }] },
  // Calibrated in the browser collector against leader-explorer.jpg.
  explorer: { snacks: { free: { x: 766, y: 55 }, coin: { x: 766, y: 162 }, compass: { x: 765, y: 271 } } },
  professor: { suitcase: { x: 43, y: 296 } },
} as const;

type ResearchLanes = Readonly<{ magnifying: readonly BoardPoint[]; journal: readonly BoardPoint[] }>;
const rightRail = (magnifyingY: readonly number[], journalY: readonly number[]): ResearchLanes => ({
  magnifying: magnifyingY.map((y) => ({ x: 808, y })),
  journal: journalY.map((y) => ({ x: 808, y })),
});
export const RESEARCH_LANES: Record<ResearchBoardId, ResearchLanes> = {
  bird: rightRail([2578, 2358, 2140, 1921, 1701, 1482, 1263, 1044], [2652, 2432, 2213, 1994, 1775, 1556, 1337, 1118]),
  snake: rightRail([2578, 2358, 2140, 1921, 1701, 1482, 1263, 1044], [2652, 2432, 2213, 1994, 1775, 1556, 1337, 1118]),
  monkey: rightRail([2580, 2363, 2148, 1933, 1718, 1503, 1288, 1073, 858], [2653, 2438, 2223, 2008, 1793, 1578, 1363, 1148, 933]),
  lizard: rightRail([2578, 2358, 2140, 1921, 1701, 1482, 1263, 1044], [2652, 2432, 2213, 1994, 1775, 1556, 1337, 1118]),
};
export function researchTokenPoint(board: ResearchBoardId, kind: 'magnifying' | 'journal', progress: number): BoardPoint {
  const lane = RESEARCH_LANES[board][kind];
  return lane[Math.max(0, Math.min(lane.length - 1, progress))]!;
}
