import {
  angelsEarned,
  blockedManagerNames,
  buyCost,
  FAST_CYCLE_MS,
  formatDuration,
  formatNumber,
  logoCandidates,
  maxAffordable,
  nextUnlock,
  productionGain,
  productionProgress,
  SCORE_PER_ANGEL,
  targetLabel,
} from './game-math';

// Valeurs d'Item 1 dans backend/src/origworld.ts (monde neuf).
const item1 = { cout: 4, croissance: 1.07 };

describe('buyCost', () => {
  it('x1 = cout du prochain exemplaire', () => {
    expect(buyCost(item1, 1)).toBe(4);
  });

  it('x10 sur Item 1 neuf = 55.27 (4 × (1.07¹⁰ − 1) / 0.07)', () => {
    expect(buyCost(item1, 10)).toBeCloseTo(55.27, 2);
  });

  it('croissance 1 → cout × q (pas de division par zéro)', () => {
    expect(buyCost({ cout: 5, croissance: 1 }, 7)).toBe(35);
  });
});

describe('maxAffordable', () => {
  it('money 0 ou insuffisant pour un exemplaire → 0', () => {
    expect(maxAffordable(item1, 0)).toBe(0);
    expect(maxAffordable(item1, 3.99)).toBe(0);
  });

  it('solde exactement égal au coût → achat permis (4 → 1)', () => {
    expect(maxAffordable(item1, 4)).toBe(1);
  });

  it('55.26 → 9, 55.27 → 10 (x10 coûte 55.2658), 100 → 14', () => {
    expect(maxAffordable(item1, 55.26)).toBe(9);
    expect(maxAffordable(item1, 55.27)).toBe(10);
    expect(maxAffordable(item1, 100)).toBe(14);
  });

  it("le coût de la quantité rendue ne dépasse jamais le solde (garde d'arrondi)", () => {
    for (const money of [4, 8.28, 55.27, 100, 1000, 12345.678]) {
      const q = maxAffordable(item1, money);
      expect(buyCost(item1, q)).toBeLessThanOrEqual(money);
      expect(buyCost(item1, q + 1)).toBeGreaterThan(money);
    }
  });

  it('croissance 1 → floor(money / cout) (cout 5, money 12 → 2)', () => {
    expect(maxAffordable({ cout: 5, croissance: 1 }, 12)).toBe(2);
  });
});

describe('productionGain', () => {
  const product = { quantite: 3, revenu: 10 };

  it('sans ange : quantite × revenu', () => {
    expect(productionGain({ activeangels: 0, angelbonus: 2 }, product)).toBe(30);
  });

  it('5 anges à 2 % → ×1.10', () => {
    expect(productionGain({ activeangels: 5, angelbonus: 2 }, product)).toBeCloseTo(33, 10);
  });
});

