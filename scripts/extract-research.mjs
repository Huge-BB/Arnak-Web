import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const sourcePath = join(repoRoot, 'src/ResearchTrackData.ttslua');
const outputPath = join(repoRoot, 'web/src/generated/research-tracks.json');
const checklistPath = join(repoRoot, 'web/data/research-bridges.generated.json');
const lua = await readFile(sourcePath, 'utf8');

function sectionBetween(startMarker, endMarker) {
  const start = lua.indexOf(startMarker);
  const end = lua.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate ${startMarker} section`);
  return lua.slice(start, end);
}
function sectionFrom(startMarker) {
  const start = lua.indexOf(startMarker);
  if (start < 0) throw new Error(`Could not locate ${startMarker} section`);
  return lua.slice(start);
}
function extractBalancedBlock(text, startIndex) {
  const open = text.indexOf('{', startIndex);
  if (open < 0) throw new Error('Expected opening brace');
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error('Unbalanced Lua table');
}
function extractRowsBlock(section) {
  const match = /\brows\s*=/.exec(section);
  if (!match) throw new Error('Missing rows table');
  return extractBalancedBlock(section, match.index);
}
function splitTopLevelTables(block) {
  const result = [];
  let depth = 0;
  let start = -1;
  for (let i = 1; i < block.length - 1; i += 1) {
    const ch = block[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        result.push(block.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return result;
}
function coordinates(text) {
  return [...text.matchAll(/\{\s*(-?\d+(?:\.\d+)?)\s*,\s*-?\d+(?:\.\d+)?\s*,\s*(-?\d+(?:\.\d+)?)/g)]
    .map(match => `${Number(match[1]).toFixed(2)},${Number(match[2]).toFixed(2)}`);
}
function extractBonusMinimums(section) {
  const match = /\bbonusPositions\s*=/.exec(section);
  if (!match) return new Map();
  const groups = splitTopLevelTables(extractBalancedBlock(section, match.index));
  const minimums = new Map();
  // TTS setup: list 1 is always dealt, list 2 is 3+ players, list 3 is 4 players.
  groups.slice(0, 3).forEach((group, index) => {
    const minimum = index === 0 ? 1 : index + 2;
    for (const coordinate of coordinates(group)) minimums.set(coordinate, minimum);
  });
  return minimums;
}
function extractPaths(rowBlock, bonusMinimums) {
  const marker = rowBlock.indexOf('paths =');
  if (marker < 0) return [];
  const pathsBlock = extractBalancedBlock(rowBlock, marker);
  return splitTopLevelTables(pathsBlock).map((pathBlock) => {
    const match = pathBlock.match(/forward\s*=\s*\{\s*([\d,\s]+)\}/);
    const forwards = match
      ? match[1].split(',').map(value => Number(value.trim())).filter(Number.isFinite).map(oneBased => oneBased - 1)
      : [];
    const matchingMinimums = coordinates(pathBlock).map(coordinate => bonusMinimums.get(coordinate)).filter(value => value !== undefined);
    return {
      forwards,
      bonusSlot: /bonus\s*=\s*true/.test(pathBlock) || /bonusPos\s*=/.test(pathBlock),
      bonusMinPlayers: matchingMinimums.length ? Math.min(...matchingMinimums) : undefined,
      bonusSlotMinimums: matchingMinimums,
    };
  });
}
function nodeId(boardId, rowIndex, pathIndex) {
  return `${boardId}:r${rowIndex}:p${pathIndex}`;
}
function extractTrack(name, section) {
  const boardId = name.toLowerCase();
  const bonusMinimums = extractBonusMinimums(section);
  const rawRows = splitTopLevelTables(extractRowsBlock(section));
  const scoredRows = rawRows.filter(row => /magnifying\s*=/.test(row));
  if (scoredRows.length === 0) throw new Error(`${name} has no scored research rows`);

  const rowsTopDown = scoredRows.map((rowBlock) => {
    const magnifyingMatch = rowBlock.match(/magnifying\s*=\s*(\d+)/);
    const journalMatch = rowBlock.match(/journal\s*=\s*(\d+)/);
    if (!magnifyingMatch || !journalMatch) throw new Error(`${name} row missing score data`);
    const paths = extractPaths(rowBlock, bonusMinimums);
    return {
      magnifyingPoints: Number(magnifyingMatch[1]),
      journalPoints: Number(journalMatch[1]),
      grantsAssistant: /assistant\s*=\s*true/.test(rowBlock),
      paths,
    };
  });

  const rows = [...rowsTopDown].reverse().map((row, rowIndex) => ({
    magnifyingPoints: row.magnifyingPoints,
    journalPoints: row.journalPoints,
    grantsAssistant: row.grantsAssistant,
    nodes: row.paths.map((path, pathIndex) => ({
      id: nodeId(boardId, rowIndex, pathIndex),
      rowIndex,
      pathIndex,
      researchLevel: rowIndex,
      ...(path.bonusSlot ? { metadata: { bonusSlot: true, bonusMinPlayers: path.bonusMinPlayers ?? 1, bonusSlotMinimums: path.bonusSlotMinimums.length ? path.bonusSlotMinimums : [path.bonusMinPlayers ?? 1] } } : {}),
    })),
  }));

  const bridges = [];
  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex += 1) {
    const originalSource = rowsTopDown[rowsTopDown.length - 1 - rowIndex];
    originalSource.paths.forEach((path, pathIndex) => {
      for (const targetPathIndex of path.forwards) {
        bridges.push({
          id: `${nodeId(boardId, rowIndex, pathIndex)}->${nodeId(boardId, rowIndex + 1, targetPathIndex)}`,
          from: nodeId(boardId, rowIndex, pathIndex),
          to: nodeId(boardId, rowIndex + 1, targetPathIndex),
        });
      }
    });
  }
  for (let pathIndex = 0; pathIndex < rows[0].nodes.length; pathIndex += 1) {
    bridges.unshift({ id: `${boardId}:start->${nodeId(boardId, 0, pathIndex)}`, from: `${boardId}:start`, to: nodeId(boardId, 0, pathIndex) });
  }
  return { id: boardId, name, rows, bridges };
}

const result = {
  bird: extractTrack('Bird', sectionBetween('-- Bird Temple', '-- Snake Temple')),
  snake: extractTrack('Snake', sectionBetween('-- Snake Temple', '-- Monkey Temple')),
  monkey: extractTrack('Monkey', sectionBetween('-- Monkey Temple', '-- Lizard Temple')),
  lizard: extractTrack('Lizard', sectionFrom('-- Lizard Temple')),
};

const checklist = {
  $schemaVersion: 3,
  notes: [
    'Generated from ResearchTrackData.ttslua. Do not edit topology here by hand.',
    'bonusSlot metadata is extracted from TTS bonus=true/bonusPos markers; bonusMinPlayers mirrors TTS setup lists.',
    'Bird/Snake manual overlays contain verified base-game costs. Monkey/Lizard special rules are temple-specific.',
    'researchLevel defaults to rowIndex. Override only when one printed space spans/skips logical levels.',
  ],
  boards: Object.fromEntries(Object.entries(result).map(([boardId, track]) => [boardId, {
    templeArrivalPoints: [0, 0, 0, 0],
    nodes: track.rows.flatMap(row => row.nodes).map(node => ({ ...node, verified: false })),
    bridges: track.bridges.map(bridge => ({ ...bridge, cost: {}, rewards: [], verified: false })),
  }])),
};

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(checklistPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(checklistPath, `${JSON.stringify(checklist, null, 2)}\n`);
console.log(`Extracted ${Object.keys(result).length} research tracks to ${outputPath}`);
console.log(`Generated research bridge checklist at ${checklistPath}`);
