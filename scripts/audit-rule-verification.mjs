import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const audit = JSON.parse(await readFile(resolve(root, 'data/rule-audit.json'), 'utf8'));
if (audit.version !== 1 || !Array.isArray(audit.statuses) || !Array.isArray(audit.entries)) {
  throw new Error('rule-audit.json must contain version 1, statuses, and entries');
}

const allowedStatuses = new Set(audit.statuses);
const seenIds = new Set();
const counts = new Map(audit.statuses.map(status => [status, 0]));
for (const entry of audit.entries) {
  if (!entry || typeof entry.id !== 'string' || !entry.id) throw new Error('Each rule audit entry needs a non-empty id');
  if (seenIds.has(entry.id)) throw new Error(`Duplicate rule audit id: ${entry.id}`);
  seenIds.add(entry.id);
  if (typeof entry.title !== 'string' || !entry.title) throw new Error(`${entry.id}: title is required`);
  if (!allowedStatuses.has(entry.status)) throw new Error(`${entry.id}: unsupported status ${entry.status}`);
  for (const field of ['implementation', 'automatedEvidence', 'sourceEvidence']) {
    if (!Array.isArray(entry[field])) throw new Error(`${entry.id}: ${field} must be an array`);
  }
  if (entry.status === 'implemented' || entry.status === 'verified') {
    if (!entry.implementation.length || !entry.automatedEvidence.length) throw new Error(`${entry.id}: implemented rules need implementation and automated evidence`);
  }
  for (const path of [...entry.implementation, ...entry.automatedEvidence].filter(value => !String(value).startsWith('npm '))) {
    if (typeof path !== 'string' || !path) throw new Error(`${entry.id}: evidence paths must be non-empty strings`);
    await access(resolve(root, path));
  }
  if (entry.status === 'verified') {
    if (!entry.sourceEvidence.length) throw new Error(`${entry.id}: verified rules need an authoritative source locator`);
    for (const source of entry.sourceEvidence) {
      if (!source || typeof source.source !== 'string' || !source.source || typeof source.locator !== 'string' || !source.locator) {
        throw new Error(`${entry.id}: each source needs source and locator`);
      }
    }
  }
  counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
}

console.log(`Rule verification audit: ${audit.entries.length} entries (${[...counts].map(([status, count]) => `${status} ${count}`).join(', ')}).`);
