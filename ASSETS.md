# Local asset pipeline

The engine catalogs currently preserve the original TTS sprite metadata. The asset pipeline converts those remote Steam CDN references into deterministic local web assets without changing game-rule data.

## Commands

```bash
npm run extract:data
npm run assets:manifest
npm run assets:localize
npm run assets:validate:local
```

`assets:manifest` reads the generated card/site/idol/guardian/assistant catalogs, deduplicates their image URLs, validates sprite grids and indices, and writes `web/data/assets-manifest.json`.

`assets:localize` downloads each unique sprite sheet once into `web/public/assets/sheets/` and writes two equivalent runtime maps:

- `web/public/assets/asset-map.json`
- `web/src/generated/local-assets.json`

Each runtime entry retains `sheetWidth`, `sheetHeight`, and `cardIndex`, so a UI can render directly from a local sprite sheet with CSS/object positioning.

For independent files, run:

```bash
npm run assets:localize:crop
```

This uses `sharp` to verify the actual image dimensions, crop the TTS row-major sprite cell for every catalog entry, and write WebP files into `web/public/assets/cropped/`. The resulting local map includes a direct `/assets/cropped/...` URL for each component.

Use `--force` with `node scripts/localize-assets.mjs` when local files should be overwritten.

## Repository policy

The scripts are intentionally separate from `npm test`: downloading CDN assets is network-dependent and can be large. Manifest validation is deterministic and can be run without downloading images. Local file validation should be run after localization.

The generated static assets are suitable for a browser build because runtime URLs contain no Steam CDN dependency. Whether the binary files themselves are committed to Git or produced during a release/build step can be decided separately.
