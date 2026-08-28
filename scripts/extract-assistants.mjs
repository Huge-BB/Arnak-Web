import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const sourceDir = join(repoRoot, 'objects', 'Assistants.538a5c');
const outputPath = join(repoRoot, 'web/src/generated/assistants.json');

function getImage(ttsObject) {
  const cardId = Number(ttsObject.CardID);
  if (!Number.isInteger(cardId)) throw new Error(`Assistant ${ttsObject.GUID} has no valid CardID`);
  const deckId = String(Math.floor(cardId / 100));
  const deck = ttsObject.CustomDeck?.[deckId];
  if (!deck) throw new Error(`Assistant ${ttsObject.GUID} missing CustomDeck ${deckId}`);
  const cardIndex = cardId % 100;
  const count = Number(deck.NumWidth) * Number(deck.NumHeight);
  if (cardIndex < 0 || cardIndex >= count) throw new Error(`Assistant ${ttsObject.GUID} has invalid card index ${cardIndex}`);
  if (!deck.FaceURL || !deck.BackURL) throw new Error(`Assistant ${ttsObject.GUID} is missing silver/gold artwork`);
  return {
    silverUrl: deck.FaceURL,
    goldUrl: deck.BackURL,
    sheetWidth: Number(deck.NumWidth),
    sheetHeight: Number(deck.NumHeight),
    cardIndex,
    uniqueBack: Boolean(deck.UniqueBack),
  };
}

const assistants = {};
const files = (await readdir(sourceDir)).filter(name => name.endsWith('.json')).sort();
for (const file of files) {
  const object = JSON.parse(await readFile(join(sourceDir, file), 'utf8'));
  if (!object.GUID || !object.Tags?.includes('assistant')) continue;
  if (assistants[object.GUID]) throw new Error(`Duplicate assistant GUID ${object.GUID}`);
  assistants[object.GUID] = {
    id: object.GUID,
    expansion: 'Base Game',
    image: getImage(object),
  };
}

if (Object.keys(assistants).length !== 12) {
  throw new Error(`Expected 12 base-game assistants, found ${Object.keys(assistants).length}`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(assistants, null, 2)}\n`);
console.log(`Extracted ${Object.keys(assistants).length} base-game assistants to ${outputPath}`);
