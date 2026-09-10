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
/** Physical Temple-tile supply anchors. All clients consume this one triangle
 * instead of carrying divergent vertical fallback layouts. The collector may
 * still override every named piece. */
export const RESEARCH_TEMPLE_TILE_COMPONENTS = {
  '11': { x: 226, y: 195, width: 210, height: 94 },
  '6a': { x: 166, y: 302, width: 210, height: 94 },
  '6b': { x: 286, y: 302, width: 210, height: 94 },
  '2a': { x: 106, y: 409, width: 210, height: 94 },
  '2b': { x: 226, y: 409, width: 210, height: 94 },
  '2c': { x: 346, y: 409, width: 210, height: 94 },
} as const;
/** Native pixel space of the full Supply Board export. */
export const SUPPLY_BOARD_SIZE: BoardSize = { width: 3906, height: 1507 };
/**
 * Supply-board component rectangles in its native image space.  Keeping the
 * defaults here (rather than in viewport units) means browser zoom can only
 * scale the whole board, never reflow individual piles.
 */
export const SUPPLY_BOARD_COMPONENTS = {
  assistants: [
    { x: 2806.0, y: 452.85, width: 316, height: 409 },
    { x: 3227.85, y: 452.85, width: 316, height: 409 },
    { x: 3649.70, y: 452.85, width: 316, height: 409 },
  ],
  resources: {
    coin: { x: 507.78, y: 1145.32, width: 250, height: 250 },
    compass: { x: 1445.22, y: 1145.32, width: 250, height: 250 },
    tablet: { x: 1874.88, y: 1145.32, width: 250, height: 250 },
    arrowhead: { x: 2421.72, y: 1145.32, width: 250, height: 250 },
    jewel: { x: 2890.44, y: 1145.32, width: 250, height: 250 },
  },
  researchStarts: {
    magnifying: { x: 2812.32, y: 105.49, width: 90, height: 90 },
    journal: { x: 3124.8, y: 105.49, width: 90, height: 90 },
  },
} as const;
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
  { x: 879, y: 75 }, { x: 944, y: 75 }, { x: 1011, y: 75 }, { x: 1078, y: 75 },
];
/** The five printed idol-effect panels down the left side of a base board. */
export const BASE_IDOL_EFFECTS = [
  { effect: 'coinToJewel', point: { x: 767, y: 47 } },
  { effect: 'arrowhead', point: { x: 767, y: 85 } },
  { effect: 'tablets', point: { x: 767, y: 120 } },
  { effect: 'coinCompass', point: { x: 767, y: 156 } },
  { effect: 'draw', point: { x: 767, y: 194 } },
] as const;
/** Printed idol-effect icons on leader boards.  They are action targets;
 * slots are only the left-to-right record of idols already spent. */
export const LEADER_IDOL_EFFECT_LAYOUT = {
  standard: [
    { effect: 'coinToJewel', point: { x: 260, y: 31 } },
    { effect: 'arrowhead', point: { x: 260, y: 75 } },
    { effect: 'tablets', point: { x: 260, y: 115 } },
    { effect: 'coinCompass', point: { x: 260, y: 157 } },
    { effect: 'draw', point: { x: 260, y: 198 } },
  ],
  mysticStandard: [
    { effect: 'coinToJewel', point: { x: 535, y: 31 } },
    { effect: 'arrowhead', point: { x: 535, y: 75 } },
    { effect: 'tablets', point: { x: 535, y: 115 } },
    { effect: 'coinCompass', point: { x: 535, y: 157 } },
    { effect: 'draw', point: { x: 535, y: 198 } },
  ],
  unique: { point: { x: 260, y: 254 } },
  mysticArrowhead: { point: { x: 535, y: 246 } },
  mysticRitual: { point: { x: 535, y: 281 } },
} as const;
export const LEADER_LAYOUT = {
  // These anchors use the original 1270x328 leader-board artwork.  They are
  // intentionally mirrored in the calibration collector under the named
  // `leader-<leader>-…` marks, so visual adjustment never changes rules.
  captain: { idolSlots: [{ x: 369, y: 54 }, { x: 439, y: 54 }, { x: 519, y: 54 }, { x: 594, y: 54 }], specialist: { x: 366, y: 260 } },
  falconer: { idolSlots: [{ x: 369, y: 54 }, { x: 439, y: 54 }, { x: 519, y: 54 }, { x: 594, y: 54 }], eagleTrack: [{ x: 286, y: 49 }, { x: 360, y: 65 }, { x: 439, y: 65 }, { x: 519, y: 65 }, { x: 600, y: 65 }] },
  baroness: { idolSlots: [{ x: 369, y: 54 }, { x: 439, y: 54 }, { x: 519, y: 54 }, { x: 594, y: 54 }] },
  professor: { idolSlots: [{ x: 369, y: 54 }, { x: 439, y: 54 }, { x: 519, y: 54 }, { x: 594, y: 54 }], suitcase: { x: 43, y: 296 } },
  // Calibrated in the browser collector against leader-explorer.jpg.
  explorer: { idolSlots: [{ x: 369, y: 54 }, { x: 439, y: 54 }, { x: 519, y: 54 }, { x: 594, y: 54 }], snacks: { free: { x: 766, y: 55 }, coin: { x: 766, y: 162 }, compass: { x: 765, y: 271 } } },
  mystic: { idolSlots: [{ x: 652, y: 54 }, { x: 724, y: 54 }, { x: 806, y: 54 }, { x: 877, y: 54 }, { x: 950, y: 54 }], ritualEffects: [{ fearCount: 2, point: { x: 112, y: 232 } }, { fearCount: 3, point: { x: 112, y: 254 } }, { fearCount: 4, point: { x: 112, y: 278 } }] },
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
/** Printed starting cradles below the first research row.  These remain
 * separate from row zero: a first advance must visibly leave the cradle. */
export const RESEARCH_START_POINTS: Record<ResearchBoardId, { magnifying: BoardPoint; journal: BoardPoint }> = {
  bird: { magnifying: { x: 772, y: 2658 }, journal: { x: 844, y: 2658 } },
  snake: { magnifying: { x: 772, y: 2658 }, journal: { x: 844, y: 2658 } },
  monkey: { magnifying: { x: 772, y: 2658 }, journal: { x: 844, y: 2658 } },
  lizard: { magnifying: { x: 772, y: 2658 }, journal: { x: 844, y: 2658 } },
};
export function researchTokenPoint(board: ResearchBoardId, kind: 'magnifying' | 'journal', progress: number): BoardPoint {
  const lane = RESEARCH_LANES[board][kind];
  return lane[Math.max(0, Math.min(lane.length - 1, progress))]!;
}