describe('formatNumber', () => {
  it('0 → 0.00', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('999.5 → 999.50 (pas encore de suffixe)', () => {
    expect(formatNumber(999.5)).toBe('999.50');
  });

  it('1234 → 1.23 k', () => {
    expect(formatNumber(1234)).toBe('1.23 k');
  });

  it('1234567 → 1.23 M', () => {
    expect(formatNumber(1234567)).toBe('1.23 M');
  });

  it('1e9 / 1e12 → G / T', () => {
    expect(formatNumber(1e9)).toBe('1.00 G');
    expect(formatNumber(2.5e12)).toBe('2.50 T');
  });

  // D29 : suffixes SI jusqu'à Y (10²⁴), puis notation scientifique sans « + » dès 10²⁷.
  it.each([
    [999.5, '999.50'],
    [1234, '1.23 k'],
    [2.5e12, '2.50 T'],
    [1e15, '1.00 P'],
    [3.854e17, '385.40 P'], // cout d'Item 1 chez l'user lucas
    [1.5e18, '1.50 E'],
    [2e21, '2.00 Z'],
    [7.25e24, '7.25 Y'],
    [9.9999e26, '999.99 Y'], // dernier cas en suffixe
    [1e27, '1.00e27'], // toExponential(2) donne 1.00e+27 : « + » retiré
    [1.234e30, '1.23e30'],
    [-3.2e17, '-320.00 P'], // signe conservé
    [Infinity, 'Infinity'], // garde-fou existant
  ])('%s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

// Barre de production (D29) : 0 si vitesse ≤ 0, pleine sous FAST_CYCLE_MS (4 ticks de 100 ms),
// sinon 100 × (vitesse − timeleft) / vitesse.
describe('productionProgress', () => {
  it('FAST_CYCLE_MS = 400 (4 × le tick de 100 ms de GameService, D15)', () => {
    expect(FAST_CYCLE_MS).toBe(400);
  });

  it.each([
    [1000, 250, 75], // test existant de la carte
    [0, 0, 0], // garde-fou
    [500, 0, 100], // au repos : plein
    [500, 500, 0], // cycle qui démarre : part de 0
    [400, 200, 50], // seuil strict : 400 ms = 4 pas, barre normale
    [399, 200, 100], // trop rapide : plein
    [125, 25, 100], // Item 1 chez lucas
  ])('vitesse %s, timeleft %s → %s', (vitesse, timeleft, expected) => {
    expect(productionProgress({ vitesse, timeleft })).toBe(expected);
  });
});

// Chrono de la carte produit (D28) : seconde SUPÉRIEURE (jamais 00:00 pendant une production),
// mm:ss jusqu'à 59:59 puis h:mm:ss, heures non bornées.
describe('formatDuration', () => {
  it('0 → 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('1 ms et 500 ms (Item 1 au repos) → 00:01 (ceil)', () => {
    expect(formatDuration(1)).toBe('00:01');
    expect(formatDuration(500)).toBe('00:01');
  });

  it('2950 → 00:03 (ceil, pas round) ; 3000 → 00:03', () => {
    expect(formatDuration(2950)).toBe('00:03');
    expect(formatDuration(3000)).toBe('00:03');
  });

  it('61001 → 01:02 (ceil(61.001) = 62 s)', () => {
    expect(formatDuration(61001)).toBe('01:02');
  });

  it('120000 (Item 6 au repos) → 02:00', () => {
    expect(formatDuration(120000)).toBe('02:00');
  });

  it('3599000 → 59:59 ; 3599001 → 1:00:00 (bascule en h:mm:ss)', () => {
    expect(formatDuration(3_599_000)).toBe('59:59');
    expect(formatDuration(3_599_001)).toBe('1:00:00');
  });

  it('90000000 → 25:00:00 (heures non bornées à 24)', () => {
    expect(formatDuration(90_000_000)).toBe('25:00:00');
  });

  it('négatif, NaN, Infinity → 00:00 (garde-fou)', () => {
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(NaN)).toBe('00:00');
    expect(formatDuration(Infinity)).toBe('00:00');
  });
});

// Formule de world-engine.ts (D20) : max(0, floor(score / SCORE_PER_ANGEL) − totalangels), avec
// SCORE_PER_ANGEL = 50. Mêmes cas chiffrés que backend/src/world-engine.spec.ts : le badge (client)
// et le résultat de resetWorld (serveur) doivent coïncider.
describe('angelsEarned', () => {
  it('SCORE_PER_ANGEL = 50 (2 % du score)', () => {
    expect(SCORE_PER_ANGEL).toBe(50);
  });

  it('score 0 → 0', () => {
    expect(angelsEarned({ score: 0, totalangels: 0 })).toBe(0);
  });

  it('exemple 1 (monde réel) : score 8 019 386, totalangels 0 → 160387', () => {
    expect(angelsEarned({ score: 8_019_386, totalangels: 0 })).toBe(160_387);
  });

  it('exemple 2 : score 12 000, totalangels 100 → 240 − 100 = 140', () => {
    expect(angelsEarned({ score: 12_000, totalangels: 100 })).toBe(140);
  });

  it('exemple 3 (seuils) : 49 → 0, 50 → 1, 99 → 1, 100 → 2', () => {
    expect(angelsEarned({ score: 49, totalangels: 0 })).toBe(0);
    expect(angelsEarned({ score: 50, totalangels: 0 })).toBe(1);
    expect(angelsEarned({ score: 99, totalangels: 0 })).toBe(1);
    expect(angelsEarned({ score: 100, totalangels: 0 })).toBe(2);
  });

  it('score inchangé après un reset (totalangels déjà à 160387) → 0', () => {
    expect(angelsEarned({ score: 8_019_386, totalangels: 160_387 })).toBe(0);
  });

  it("jamais négatif : totalangels supérieur à la formule (mondes de l'ancienne formule) → 0", () => {
    expect(angelsEarned({ score: 1000, totalangels: 300 })).toBe(0);
  });
});

// Paliers d'Item 1 dans backend/src/origworld.ts : seuils 25 / 50 / 100. nextUnlock rend le
// palier verrouillé de plus petit seuil, sans supposer le tableau trié (D23).
describe('nextUnlock', () => {
  const palier = (seuil: number, unlocked = false) => ({ seuil, unlocked });

  it('tout verrouillé → seuil 25', () => {
    expect(nextUnlock({ paliers: [palier(25), palier(50), palier(100)] })?.seuil).toBe(25);
  });

  it('Unlock 1.1 débloqué → seuil 50', () => {
    expect(nextUnlock({ paliers: [palier(25, true), palier(50), palier(100)] })?.seuil).toBe(50);
  });

  it('tout débloqué → null ; aucun palier → null', () => {
    expect(nextUnlock({ paliers: [palier(25, true), palier(50, true), palier(100, true)] })).toBeNull();
    expect(nextUnlock({ paliers: [] })).toBeNull();
  });

  it('tableau désordonné [100, 25, 50] verrouillés → seuil 25 (minimum, pas le premier)', () => {
    expect(nextUnlock({ paliers: [palier(100), palier(25), palier(50)] })?.seuil).toBe(25);
  });

  it('deux paliers verrouillés de même seuil → le premier du tableau', () => {
    const first = { name: 'a', ...palier(25) };
    const second = { name: 'b', ...palier(25) };
    expect(nextUnlock({ paliers: [first, second] })).toBe(first);
  });
});

// Monde neuf de backend/src/origworld.ts : 6 managers (Manager i cible Item i), seul Item 1 a un
// exemplaire. blockedManagerNames liste les managers non possédés dont le produit est à 0 (D24).
describe('blockedManagerNames', () => {
  const freshWorld = () => ({
    managers: [1, 2, 3, 4, 5, 6].map((i) => ({
      name: `Manager ${i}`,
      idcible: i,
      unlocked: false,
    })),
    products: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, quantite: i === 1 ? 1 : 0 })),
  });

  it('monde neuf → tous sauf Manager 1', () => {
    expect(blockedManagerNames(freshWorld())).toEqual([
      'Manager 2',
      'Manager 3',
      'Manager 4',
      'Manager 5',
      'Manager 6',
    ]);
  });

  it('Item 2 acheté (quantite 1) → Manager 2 sort de la liste', () => {
    const world = freshWorld();
    world.products[1].quantite = 1;
    expect(blockedManagerNames(world)).not.toContain('Manager 2');
    expect(blockedManagerNames(world)).toHaveLength(4);
  });

  it('Manager 2 déjà unlocked avec Item 2 à 0 → absent (déjà grisé par palier.unlocked)', () => {
    const world = freshWorld();
    world.managers[1].unlocked = true;
    expect(blockedManagerNames(world)).toEqual([
      'Manager 3',
      'Manager 4',
      'Manager 5',
      'Manager 6',
    ]);
  });
});

