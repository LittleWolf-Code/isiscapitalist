import {
  ALPHA_CUTOFF,
  PIPBOY_GREENS,
  PIXEL_GRID,
  clearPipboyCache,
  pipboyDataUrl,
  quantizeToPipboy,
} from './pixel-art';

// Tableau RGBA 2 × 2 à partir de quatre pixels [r, g, b, a].
function rgba(...pixels: (readonly [number, number, number, number])[]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}
function pixel(data: Uint8ClampedArray, i: number): number[] {
  return Array.from(data.subarray(i * 4, i * 4 + 4));
}

describe('quantizeToPipboy', () => {
  // Histogramme déjà étalé sur 0–255 (noir et blanc opaques) : l'autocontraste est l'identité et
  // les valeurs de l'exemple chiffré s'appliquent telles quelles.
  const black = [0, 0, 0, 255] as const;
  const white = [255, 255, 255, 255] as const;

  it("exemple chiffré : bleu Vault Boy → niveau 1, jaune → niveau 3, alpha 40 → transparent", () => {
    const out = quantizeToPipboy(rgba(black, white, [0, 103, 177, 255], [255, 220, 100, 255]), 2, 2);
    expect(pixel(out, 0)).toEqual([0, 45, 22, 255]);
    expect(pixel(out, 1)).toEqual([196, 255, 203, 255]);
    expect(pixel(out, 2)).toEqual([0, 110, 55, 255]); // L ≈ 81 → v ≈ 121 → [60, 130)
    expect(pixel(out, 3)).toEqual([196, 255, 203, 255]); // L ≈ 217 → v ≈ 229 → ≥ 205

    const alpha = quantizeToPipboy(rgba(black, white, [255, 255, 255, 40], [255, 255, 255, ALPHA_CUTOFF + 1]), 2, 2);
    expect(pixel(alpha, 2)).toEqual([0, 0, 0, 0]);
    expect(pixel(alpha, 3)).toEqual([...PIPBOY_GREENS[3], 255]);
  });

  it('gris moyen (128) : gamma 0,65 relève à ≈ 163 → niveau 2 (primary)', () => {
    const out = quantizeToPipboy(rgba(black, white, [128, 128, 128, 255], [128, 128, 128, 255]), 2, 2);
    expect(pixel(out, 2)).toEqual([26, 255, 128, 255]);
  });

  it("autocontraste : n'étire que sur les pixels opaques, un pixel transparent ne compte pas", () => {
    // Deux gris opaques 100 et 200 : étirés sur 0 et 255 → sombre et pâle ; le transparent (RGB à
    // 0) n'abaisse pas la borne basse, sinon 100 resterait un ton moyen.
    const out = quantizeToPipboy(rgba([100, 100, 100, 255], [200, 200, 200, 255], [0, 0, 0, 0], [0, 0, 0, 0]), 2, 2);
    expect(pixel(out, 0)).toEqual([0, 45, 22, 255]);
    expect(pixel(out, 1)).toEqual([196, 255, 203, 255]);
    expect(pixel(out, 2)).toEqual([0, 0, 0, 0]);
  });

  it('image unie : hi = lo → pas d\'étirement, la valeur brute décide du niveau', () => {
    const out = quantizeToPipboy(rgba([200, 200, 200, 255], [200, 200, 200, 255], [200, 200, 200, 255], [200, 200, 200, 255]), 2, 2);
    // 200 → v = 255 · (200/255)^0.65 ≈ 218 → niveau 3.
    expect(pixel(out, 0)).toEqual([196, 255, 203, 255]);
    expect(out.length).toBe(16);
  });
});

describe('pipboyDataUrl', () => {
  beforeEach(() => clearPipboyCache());

  it("sous jsdom (pas de canvas 2D) : résout l'URL d'origine (repli couleur)", async () => {
    const url = 'http://localhost:3000/icones/world.png';
    await expect(pipboyDataUrl(url)).resolves.toBe(url);
  });

  it('cache par URL : deux appels rendent la même promesse ; clearPipboyCache la renouvelle', () => {
    const url = 'http://localhost:3000/icones/item1.png';
    const first = pipboyDataUrl(url);
    expect(pipboyDataUrl(url)).toBe(first);
    expect(pipboyDataUrl('http://localhost:3000/icones/item2.png')).not.toBe(first);
    clearPipboyCache();
    expect(pipboyDataUrl(url)).not.toBe(first);
  });

  it('constantes du rendu telles que validées (docs/THEME.md)', () => {
    expect(PIXEL_GRID).toBe(96);
    expect(PIPBOY_GREENS[2]).toEqual([26, 255, 128]); // primary #1aff80
  });
});
