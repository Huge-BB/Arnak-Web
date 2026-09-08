import sharp from 'sharp';

// These are the printed travel symbols from the top-left medallions of the
// original card art, exported once as standalone UI assets.  Keeping them
// separate avoids perspective/cropping differences in the payment dialog.
const icons = [
  ['boot', 'card-0000-face.webp'],
  ['car', 'card-0001-face.webp'],
  ['boat', 'card-0002-face.webp'],
  ['plane', 'card-1208-face.webp'],
];
for (const [name, file] of icons) {
  await sharp(`public/assets/cropped/${file}`)
    .extract({ left: 23, top: 22, width: 108, height: 108 })
    .resize(96, 96)
    .png()
    .toFile(`public/assets/travel-${name}.png`);
}
