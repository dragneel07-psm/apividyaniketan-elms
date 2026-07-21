/**
 * Generates PWA icon PNGs from favicon.svg using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const svgBuffer = readFileSync(resolve(root, 'public/favicon.svg'));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const outPath = resolve(root, `public/icons/icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ Generated ${size}x${size}`);
}

// Also generate root favicon.ico (16x16 + 32x32 embedded)
await sharp(svgBuffer).resize(32, 32).png().toFile(resolve(root, 'public/favicon-32.png'));
console.log('✓ All icons generated');
