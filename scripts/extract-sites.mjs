import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const outputPath = join(repoRoot, 'web/src/generated/sites.json');
const sources = [
  { dir: 'Level1Sites.a27f36', level: 1, expansion: 'Base Game' },
  { dir: 'Level2Sites.5ab09c', level: 2, expansion: 'Base Game' },
];

function getImage(ttsObject) {
  const entries = Object.entries(ttsObject.CustomDeck ?? {});
  if (entries.length !== 1) throw new Error(`Expected exactly one CustomDeck entry for ${ttsObject.GUID}`);
  const [deckId, deck] = entries[0];
  const cardId = String(ttsObject.CardID ?? '');
  if (!cardId.startsWith(deckId)) throw new Error(`CardID ${cardId} does not match deck ${deckId}`);
  const cardIndex = Number(cardId.slice(deckId.length));
  const count = Number(deck.NumWidth) * Number(deck.NumHeight);
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= count) throw new Error(`Invalid card index ${cardIndex}`);
  return {
    faceUrl: deck.FaceURL,
    ...(deck.BackURL ? { backUrl: deck.BackURL } : {}),
    sheetWidth: deck.NumWidth,
    sheetHeight: deck.NumHeight,
    cardIndex,
  };
}

const sites = {};
for (const source of sources) {
  const directory = join(repoRoot, 'objects', source.dir);
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  for (const file of files) {
    const object = JSON.parse(await readFile(join(directory, file), 'utf8'));
    if (!object.GUID || !object.Tags?.includes(`site${source.level}`)) continue;
    if (sites[object.GUID]) throw new Error(`Duplicate site GUID ${object.GUID}`);
    sites[object.GUID] = {
      id: object.GUID,
      level: source.level,
      rewardCode: object.GMNotes ?? '',
      expansion: source.expansion,
      image: getImage(object),
    };
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(sites, null, 2)}\n`);
console.log(`Extracted ${Object.keys(sites).length} site tiles to ${outputPath}`);
