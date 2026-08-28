import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const manifestPath = join(repoRoot, 'web/data/assets-manifest.json');
const publicRoot = join(repoRoot, 'web/public/assets');
const sheetDir = join(publicRoot, 'sheets');
const cropDir = join(publicRoot, 'cropped');
const runtimeMapPath = join(repoRoot, 'web/src/generated/local-assets.json');
const publicMapPath = join(publicRoot, 'asset-map.json');
const crop = process.argv.includes('--crop');
const force = process.argv.includes('--force');

const CONTENT_EXT = new Map([
  ['image/jpeg', '.jpg'], ['image/jpg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif'],
]);

function safe(value) { return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_'); }
async function exists(path) { try { await access(path); return true; } catch { return false; } }
function publicUrl(pathWithinAssets) { return `/assets/${pathWithinAssets.replaceAll('\\','/')}`; }
async function existingSheetPath(sheetId) {
  const files = await readdir(sheetDir);
  const filename = files.find(file => file.startsWith(`${sheetId}.`));
  return filename ? join(sheetDir, filename) : undefined;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(sheetDir, { recursive:true });
await mkdir(cropDir, { recursive:true });

let sharp;
if (crop) {
  try { ({ default: sharp } = await import('sharp')); }
  catch { throw new Error('Cropping requires the optional "sharp" package. Run npm install, then retry npm run assets:localize:crop.'); }
}

const sheetFiles = new Map();
for (const sheet of manifest.sheets) {
  let localPath = force ? undefined : await existingSheetPath(sheet.id);
  if (!localPath) {
    const response = await fetch(sheet.url);
    if (!response.ok) throw new Error(`Failed to download ${sheet.url}: HTTP ${response.status}`);
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const extension = CONTENT_EXT.get(contentType) ?? extname(new URL(sheet.url).pathname) ?? '.img';
    localPath = join(sheetDir, `${sheet.id}${extension || '.img'}`);
    if (force || !(await exists(localPath))) {
      const bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(localPath, bytes);
    }
  }
  sheetFiles.set(sheet.id, { localPath, url: publicUrl(`sheets/${localPath.split(/[\\/]/).at(-1)}`) });
}

const localized = {};
for (const asset of manifest.assets) {
  const sheet = manifest.sheets.find(candidate=>candidate.id===asset.sheetId);
  const localSheet = sheetFiles.get(asset.sheetId);
  if (!sheet || !localSheet) throw new Error(`Missing localized sheet ${asset.sheetId}`);
  const entry = {
    key: asset.key,
    kind: asset.kind,
    id: asset.id,
    side: asset.side,
    sheetUrl: localSheet.url,
    sheetWidth: asset.sheetWidth,
    sheetHeight: asset.sheetHeight,
    cardIndex: asset.cardIndex,
  };
  if (crop) {
    const image = sharp(localSheet.localPath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Cannot read image dimensions for ${asset.sheetId}`);
    const column = asset.cardIndex % asset.sheetWidth;
    const row = Math.floor(asset.cardIndex / asset.sheetWidth);
    // Steam can rescale a TTS texture to dimensions that are off by a pixel or
    // two. Derive each cell boundary proportionally so all pixels are covered
    // and adjacent crops never overlap or leave a gap.
    const left = Math.round(column * metadata.width / asset.sheetWidth);
    const right = Math.round((column + 1) * metadata.width / asset.sheetWidth);
    const top = Math.round(row * metadata.height / asset.sheetHeight);
    const bottom = Math.round((row + 1) * metadata.height / asset.sheetHeight);
    const cellWidth = right - left;
    const cellHeight = bottom - top;
    const filename = `${safe(asset.kind)}-${safe(asset.id)}-${safe(asset.side)}.webp`;
    const target = join(cropDir, filename);
    if (force || !(await exists(target))) {
      await sharp(localSheet.localPath)
        .extract({ left, top, width:cellWidth, height:cellHeight })
        .webp({ quality:92 })
        .toFile(target);
    }
    entry.url = publicUrl(`cropped/${filename}`);
    entry.width = cellWidth;
    entry.height = cellHeight;
  }
  localized[asset.key] = entry;
}

const output = {
  version: 1,
  mode: crop ? 'cropped' : 'sprite-sheet',
  sourceManifest: 'web/data/assets-manifest.json',
  assets: localized,
};
await mkdir(join(repoRoot, 'web/src/generated'), { recursive:true });
await writeFile(runtimeMapPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(publicMapPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Localized ${manifest.sheets.length} sheets and ${manifest.assets.length} asset references (${output.mode})`);
console.log(`Runtime map: ${runtimeMapPath}`);
