// Réglages d'affichage de l'écran cathodique (D34) : modèle, défauts, normalisation et lecture
// depuis localStorage. Fichier pur (aucune injection, comme game-math.ts) : SettingsPanel
// l'importe sans dépendre de GameService, et les fonctions se testent sans TestBed.

export type Tint = 'green' | 'amber' | 'blue' | 'white';
export const TINTS: readonly Tint[] = ['green', 'amber', 'blue', 'white'];

// Disposition de la page (D37) : 'sujet' = mise en page du sujet (bandeau gauche + fenêtres
// superposées, défaut, conforme au cahier des charges) ; 'onglets' = disposition de la phase 9
// (barre du haut à cases de stats, barre d'onglets en bas, un écran par onglet).
export type Layout = 'sujet' | 'onglets';
export const LAYOUTS: readonly Layout[] = ['sujet', 'onglets'];

export interface DisplaySettings {
  scanlines: boolean;
  scanlinesLevel: number; // 0-100
  glow: boolean;
  glowLevel: number; // 0-100
  vignette: boolean;
  vignetteLevel: number; // 0-100
  grid: boolean;
  grain: boolean;
  flicker: boolean;
  roll: boolean;
  noise: boolean;
  tint: Tint;
  layout: Layout;
}

// Défauts : tout ce qui est statique est actif, tout ce qui est animé est inactif, curseurs à
// 50 % (= rendu D22 pour scanlines et halo).
export const DEFAULT_DISPLAY: DisplaySettings = {
  scanlines: true,
  scanlinesLevel: 50,
  glow: true,
  glowLevel: 50,
  vignette: true,
  vignetteLevel: 50,
  grid: true,
  grain: true,
  flicker: false,
  roll: false,
  noise: false,
  tint: 'green',
  layout: 'sujet',
};

// Une seule clé JSON (D34) à la place des trois clés 'on' / 'off' de D22, lues une fois en
// migration puis supprimées.
export const DISPLAY_STORAGE_KEY = 'isiscapitalist.display';
export const LEGACY_SCANLINES_STORAGE_KEY = 'isiscapitalist.scanlines';
export const LEGACY_GLOW_STORAGE_KEY = 'isiscapitalist.glow';
export const LEGACY_FLICKER_STORAGE_KEY = 'isiscapitalist.flicker';
const LEGACY_KEYS = [LEGACY_SCANLINES_STORAGE_KEY, LEGACY_GLOW_STORAGE_KEY, LEGACY_FLICKER_STORAGE_KEY];

// Interrupteur mémorisé (format D22) : 'on' → true, 'off' → false ; absent, inconnu ou
// localStorage indisponible → fallback.
export function readStoredFlag(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === 'on' ? true : value === 'off' ? false : fallback;
  } catch {
    return fallback;
  }
}

function pickBoolean(raw: Record<string, unknown>, key: keyof DisplaySettings): boolean {
  const value = raw[key];
  return typeof value === 'boolean' ? value : (DEFAULT_DISPLAY[key] as boolean);
}

// Niveau 0-100 : non numérique ou NaN → défaut ; hors bornes → borné.
function pickLevel(raw: Record<string, unknown>, key: keyof DisplaySettings): number {
  const value = raw[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_DISPLAY[key] as number;
  }
  return Math.min(100, Math.max(0, value));
}

// Valeur brute (JSON relu, objet partiel, n'importe quoi) → réglages complets et valides.
// Ne lève jamais.
export function normalizeDisplay(raw: unknown): DisplaySettings {
  const source = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tint = source['tint'];
  const layout = source['layout'];
  return {
    scanlines: pickBoolean(source, 'scanlines'),
    scanlinesLevel: pickLevel(source, 'scanlinesLevel'),
    glow: pickBoolean(source, 'glow'),
    glowLevel: pickLevel(source, 'glowLevel'),
    vignette: pickBoolean(source, 'vignette'),
    vignetteLevel: pickLevel(source, 'vignetteLevel'),
    grid: pickBoolean(source, 'grid'),
    grain: pickBoolean(source, 'grain'),
    flicker: pickBoolean(source, 'flicker'),
    roll: pickBoolean(source, 'roll'),
    noise: pickBoolean(source, 'noise'),
    tint: (TINTS as readonly unknown[]).includes(tint) ? (tint as Tint) : DEFAULT_DISPLAY.tint,
    layout: (LAYOUTS as readonly unknown[]).includes(layout)
      ? (layout as Layout)
      : DEFAULT_DISPLAY.layout,
  };
}

// Réglages mémorisés : la clé JSON si elle existe (JSON illisible → défauts), sinon migration
// des trois interrupteurs D22. Les anciennes clés sont supprimées dans les deux cas.
// localStorage indisponible → défauts, sans erreur.
export function readStoredDisplay(): DisplaySettings {
  try {
    const stored = localStorage.getItem(DISPLAY_STORAGE_KEY);
    let display: DisplaySettings;
    if (stored !== null) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = null;
      }
      display = normalizeDisplay(parsed);
    } else {
      display = {
        ...DEFAULT_DISPLAY,
        scanlines: readStoredFlag(LEGACY_SCANLINES_STORAGE_KEY, DEFAULT_DISPLAY.scanlines),
        glow: readStoredFlag(LEGACY_GLOW_STORAGE_KEY, DEFAULT_DISPLAY.glow),
        flicker: readStoredFlag(LEGACY_FLICKER_STORAGE_KEY, DEFAULT_DISPLAY.flicker),
      };
    }
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    return display;
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}
