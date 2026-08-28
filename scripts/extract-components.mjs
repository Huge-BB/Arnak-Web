import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');

function getImage(ttsObject) {
  const entries = Object.values(ttsObject.CustomDeck ?? {});
  if (entries.length !== 1) throw new Error(`Expected exactly one CustomDeck entry for ${ttsObject.GUID}`);
  const deck = entries[0];
  const cardIndex = Number(ttsObject.CardID) % 100;
  const count = Number(deck.NumWidth) * Number(deck.NumHeight);
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= count) throw new Error(`Invalid card index ${cardIndex} for ${ttsObject.GUID}`);
  return {
    faceUrl: deck.FaceURL,
    ...(deck.BackURL ? { backUrl: deck.BackURL } : {}),
    sheetWidth: deck.NumWidth,
    sheetHeight: deck.NumHeight,
    cardIndex,
  };
}

async function extractDirectory(directoryName, tag, mapObject) {
  const directory = join(repoRoot, 'objects', directoryName);
  const result = {};
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.json')).sort()) {
    const object = JSON.parse(await readFile(join(directory, file), 'utf8'));
    if (!object.GUID || !object.Tags?.includes(tag)) continue;
    if (result[object.GUID]) throw new Error(`Duplicate ${tag} GUID ${object.GUID}`);
    result[object.GUID] = mapObject(object);
  }
  return result;
}

const idols = await extractDirectory('Idols.ab4a80', 'idol', object => ({
  id: object.GUID,
  rewardCode: object.GMNotes ?? '',
  expansion: 'Base Game',
  image: getImage(object),
}));

const guardians = await extractDirectory('Guardians.e09a6d', 'guardian', object => ({
  id: object.GUID,
  expansion: 'Base Game',
  image: getImage(object),
}));

const generated = join(repoRoot, 'web/src/generated');
await mkdir(generated, { recursive: true });
await writeFile(join(generated, 'idols.json'), `${JSON.stringify(idols, null, 2)}\n`);
await writeFile(join(generated, 'guardians.json'), `${JSON.stringify(guardians, null, 2)}\n`);
console.log(`Extracted ${Object.keys(idols).length} idols and ${Object.keys(guardians).length} guardians`);
