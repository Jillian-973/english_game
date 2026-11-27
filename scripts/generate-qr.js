/**
 * Generates the QR code printed on every box (brief §9).
 *
 *   npm run qr -- https://devot-psi.vercel.app
 *
 * Writes qr/qr-code.svg (vector, best for print) and qr/qr-code.png (high resolution).
 * Static QR code: it encodes the URL itself, no third-party "dynamic QR" service.
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const OUTPUT_DIR = fileURLToPath(new URL('../qr/', import.meta.url));

const OPTIONS = {
  errorCorrectionLevel: 'Q', // ~25% of the code can be damaged and still scan
  margin: 4, // quiet zone, in modules (4 is the standard minimum)
  color: { dark: '#000000', light: '#ffffff' }, // maximum contrast for scanners
};

function parseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return url.protocol === 'https:' ? url : null;
}

const url = parseUrl(process.argv[2]);
if (!url) {
  console.error('Usage: npm run qr -- https://<production-url>   (an https URL is required)');
  process.exit(1);
}

// Encode exactly what was given, without a trailing slash added by URL parsing.
const text = url.pathname === '/' && !process.argv[2].endsWith('/') ? url.origin : url.href;

await mkdir(OUTPUT_DIR, { recursive: true });

const svgFile = `${OUTPUT_DIR}qr-code.svg`;
const pngFile = `${OUTPUT_DIR}qr-code.png`;

await QRCode.toFile(svgFile, text, { ...OPTIONS, type: 'svg' });
await QRCode.toFile(pngFile, text, { ...OPTIONS, type: 'png', width: 2048 });

console.log(`QR code for ${text}`);
console.log(`  ${svgFile}`);
console.log(`  ${pngFile} (2048 × 2048 px)`);
