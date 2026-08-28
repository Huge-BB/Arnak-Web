import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const manifestPath = join(repoRoot, 'web/data/assets-manifest.json');
const publicRoot = join(repoRoot, 'web/public');
const local = process.argv.includes('--local');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 1) throw new Error(`Unsupported asset manifest version: ${manifest.version}`);
if (!Array.isArray(manifest.sheets) || !Array.isArray(manifest.assets)) throw new Error('Asset manifest must contain sheets and assets arrays');

const sheets = new Map();
for (const sheet of manifest.sheets) {
  if (!sheet.id || !sheet.url) throw new Error('Asset sheet is missing id/url');
  if (sheets.has(sheet.id)) throw new Error(`Duplicate sheet id: ${sheet.id}`);
  if (!Array.isArray(sheet.grids) || sheet.grids.length < 1) throw new Error(`Asset sheet ${sheet.id} is missing grid references`);
  for (const grid of sheet.grids) {
    if (!Number.isInteger(grid.sheetWidth) || grid.sheetWidth < 1 || !Number.isInteger(grid.sheetHeight) || grid.sheetHeight < 1) {
      throw new Error(`Invalid sheet grid on ${sheet.id}`);
    }
  }
  sheets.set(sheet.id, sheet);
}
const keys = new Set();
for (const asset of manifest.assets) {
  if (!asset.key || keys.has(asset.key)) throw new Error(`Duplicate or missing asset key: ${asset.key}`);
  keys.add(asset.key);
  const sheet = sheets.get(asset.sheetId);
  if (!sheet) throw new Error(`${asset.key} references unknown sheet ${asset.sheetId}`);
  if (!Number.isInteger(asset.sheetWidth) || asset.sheetWidth < 1 || !Number.isInteger(asset.sheetHeight) || asset.sheetHeight < 1) {
    throw new Error(`${asset.key} has invalid grid ${asset.sheetWidth}x${asset.sheetHeight}`);
  }
  const declaredGrid = sheet.grids.some(grid => grid.sheetWidth === asset.sheetWidth && grid.sheetHeight === asset.sheetHeight);
  if (!declaredGrid) throw new Error(`${asset.key} grid is not declared by sheet ${asset.sheetId}`);
  const count = asset.sheetWidth * asset.sheetHeight;
  if (!Number.isInteger(asset.cardIndex) || asset.cardIndex < 0 || asset.cardIndex >= count) throw new Error(`${asset.key} has invalid cardIndex ${asset.cardIndex}`);
}

if (local) {
  const mapPath = join(repoRoot, 'web/src/generated/local-assets.json');
  const runtime = JSON.parse(await readFile(mapPath, 'utf8'));
  if (runtime.version !== 1 || !runtime.assets) throw new Error('Invalid local asset map');
  for (const asset of manifest.assets) {
    const entry = runtime.assets[asset.key];
    if (!entry) throw new Error(`Local asset map is missing ${asset.key}`);
    for (const url of [entry.sheetUrl, entry.url].filter(Boolean)) {
      if (!url.startsWith('/assets/')) throw new Error(`${asset.key} has non-local runtime URL: ${url}`);
      await access(join(publicRoot, url.slice(1)));
    }
  }
}

console.log(`Validated ${manifest.assets.length} asset references across ${manifest.sheets.length} localized image URLs${local ? ' and local files' : ''}`);
