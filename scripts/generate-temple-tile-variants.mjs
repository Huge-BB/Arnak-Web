import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'public/assets');
const variants = [
  { id: '2a', base: '2', label: '2A' },
  { id: '2b', base: '2', label: '2B' },
  { id: '2c', base: '2', label: '2C' },
  { id: '6a', base: '6', label: '6A' },
  { id: '6b', base: '6', label: '6B' },
  { id: '11', base: '11', label: '11' },
];

function labelSvg(label, width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(18 20)"><rect width="52" height="32" rx="8" fill="#26382b" fill-opacity=".9" stroke="#f0d77d" stroke-width="2"/><text x="26" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="#fff2be">${label}</text></g></svg>`);
}

await mkdir(assets, { recursive: true });
for (const variant of variants) {
  const source = resolve(assets, `temple-tile-${variant.base}.png`);
  // Variant 11 deliberately replaces the original generic 11-point image, so
  // read the source first instead of letting Sharp use the same path twice.
  const sourceImage = await sharp(source).toBuffer();
  const { width, height } = await sharp(sourceImage).metadata();
  if (!width || !height) throw new Error(`Could not determine dimensions for ${source}`);
  await sharp(sourceImage)
    .composite([{ input: labelSvg(variant.label, width, height), top: 0, left: 0 }])
    .png()
    .toFile(resolve(assets, `temple-tile-${variant.id}.png`));
}
console.log(`Generated ${variants.length} labelled Temple tile variants.`);
