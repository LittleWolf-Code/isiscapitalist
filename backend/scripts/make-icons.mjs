// Génère les icônes de démonstration : 14 PNG 64x64 unis, une couleur par icône, dans public/icones/.
// world.png n'en fait plus partie : vraie icône du thème (Vault Boy), voir docs/THEME.md.
// Aucune dépendance : l'encodage PNG (chunks IHDR/IDAT/IEND) s'appuie sur node:zlib (deflateSync, crc32).
// Usage : npm run icons   (depuis backend/, Node >= 22)
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SIZE = 64;
const OUT_DIR = join(process.cwd(), 'public', 'icones');

// Nom de fichier → couleur RGB. Palette arbitraire, chaque icône a sa propre teinte.
const ICONS = {
  all: [0xf3, 0x9c, 0x12],
  angel: [0xf7, 0xdc, 0x6f],
  item1: [0xe7, 0x4c, 0x3c],
  item2: [0x27, 0xae, 0x60],
  item3: [0x8e, 0x44, 0xad],
  item4: [0x16, 0xa0, 0x85],
  item5: [0xd3, 0x54, 0x00],
  item6: [0x2c, 0x3e, 0x50],
  manager1: [0xf1, 0x94, 0x8a],
  manager2: [0x82, 0xe0, 0xaa],
  manager3: [0xbb, 0x8f, 0xce],
  manager4: [0x76, 0xd7, 0xc4],
  manager5: [0xf0, 0xb2, 0x7a],
  manager6: [0x85, 0x92, 0x9e],
};

// Construit un chunk PNG : longueur (4 octets) + type + données + CRC32 (type + données).
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

// Encode une image unie SIZE x SIZE en PNG RGB 8 bits (type de couleur 2, sans filtre).
function solidPng([r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); // largeur
  ihdr.writeUInt32BE(SIZE, 4); // hauteur
  ihdr[8] = 8; // profondeur : 8 bits par canal
  ihdr[9] = 2; // type de couleur : RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filtre
  ihdr[12] = 0; // pas d'entrelacement

  // Chaque ligne commence par un octet de filtre (0 = None) suivi de SIZE pixels RGB.
  const row = Buffer.alloc(1 + SIZE * 3);
  for (let x = 0; x < SIZE; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: SIZE }, () => row));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // signature PNG
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, rgb] of Object.entries(ICONS)) {
  writeFileSync(join(OUT_DIR, `${name}.png`), solidPng(rgb));
}
console.log(`${Object.keys(ICONS).length} icônes générées dans ${OUT_DIR}`);