// Colonne « produit » et repli d'image des listes de paliers (D32), sur les données de
// backend/src/origworld.ts : monde { name: 'World', logo: 'icones/world.png' }, Item i avec
// logo icones/itemi.png.
describe('targetLabel / logoCandidates', () => {
  const products = [1, 2].map((i) => ({ id: i, name: `Item ${i}`, logo: `icones/item${i}.png` }));
  const worldLogo = 'icones/world.png';

  it('Manager 1 (idcible 1, logo manager1) → « Item 1 », [manager1, item1]', () => {
    const palier = { idcible: 1, logo: 'icones/manager1.png' };
    expect(targetLabel(palier, products)).toBe('Item 1');
    expect(logoCandidates(palier, products, worldLogo)).toEqual(['icones/manager1.png', 'icones/item1.png']);
  });

  it("Manager 1 sans logo ('') → « Item 1 », [item1] : pas de chaîne vide", () => {
    const palier = { idcible: 1, logo: '' };
    expect(targetLabel(palier, products)).toBe('Item 1');
    expect(logoCandidates(palier, products, worldLogo)).toEqual(['icones/item1.png']);
  });

  it('Upgrade 1 (logo = celui du produit) → « Item 1 », doublon retiré', () => {
    const palier = { idcible: 1, logo: 'icones/item1.png' };
    expect(targetLabel(palier, products)).toBe('Item 1');
    expect(logoCandidates(palier, products, worldLogo)).toEqual(['icones/item1.png']);
  });

  it('All Unlock 1 (idcible 0) → « Global », [all, world]', () => {
    const palier = { idcible: 0, logo: 'icones/all.png' };
    expect(targetLabel(palier, products)).toBe('Global');
    expect(logoCandidates(palier, products, worldLogo)).toEqual(['icones/all.png', 'icones/world.png']);
  });

  it('Angel Upgrade 1 (idcible -1) → « Anges », [angel] sans repli', () => {
    const palier = { idcible: -1, logo: 'icones/angel.png' };
    expect(targetLabel(palier, products)).toBe('Anges');
    expect(logoCandidates(palier, products, worldLogo)).toEqual(['icones/angel.png']);
  });

  it('angel upgrade sans logo → « Anges », [] (aucune image)', () => {
    const palier = { idcible: -1, logo: '' };
    expect(targetLabel(palier, products)).toBe('Anges');
    expect(logoCandidates(palier, products, worldLogo)).toEqual([]);
  });

  it('palier orphelin (idcible 9 sans produit, sans logo) → « #9 », []', () => {
    const palier = { idcible: 9, logo: '' };
    expect(targetLabel(palier, products)).toBe('#9');
    expect(logoCandidates(palier, products, worldLogo)).toEqual([]);
  });

  it('products vide → « #1 » sans exception, repli du monde vide écarté', () => {
    expect(targetLabel({ idcible: 1 }, [])).toBe('#1');
    expect(logoCandidates({ idcible: 1, logo: 'icones/manager1.png' }, [], worldLogo)).toEqual(['icones/manager1.png']);
    expect(logoCandidates({ idcible: 0, logo: '' }, [], '')).toEqual([]);
  });
});
