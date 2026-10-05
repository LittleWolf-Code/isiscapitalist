import {
  DEFAULT_DISPLAY,
  DISPLAY_STORAGE_KEY,
  LEGACY_FLICKER_STORAGE_KEY,
  LEGACY_GLOW_STORAGE_KEY,
  LEGACY_SCANLINES_STORAGE_KEY,
  normalizeDisplay,
  readStoredDisplay,
  readStoredFlag,
} from './display-settings';

const ALL_KEYS = [
  DISPLAY_STORAGE_KEY,
  LEGACY_SCANLINES_STORAGE_KEY,
  LEGACY_GLOW_STORAGE_KEY,
  LEGACY_FLICKER_STORAGE_KEY,
];

function clearStorage(): void {
  ALL_KEYS.forEach((key) => localStorage.removeItem(key));
}

describe('normalizeDisplay', () => {
  it('objet vide, null ou non-objet → défauts', () => {
    expect(normalizeDisplay({})).toEqual(DEFAULT_DISPLAY);
    expect(normalizeDisplay(null)).toEqual(DEFAULT_DISPLAY);
    expect(normalizeDisplay('oui')).toEqual(DEFAULT_DISPLAY);
    expect(normalizeDisplay(42)).toEqual(DEFAULT_DISPLAY);
  });

  it('champs valides conservés, champs de mauvais type remplacés par le défaut', () => {
    const display = normalizeDisplay({ flicker: true, glow: 'on', scanlinesLevel: '80', tint: 'amber' });
    expect(display.flicker).toBe(true);
    expect(display.glow).toBe(DEFAULT_DISPLAY.glow);
    expect(display.scanlinesLevel).toBe(DEFAULT_DISPLAY.scanlinesLevel);
    expect(display.tint).toBe('amber');
  });

  it('niveau hors 0-100 borné, NaN → défaut', () => {
    expect(normalizeDisplay({ glowLevel: 250 }).glowLevel).toBe(100);
    expect(normalizeDisplay({ vignetteLevel: -3 }).vignetteLevel).toBe(0);
    expect(normalizeDisplay({ scanlinesLevel: Number.NaN }).scanlinesLevel).toBe(50);
    expect(normalizeDisplay({ scanlinesLevel: 0 }).scanlinesLevel).toBe(0);
  });

  it("teinte inconnue → 'green'", () => {
    expect(normalizeDisplay({ tint: 'pink' }).tint).toBe('green');
    expect(normalizeDisplay({ tint: 3 }).tint).toBe('green');
    expect(normalizeDisplay({ tint: 'blue' }).tint).toBe('blue');
  });
});

// Disposition de la page (D37) : 'sujet' par défaut, 'onglets' au choix, inconnue → défaut.
describe('normalizeDisplay — disposition', () => {
  it("défaut 'sujet' ; 'onglets' conservé ; valeur inconnue ou absente → 'sujet'", () => {
    expect(DEFAULT_DISPLAY.layout).toBe('sujet');
    expect(normalizeDisplay({ layout: 'onglets' }).layout).toBe('onglets');
    expect(normalizeDisplay({ layout: 'tabs' }).layout).toBe('sujet');
    expect(normalizeDisplay({ tint: 'amber' }).layout).toBe('sujet');
  });
});

describe('readStoredFlag', () => {
  beforeEach(clearStorage);

  it("absent → défaut ; 'off' → false, 'on' → true, inconnu → défaut", () => {
    expect(readStoredFlag(LEGACY_GLOW_STORAGE_KEY, true)).toBe(true);
    localStorage.setItem(LEGACY_GLOW_STORAGE_KEY, 'off');
    expect(readStoredFlag(LEGACY_GLOW_STORAGE_KEY, true)).toBe(false);
    localStorage.setItem(LEGACY_GLOW_STORAGE_KEY, 'on');
    expect(readStoredFlag(LEGACY_GLOW_STORAGE_KEY, false)).toBe(true);
    localStorage.setItem(LEGACY_GLOW_STORAGE_KEY, 'maybe');
    expect(readStoredFlag(LEGACY_GLOW_STORAGE_KEY, true)).toBe(true);
  });
});

describe('readStoredDisplay', () => {
  beforeEach(clearStorage);

  it('rien en stockage → défauts', () => {
    expect(readStoredDisplay()).toEqual(DEFAULT_DISPLAY);
  });

  it('clé JSON présente → normalisée ; JSON illisible → défauts', () => {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify({ tint: 'white', roll: true, glowLevel: 999 }));
    expect(readStoredDisplay()).toEqual({ ...DEFAULT_DISPLAY, tint: 'white', roll: true, glowLevel: 100 });
    localStorage.setItem(DISPLAY_STORAGE_KEY, '{pas du json');
    expect(readStoredDisplay()).toEqual(DEFAULT_DISPLAY);
  });

  it("migration D22 : flicker = 'on' sans nouvelle clé → flicker: true, anciennes clés supprimées", () => {
    localStorage.setItem(LEGACY_FLICKER_STORAGE_KEY, 'on');
    localStorage.setItem(LEGACY_SCANLINES_STORAGE_KEY, 'off');
    expect(readStoredDisplay()).toEqual({ ...DEFAULT_DISPLAY, flicker: true, scanlines: false });
    expect(localStorage.getItem(LEGACY_FLICKER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_SCANLINES_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_GLOW_STORAGE_KEY)).toBeNull();
  });

  it('nouvelle clé présente → anciennes clés ignorées et supprimées', () => {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify({ flicker: false }));
    localStorage.setItem(LEGACY_FLICKER_STORAGE_KEY, 'on');
    expect(readStoredDisplay().flicker).toBe(false);
    expect(localStorage.getItem(LEGACY_FLICKER_STORAGE_KEY)).toBeNull();
  });
});
