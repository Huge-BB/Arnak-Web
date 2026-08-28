import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const cardsDir = join(repoRoot, 'objects/AllCards.4bfea4');
const outputPath = join(repoRoot, 'web/src/generated/cards.json');

const SUPPORTED_TYPES = new Set(['Item', 'Artifact', 'Fear', 'Starter']);
const TRAVEL_KEYS = ['boot', 'car', 'boat', 'plane'];

function normalizeType(type) {
  return SUPPORTED_TYPES.has(type) ? type : 'Other';
}

function normalizeCardName(name) {
  // The TTS object has a known typo; use the printed/engine rule name.
  return name === 'Wordly Goods' ? 'Worldly Goods' : name;
}

function parseTravel(metadata) {
  const travel = {};
  for (const key of TRAVEL_KEYS) {
    if (Number.isInteger(metadata[key]) && metadata[key] > 0) travel[key] = metadata[key];
  }
  return Object.keys(travel).length ? travel : undefined;
}

function getImage(ttsObject) {
  const deckEntries = Object.entries(ttsObject.CustomDeck ?? {});
  if (deckEntries.length === 0) return undefined;

  const cardId = Number(ttsObject.CardID);
  if (!Number.isInteger(cardId)) return undefined;

  // TTS CardID is customDeckId * 100 + zero-based sprite-sheet index.
  const deckId = Math.floor(cardId / 100);
  const deck = ttsObject.CustomDeck[String(deckId)];
  if (!deck) {
    throw new Error(`CardID ${cardId} points at missing CustomDeck ${deckId}`);
  }

  const cardIndex = cardId % 100;
  const sheetWidth = Number(deck.NumWidth);
  const sheetHeight = Number(deck.NumHeight);
  if (!deck.FaceURL || !Number.isInteger(sheetWidth) || !Number.isInteger(sheetHeight)) {
    throw new Error(`Incomplete CustomDeck ${deckId} image metadata`);
  }
  if (cardIndex < 0 || cardIndex >= sheetWidth * sheetHeight) {
    throw new Error(`CardID ${cardId} has sprite index ${cardIndex} outside ${sheetWidth}x${sheetHeight} sheet`);
  }

  return {
    faceUrl: deck.FaceURL,
    ...(deck.BackURL ? { backUrl: deck.BackURL } : {}),
    sheetWidth,
    sheetHeight,
    cardIndex,
  };
}

const files = await readdir(cardsDir);
const metadataFiles = files.filter(name => name.endsWith('.gmnotes')).sort();
const cards = {};
const stats = { Item: 0, Artifact: 0, Fear: 0, Starter: 0, Other: 0 };

for (const metadataFile of metadataFiles) {
  const metadataPath = join(cardsDir, metadataFile);
  const objectPath = join(cardsDir, metadataFile.replace(/\.gmnotes$/, '.json'));
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const ttsObject = JSON.parse(await readFile(objectPath, 'utf8'));

  if (!metadata.id) throw new Error(`${metadataFile} is missing card id`);
  if (cards[metadata.id]) throw new Error(`Duplicate card id ${metadata.id} in ${metadataFile}`);

  const type = normalizeType(metadata.type);
  const travel = parseTravel(metadata);
  const image = getImage(ttsObject);

  cards[metadata.id] = {
    id: metadata.id,
    name: normalizeCardName(ttsObject.Nickname || basename(metadataFile, '.gmnotes')),
    type,
    expansion: metadata.expansion ?? 'Unknown',
    ...(metadata.color ? { color: metadata.color } : {}),
    ...(Number.isFinite(metadata.cost) ? { cost: metadata.cost } : {}),
    ...(Number.isFinite(metadata.points) ? { points: metadata.points } : {}),
    ...(travel ? { travel } : {}),
    ...(image ? { image } : {}),
  };
  stats[type] += 1;
}

const orderedCards = Object.fromEntries(
  Object.entries(cards).sort(([left], [right]) => left.localeCompare(right)),
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(orderedCards, null, 2)}\n`);
console.log(`Extracted ${Object.keys(orderedCards).length} cards to ${outputPath}`);
console.log(`Types: ${Object.entries(stats).map(([type, count]) => `${type}=${count}`).join(', ')}`);
