// Rendu « écran Pip-Boy » des images du jeu, côté client (D35) : le backend sert les images
// couleur d'origine (512 × 512) et c'est ici, par un canvas, qu'elles deviennent des icônes 96 × 96
// en 4 niveaux de vert. Portage à l'identique de l'ancien script Python (Pillow) qui produisait
// les PNG verts : mêmes constantes, même ordre des étapes (réduction lissée → alpha binarisé →
// luminance → autocontraste → gamma → seuils), mêmes arrondis (int() de Python = troncature).
// Fonctions pures + DOM standard, aucune référence à Angular : testable seul (pixel-art.spec.ts).

// Côté de la grille produite, en pixels : 96 reste net en 32 / 64 px, montre ses pixels au-delà.
export const PIXEL_GRID = 96;
// < 1 relève les tons moyens : les combinaisons bleues des Vault Boy tombaient dans le noir.
export const PIPBOY_GAMMA = 0.65;
// Bornes basses des 4 niveaux, sur la luminance 0..255 après gamma.
export const PIPBOY_THRESHOLDS: readonly number[] = [0, 60, 130, 205];
// Sombre, moyen, primary #1aff80 du thème CRT, pâle. Seule exception à la règle « couleurs dans
// material-theme.scss seul » (D35) : un canvas ne lit pas les tokens CSS.
export const PIPBOY_GREENS: readonly (readonly [number, number, number])[] = [
  [0, 45, 22],
  [0, 110, 55],
  [26, 255, 128],
  [196, 255, 203],
];
// Alpha ≤ ALPHA_CUTOFF → pixel transparent : pas de bord semi-transparent (halo gris).
export const ALPHA_CUTOFF = 96;
// Autocontraste : part des pixels opaques écartée à chaque extrémité de l'histogramme (2 %).
export const AUTOCONTRAST_CUTOFF = 0.02;

// Luminance Rec. 601 (comme Image.convert('L') de Pillow), arrondie à l'entier.
function luminance(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// Bornes [lo, hi] de l'histogramme après avoir écarté AUTOCONTRAST_CUTOFF des valeurs à chaque
// bout (ImageOps.autocontrast(cutoff=2)). Seuls les pixels opaques comptent : les zones
// transparentes (RGB à 0) tireraient le contraste vers le noir.
function contrastBounds(values: readonly number[]): readonly [number, number] {
  const histogram = new Array<number>(256).fill(0);
  for (const v of values) histogram[v]++;
  const cut = Math.floor(values.length * AUTOCONTRAST_CUTOFF);

  let lo = 0;
  let remaining = cut;
  while (lo < 255 && histogram[lo] <= remaining) {
    remaining -= histogram[lo];
    lo++;
  }
  let hi = 255;
  remaining = cut;
  while (hi > 0 && histogram[hi] <= remaining) {
    remaining -= histogram[hi];
    hi--;
  }
  return [lo, hi];
}

// Pixels RGBA d'une image déjà réduite à la grille → nouveau tableau RGBA en 4 verts + transparent.
export function quantizeToPipboy(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const count = width * height;
  const out = new Uint8ClampedArray(count * 4);

  // 1. Alpha binarisé et luminance des pixels opaques (-1 = transparent).
  const lum = new Array<number>(count).fill(-1);
  const opaque: number[] = [];
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (data[o + 3] > ALPHA_CUTOFF) {
      lum[i] = luminance(data[o], data[o + 1], data[o + 2]);
      opaque.push(lum[i]);
    }
  }

  // 2. Autocontraste : étirement linéaire de [lo, hi] sur [0, 255] (identité si hi ≤ lo).
  const [lo, hi] = contrastBounds(opaque);
  const scale = hi > lo ? 255 / (hi - lo) : 1;
  const offset = hi > lo ? -lo * scale : 0;

  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (lum[i] < 0) continue; // transparent : RGBA déjà à 0
    // int() de Python tronque ; la LUT de Pillow borne ensuite à 0..255.
    const stretched = Math.min(255, Math.max(0, Math.trunc(lum[i] * scale + offset)));
    // 3. Gamma.
    const v = Math.trunc(255 * Math.pow(stretched / 255, PIPBOY_GAMMA));
    // 4. Niveau = nombre de seuils ≤ v, moins 1.
    let level = -1;
    for (const t of PIPBOY_THRESHOLDS) if (v >= t) level++;
    const [r, g, b] = PIPBOY_GREENS[Math.max(0, level)];
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = 255;
  }
  return out;
}

// Cache par URL d'origine : les parents recréent leurs listes 10 fois par seconde (D15 / D32),
// et plusieurs GameIcon partagent souvent la même image (les 3 paliers d'un produit). Une seule
// requête réseau et un seul calcul par fichier, quel que soit le nombre d'icônes à l'écran.
const cache = new Map<string, Promise<string>>();

export function clearPipboyCache(): void {
  cache.clear();
}

// Charge `url` dans une Image hors DOM. crossOrigin anonymous : sans lui, une image d'une autre
// origine (le backend, port 3000) rendrait le canvas « tainted » et getImageData lèverait (D35).
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image introuvable : ${url}`));
    image.src = url;
  });
}

// Canvas 2D disponible ? Testé AVANT de charger l'image : sous jsdom (tests), une <img> ne
// déclenche jamais `load` ni `error` (la promesse ne se résoudrait jamais) et getContext loggue
// « Not implemented » ; CanvasRenderingContext2D n'y existe pas, ce qui suffit à trancher sans
// bruit. Pas mémorisé : appelé une fois par URL grâce au cache, et les specs remplacent ces
// globaux pour simuler un navigateur.
function hasCanvas(): boolean {
  return (
    typeof CanvasRenderingContext2D !== 'undefined' &&
    document.createElement('canvas').getContext('2d') !== null
  );
}

// Rendu Pip-Boy de l'image : résout une data URL PNG 96 × 96. Deux issues en cas d'échec :
// - l'image ne peut pas être traitée (pas de canvas 2D : jsdom, navigateur sans canvas ; canvas
//   « tainted » faute d'en-tête CORS, …) → résout `url` inchangée : repli sur l'image couleur ;
// - l'image ne se charge pas (404, réseau) → rejette, pour que GameIcon passe au candidat suivant
//   exactement comme sur l'événement `error` de l'<img> (D32).
export function pipboyDataUrl(url: string): Promise<string> {
  let pending = cache.get(url);
  if (!pending) {
    pending = hasCanvas()
      ? loadImage(url).then((image) => render(image) ?? url)
      : Promise.resolve(url);
    cache.set(url, pending);
  }
  return pending;
}

// Dessine l'image chargée dans un canvas PIXEL_GRID × PIXEL_GRID et la quantifie ; null si le
// canvas refuse (getImageData sur un canvas tainted lève SecurityError).
function render(image: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PIXEL_GRID;
    canvas.height = PIXEL_GRID;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Réduction LISSÉE (comme le LANCZOS du script) : c'est l'agrandissement à l'écran qui doit
    // être net (image-rendering: pixelated dans game-icon.css).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, PIXEL_GRID, PIXEL_GRID);
    const pixels = ctx.getImageData(0, 0, PIXEL_GRID, PIXEL_GRID);
    // Réécrit dans le même ImageData (le constructeur ImageData refuse un Uint8ClampedArray
    // typé ArrayBufferLike).
    pixels.data.set(quantizeToPipboy(pixels.data, PIXEL_GRID, PIXEL_GRID));
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
