import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Shared player-deck reverse from the TTS CustomDeck metadata.  Do not reuse
// site backs here: they are visually similar stone textures but are different
// physical components and make a player deck indistinguishable from a Level II
// discovery tile.
const catalogPath = resolve(import.meta.dirname, '../src/generated/cards.json');
const output = resolve(import.meta.dirname, '../public/assets/card-back.jpg');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const source = Object.values(catalog).find(card => card?.image?.backUrl)?.image?.backUrl;
if (typeof source !== 'string') throw new Error('No TTS card back URL found in cards.json');
const response = await fetch(source);
if (!response.ok) throw new Error(`Failed to download TTS player-card back: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length < 10_000) throw new Error('Downloaded TTS player-card back is unexpectedly small');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, bytes);
console.log(`Wrote ${output}`);
