import type { ResearchBoardId, ResearchReward, ResearchToken, ResearchTrackDefinition } from './types.ts';

export interface ResearchRewardManualEntry {
  row?: string;
  node?: string;
  token: ResearchToken;
  rewards: ResearchReward[];
  verified: boolean;
  /** Human-auditable provenance, required for entries marked verified. */
  source?: string;
  needsTokenAccessCheck?: boolean;
  comment?: string;
}

export interface ResearchRewardManualData {
  $schemaVersion: 2;
  boards: Partial<Record<ResearchBoardId, { rewards: ResearchRewardManualEntry[] }>>;
}

function allNodes(track: ResearchTrackDefinition) {
  return track.rows.flatMap(row => row.nodes ?? []);
}

function rowId(boardId: string, rowIndex: number) {
  return `${boardId}:r${rowIndex}`;
}

function entryKey(entry: ResearchRewardManualEntry) {
  const target = entry.node ?? entry.row;
  return `${target}:${entry.token}`;
}

function validateEntry(entry: ResearchRewardManualEntry, boardId: string) {
  const hasRow = typeof entry.row === 'string';
  const hasNode = typeof entry.node === 'string';
  if (hasRow === hasNode) throw new Error(`${boardId}: research reward entry must specify exactly one of row or node`);
}

export function applyResearchRewardManualData(
  track: ResearchTrackDefinition,
  manual: ResearchRewardManualData | undefined,
  options: { requireVerified?: boolean } = {},
): ResearchTrackDefinition {
  if (!manual) return track;
  const board = manual.boards[track.id];
  if (!board) return track;
  const next = structuredClone(track);
  const nodes = new Map(allNodes(next).map(node => [node.id, node]));
  const rows = new Map(next.rows.map((row, index) => [rowId(String(track.id), index), row.nodes ?? []]));
  const seen = new Set<string>();

  // Row entries establish defaults for every node in that row.
  for (const entry of board.rewards.filter(value => value.row !== undefined)) {
    validateEntry(entry, String(track.id));
    const key = entryKey(entry);
    if (seen.has(key)) throw new Error(`Duplicate research reward entry: ${key}`);
    seen.add(key);
    const rowNodes = rows.get(entry.row!);
    if (!rowNodes) throw new Error(`Research reward row does not exist in ${track.id} topology: ${entry.row}`);
    if (options.requireVerified && !entry.verified) throw new Error(`Research reward is not verified: ${key}`);
    if (!entry.verified && entry.rewards.length === 0) continue;
    for (const node of rowNodes) {
      node.rewards ??= [];
      const existing = node.rewards.find(reward => reward.token === entry.token);
      if (existing) {
        existing.rewards = structuredClone(entry.rewards);
        existing.verified = entry.verified;
      } else {
        node.rewards.push({ token: entry.token, rewards: structuredClone(entry.rewards), verified: entry.verified });
      }
    }
  }

  // Node entries override the row default for Spider-style per-space differences.
  for (const entry of board.rewards.filter(value => value.node !== undefined)) {
    validateEntry(entry, String(track.id));
    const key = entryKey(entry);
    if (seen.has(key)) throw new Error(`Duplicate research reward entry: ${key}`);
    seen.add(key);
    const node = nodes.get(entry.node!);
    if (!node) throw new Error(`Research reward node does not exist in ${track.id} topology: ${entry.node}`);
    if (options.requireVerified && !entry.verified) throw new Error(`Research reward is not verified: ${key}`);
    if (!entry.verified && entry.rewards.length === 0) continue;
    node.rewards ??= [];
    const existing = node.rewards.find(reward => reward.token === entry.token);
    if (existing) {
      existing.rewards = structuredClone(entry.rewards);
      existing.verified = entry.verified;
    } else {
      node.rewards.push({ token: entry.token, rewards: structuredClone(entry.rewards), verified: entry.verified });
    }
  }
  return next;
}
