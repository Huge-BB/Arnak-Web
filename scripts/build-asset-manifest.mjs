import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const generatedDir = join(repoRoot, 'web/src/generated');
const outputPath = join(repoRoot, 'web/data/assets-manifest.json');

const SOURCES = [
  ['card', 'cards.json'],
  ['site', 'sites.json'],
  ['idol', 'idols.json'],
  ['guardian', 'guardians.json'],
  ['assistant', 'assistants.json'],
];

function sheetId(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 20);
}

function assertGrid(width, height, label) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error(`${label} has invalid sprite grid ${width}x${height}`);
  }
}

function addGridReference(sheet, sheetWidth, sheetHeight) {
  const key = `${sheetWidth}x${sheetHeight}`;
  if (!sheet.grids.some(grid => `${grid.sheetWidth}x${grid.sheetHeight}` === key)) {
    sheet.grids.push({ sheetWidth, sheetHeight });
  }
}

function addAsset(assets, sheets, { key, kind, id, side, url, sheetWidth, sheetHeight, cardIndex }) {
  if (!url) return;
  assertGrid(sheetWidth, sheetHeight, key);
  const count = sheetWidth * sheetHeight;
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= count) {
    throw new Error(`${key} has invalid sprite index ${cardIndex} for ${sheetWidth}x${sheetHeight}`);
  }
  const idHash = sheetId(url);
  const existing = sheets.get(idHash);
  if (existing && existing.url !== url) throw new Error(`Asset sheet hash collision: ${idHash}`);
  if (existing) {
    // TTS can reuse the exact same image URL while declaring different CustomDeck grids.
    // The downloaded file is still shared; grid interpretation belongs to each asset reference.
    addGridReference(existing, sheetWidth, sheetHeight);
  } else {
    sheets.set(idHash, {
      id: idHash,
      url,
      grids: [{ sheetWidth, sheetHeight }],
    });
  }
  assets.push({ key, kind, id, side, sheetId: idHash, sheetWidth, sheetHeight, cardIndex });
}

const assets = [];
const sheets = new Map();
for (const [kind, filename] of SOURCES) {
  const path = join(generatedDir, filename);
  let records;
  try {
    records = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Missing ${path}. Run npm run extract:data first.`);
    throw error;
  }
  for (const [id, record] of Object.entries(records)) {
    if (kind === 'assistant') {
      const image = record.image;
      if (!image) continue;
      addAsset(assets, sheets, { key:`assistant:${id}:silver`, kind, id, side:'silver', url:image.silverUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
      addAsset(assets, sheets, { key:`assistant:${id}:gold`, kind, id, side:'gold', url:image.goldUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
      continue;
    }
    const image = record.image;
    if (!image) continue;
    addAsset(assets, sheets, { key:`${kind}:${id}:face`, kind, id, side:'face', url:image.faceUrl, sheetWidth:image.sheetWidth, sheetHeight:image.sheetHeight, cardIndex:image.cardIndex });
    // TTS needs a per-object reverse texture; the web client renders card backs
    // by card category and does not need to crop hundreds of duplicate backs.
  }
}

assets.sort((a,b)=>a.key.localeCompare(b.key));
const manifest = {
  version: 1,
  generatedFrom: SOURCES.map(([,filename])=>`web/src/generated/${filename}`),
  sheets: [...sheets.values()]
    .map(sheet => ({ ...sheet, grids: sheet.grids.sort((a,b)=>(a.sheetWidth*a.sheetHeight)-(b.sheetWidth*b.sheetHeight) || a.sheetWidth-b.sheetWidth) }))
    .sort((a,b)=>a.id.localeCompare(b.id)),
  assets,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Asset manifest: ${manifest.assets.length} sprite references across ${manifest.sheets.length} unique image URLs`);
const multiGrid = manifest.sheets.filter(sheet => sheet.grids.length > 1);
if (multiGrid.length) console.log(`Note: ${multiGrid.length} image URL(s) are referenced with multiple TTS sprite grids; per-asset grids are preserved.`);
console.log(`Wrote ${outputPath}`);
