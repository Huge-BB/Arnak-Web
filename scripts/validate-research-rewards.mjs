import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generated = JSON.parse(await readFile(resolve(root, 'src/generated/research-tracks.json'), 'utf8'));
const manual = JSON.parse(await readFile(resolve(root, 'data/research-rewards-manual.json'), 'utf8'));
const boardIds = ['bird', 'snake', 'monkey', 'lizard'];
const resources = new Set(['coin', 'compass', 'tablet', 'arrowhead', 'jewel']);
const simpleChoiceTypes = new Set([
  'ACQUIRE_ARTIFACT_FREE',
  'OVERCOME_GUARDIAN_FREE',
  'ACTIVATE_DISCOVERED_LEVEL1_SITE',
  'ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM',
  'CLAIM_SNAKE_RESCUE_ASSISTANT',
  'REFRESH_ASSISTANT',
  'BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL',
  'EXILE_OWN_CARD',
  'BONUS_TILE',
]);

function validateReward(reward, label) {
  if (!reward || typeof reward !== 'object' || typeof reward.type !== 'string') throw new Error(`${label}: reward must have a string type`);
  if (reward.type === 'GAIN_RESOURCE') {
    if (!resources.has(reward.resource)) throw new Error(`${label}: unsupported resource ${reward.resource}`);
    if (!Number.isInteger(reward.amount) || reward.amount < 0) throw new Error(`${label}: invalid amount`);
  } else if (reward.type === 'DRAW_CARD' || reward.type === 'GAIN_FEAR_CARD') {
    if (!Number.isInteger(reward.amount) || reward.amount < 0) throw new Error(`${label}: invalid amount`);
  } else if (reward.type === 'CLAIM_ASSISTANT') {
    if (reward.level !== 'silver') throw new Error(`${label}: CLAIM_ASSISTANT level must be silver`);
  } else if (reward.type === 'UPGRADE_ASSISTANT') {
    if (reward.level !== 'gold') throw new Error(`${label}: UPGRADE_ASSISTANT level must be gold`);
  } else if (reward.type === 'UPGRADE_AND_REFRESH_ASSISTANT') {
    if (reward.level !== 'gold') throw new Error(`${label}: UPGRADE_AND_REFRESH_ASSISTANT level must be gold`);
  } else if (reward.type === 'REFRESH_ASSISTANTS') {
    if (reward.amount !== 'all' && (!Number.isInteger(reward.amount) || reward.amount < 0)) throw new Error(`${label}: invalid assistant refresh amount`);
  } else if (reward.type === 'BUY_ARTIFACT_WITH_DISCOUNT') {
    if (!Number.isInteger(reward.discount) || reward.discount < 0) throw new Error(`${label}: invalid Artifact discount`);
  } else if (reward.type === 'SEQUENCE') {
    if (!Array.isArray(reward.rewards) || reward.rewards.length === 0) throw new Error(`${label}: SEQUENCE requires rewards`);
    reward.rewards.forEach((child, index) => validateReward(child, `${label}.rewards[${index}]`));
  } else if (reward.type === 'CHOOSE') {
    if (!Number.isInteger(reward.count) || reward.count <= 0) throw new Error(`${label}: CHOOSE count must be positive`);
    if (!Array.isArray(reward.options) || reward.options.length < reward.count) throw new Error(`${label}: CHOOSE options do not cover count`);
    reward.options.forEach((child, index) => validateReward(child, `${label}.options[${index}]`));
  } else if (reward.type === 'TEMPLE_SPECIAL') {
    if (typeof reward.code !== 'string' || reward.code.length === 0) throw new Error(`${label}: TEMPLE_SPECIAL requires code`);
  } else if (!simpleChoiceTypes.has(reward.type)) {
    throw new Error(`${label}: unsupported reward type ${reward.type}`);
  }
}

if (manual.$schemaVersion !== 2) throw new Error('research-rewards-manual.json must use schema version 2');
let verified = 0;
let total = 0;
for (const boardId of boardIds) {
  const track = generated[boardId];
  if (!track) throw new Error(`Missing generated research track: ${boardId}`);
  const rows = new Set(track.rows.map((_, index) => `${boardId}:r${index}`));
  const nodes = new Set(track.rows.flatMap(row => row.nodes ?? []).map(node => node.id));
  const entries = manual.boards?.[boardId]?.rewards ?? [];
  const seen = new Set();
  for (const entry of entries) {
    total += 1;
    const hasRow = typeof entry.row === 'string';
    const hasNode = typeof entry.node === 'string';
    if (hasRow === hasNode) throw new Error(`${boardId}: reward entry must specify exactly one of row or node`);
    const target = entry.row ?? entry.node;
    if (hasRow && !rows.has(target)) throw new Error(`${boardId}: unknown reward row ${target}`);
    if (hasNode && !nodes.has(target)) throw new Error(`${boardId}: unknown reward node ${target}`);
    if (!['magnifying', 'journal'].includes(entry.token)) throw new Error(`${boardId}:${target}: invalid token ${entry.token}`);
    const key = `${target}:${entry.token}`;
    if (seen.has(key)) throw new Error(`${boardId}: duplicate reward entry ${key}`);
    seen.add(key);
    if (!Array.isArray(entry.rewards)) throw new Error(`${boardId}:${key}: rewards must be an array`);
    entry.rewards.forEach((reward, index) => validateReward(reward, `${boardId}:${key}.rewards[${index}]`));
    if (entry.verified === true) {
      if (typeof entry.source !== 'string' || entry.source.trim().length === 0) throw new Error(`${boardId}:${key}: verified reward entries require a source`);
      verified += 1;
    }
  }
}
console.log(`Research reward data valid: ${verified}/${total} entries verified.`);
