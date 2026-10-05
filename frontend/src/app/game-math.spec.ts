import { BigvaluePipe } from './bigvalue.pipe';
import {
  advanceProduction,
  affordableCount,
  angelsEarned,
  applyBonus,
  applyUnlocks,
  bigValue,
  bonusLabel,
  buyCost,
  FAST_CYCLE_MS,
  formatDuration,
  logoCandidates,
  MAX_INT32,
  maxAffordable,
  nextUnlock,
  productionGain,
  productionProgress,
  targetLabel,
  totalAngelsFor,
} from './game-math';
import { RatioType } from './graphql';
import { SecondPipe } from './second.pipe';
import { makeWorld, palier as makePalier } from './test-world';

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

// Pipe bigvalue du sujet (F-09) : 2 décimales sous 1000, entier sous 10⁶, puis 4 chiffres
// significatifs et une puissance de dix en HTML.
describe('bigValue / BigvaluePipe', () => {
  it.each([
    [0, '0.00'],
    [999.5, '999.50'],
    [1234, '1234'],
    [999_999, '999999'],
    [1_234_567, '1.235 × 10<sup>6</sup>'],
    [1e15, '1.000 × 10<sup>15</sup>'],
    [3.854e27, '3.854 × 10<sup>27</sup>'],
    [-3.2e17, '-3.200 × 10<sup>17</sup>'],
    [Infinity, 'Infinity'],
  ])('%s → %s', (value, expected) => {
    expect(bigValue(value)).toBe(expected);
    expect(new BigvaluePipe().transform(value)).toBe(expected);
  });
});

// Barre de production (D29) : 0 si vitesse ≤ 0 ou au repos, pleine sous FAST_CYCLE_MS (4 ticks de
// 100 ms) quand le produit tourne, sinon 100 × (vitesse − timeleft) / vitesse.
describe('productionProgress', () => {
  it('FAST_CYCLE_MS = 400 (4 × le tick de 100 ms de calcScore)', () => {
    expect(FAST_CYCLE_MS).toBe(400);
  });

  it.each([
    [1000, 250, false, 75],
    [0, 0, false, 0], // garde-fou
    [500, 0, false, 0], // au repos : vide (le sujet remet la barre à 0 en fin de production)
    [500, 500, false, 0], // cycle qui démarre : part de 0
    [400, 200, false, 50], // seuil strict : 400 ms = 4 pas, barre normale
    [399, 200, false, 100], // trop rapide et en cours : plein
    [125, 0, true, 100], // trop rapide, automatisé : plein en continu
    [125, 0, false, 0], // trop rapide mais au repos : vide
  ])('vitesse %s, timeleft %s, manager %s → %s', (vitesse, timeleft, managerUnlocked, expected) => {
    expect(productionProgress({ vitesse, timeleft, managerUnlocked })).toBe(expected);
  });
});

// Pipe second du sujet (F-09) : heures:minutes:secondes.dixièmes, dixième SUPÉRIEUR (jamais
// 00:00:00.0 pendant une production).
describe('formatDuration / SecondPipe', () => {
  it.each([
    [0, '00:00:00.0'],
    [1, '00:00:00.1'],
    [500, '00:00:00.5'],
    [2950, '00:00:03.0'],
    [61_001, '00:01:01.1'],
    [120_000, '00:02:00.0'],
    [3_599_000, '00:59:59.0'],
    [3_600_000, '01:00:00.0'],
    [90_000_000, '25:00:00.0'],
    [-5, '00:00:00.0'],
    [NaN, '00:00:00.0'],
    [Infinity, '00:00:00.0'],
  ])('%s ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
    expect(new SecondPipe().transform(ms)).toBe(expected);
  });
});

// Formule du sujet (RG-09), mêmes cas chiffrés que backend/src/world-engine.spec.ts : le badge
// Investors (client) et le résultat de resetWorld (serveur) doivent coïncider.
describe('angelsEarned / totalAngelsFor', () => {
  it('10¹⁵ → 150, 4·10¹⁵ → 300, 10¹⁷ → 1500', () => {
    expect(totalAngelsFor(1e15)).toBe(150);
    expect(totalAngelsFor(4e15)).toBe(300);
    expect(totalAngelsFor(1e17)).toBe(1500);
  });

  it('premier ange vers 4,45·10¹⁰ ; plafond MAX_INT32 ; score négatif → 0', () => {
    expect(totalAngelsFor(4.4e10)).toBe(0);
    expect(totalAngelsFor(4.45e10)).toBe(1);
    expect(totalAngelsFor(1e40)).toBe(MAX_INT32);
    expect(totalAngelsFor(-1)).toBe(0);
  });

  it('anges supplémentaires = total − déjà gagnés, jamais négatif', () => {
    expect(angelsEarned({ score: 0, totalangels: 0 })).toBe(0);
    expect(angelsEarned({ score: 4e15, totalangels: 100 })).toBe(200);
    expect(angelsEarned({ score: 4e15, totalangels: 300 })).toBe(0);
    expect(angelsEarned({ score: 8_019_386, totalangels: 160_387 })).toBe(0);
  });
});

// Même calcul que le serveur (copie d'advanceProduction, cas de world-engine.spec.ts).
describe('advanceProduction', () => {
  const p = (timeleft: number, managerUnlocked = false) => ({ timeleft, vitesse: 500, managerUnlocked });

  it('sans manager : inactif, partiel, terminé', () => {
    expect(advanceProduction(p(0), 1000)).toEqual({ timeleft: 0, produced: 0 });
    expect(advanceProduction(p(800), 300)).toEqual({ timeleft: 500, produced: 0 });
    expect(advanceProduction(p(300), 300)).toEqual({ timeleft: 0, produced: 1 });
    expect(advanceProduction(p(300), 5000)).toEqual({ timeleft: 0, produced: 1 });
  });

  it('avec manager : n cycles, inactif = vient de démarrer', () => {
    expect(advanceProduction(p(200, true), 1700)).toEqual({ timeleft: 500, produced: 4 });
    expect(advanceProduction(p(0, true), 1200)).toEqual({ timeleft: 300, produced: 2 });
    expect(advanceProduction(p(0, true), 100)).toEqual({ timeleft: 400, produced: 0 });
  });
});

// Application des bonus (RG-07) : nouveau monde, l'ancien intact.
describe('applyBonus', () => {
  it('gain sur un produit : revenu × ratio, les autres et le monde d’origine inchangés', () => {
    const world = makeWorld();
    const next = applyBonus(world, { idcible: 2, ratio: 3, typeratio: RatioType.Gain });
    expect(next.products[1].revenu).toBe(180);
    expect(next.products[0]).toBe(world.products[0]);
    expect(world.products[1].revenu).toBe(60);
  });

  it('gain global (idcible 0) : tous les produits', () => {
    const next = applyBonus(makeWorld(), { idcible: 0, ratio: 2, typeratio: RatioType.Gain });
    expect(next.products.map((p) => p.revenu)).toEqual([2, 120]);
  });

  it('vitesse : vitesse ÷ ratio, production en cours accélérée (timeleft ÷ ratio, arrondi supérieur)', () => {
    const world = makeWorld();
    world.products[0].timeleft = 401;
    const next = applyBonus(world, { idcible: 1, ratio: 2, typeratio: RatioType.Vitesse });
    expect(next.products[0].vitesse).toBe(250);
    expect(next.products[0].timeleft).toBe(201);
  });

  it('vitesse : jamais sous 1 ms, un produit au repos reste au repos', () => {
    const world = makeWorld();
    world.products[0].vitesse = 3;
    const next = applyBonus(world, { idcible: 1, ratio: 10, typeratio: RatioType.Vitesse });
    expect(next.products[0].vitesse).toBe(1);
    expect(next.products[0].timeleft).toBe(0);
  });

  it('ange : angelbonus + ratio, produits inchangés', () => {
    const world = makeWorld();
    const next = applyBonus(world, { idcible: -1, ratio: 1, typeratio: RatioType.Ange });
    expect(next.angelbonus).toBe(3);
    expect(next.products).toBe(world.products);
  });
});

// Unlocks après un achat (RG-05, RG-06, F-26).
describe('applyUnlocks', () => {
  it('seuils 25 et 50 franchis d’un coup : deux paliers débloqués, bonus appliqués dans l’ordre', () => {
    const world = makeWorld();
    world.products[0].quantite = 60;
    const { world: next, unlocked } = applyUnlocks(world, 1);
    expect(unlocked.map((p) => p.name)).toEqual(['Unlock 1.1', 'Unlock 1.2']);
    expect(next.products[0].paliers.every((p) => p.unlocked)).toBe(true);
    expect(next.products[0].vitesse).toBe(250);
    expect(next.products[0].revenu).toBe(2);
    // Monde d'origine intact.
    expect(world.products[0].paliers.some((p) => p.unlocked)).toBe(false);
  });

  it('palier déjà débloqué : jamais appliqué deux fois', () => {
    const world = makeWorld();
    world.products[0].quantite = 30;
    const first = applyUnlocks(world, 1).world;
    const second = applyUnlocks(first, 1);
    expect(second.unlocked).toEqual([]);
    expect(second.world.products[0].vitesse).toBe(250);
  });

  it('allunlock : seulement quand TOUS les produits atteignent le seuil, bonus sur tous', () => {
    const world = makeWorld();
    world.products[0].quantite = 25;
    expect(applyUnlocks(world, 1).world.allunlocks[0].unlocked).toBe(false);
    world.products[1].quantite = 25;
    const { world: next, unlocked } = applyUnlocks(world, 2);
    expect(unlocked.map((p) => p.name)).toEqual(['Unlock 2.1', 'All 1']);
    expect(next.allunlocks[0].unlocked).toBe(true);
    expect(next.products.map((p) => p.revenu)).toEqual([2, 120]);
  });

  it('seuil non atteint → rien', () => {
    const { world, unlocked } = applyUnlocks(makeWorld(), 1);
    expect(unlocked).toEqual([]);
    expect(world.products[0].vitesse).toBe(500);
  });
});

describe('bonusLabel / affordableCount', () => {
  it('effet en toutes lettres', () => {
    expect(bonusLabel({ ratio: 3, typeratio: RatioType.Gain })).toBe('revenus ×3');
    expect(bonusLabel({ ratio: 2, typeratio: RatioType.Vitesse })).toBe('vitesse ×2');
    expect(bonusLabel({ ratio: 1, typeratio: RatioType.Ange })).toBe('anges +1 %');
  });

  it('compte les paliers verrouillés payables (seuil ≤ solde)', () => {
    const paliers = [
      makePalier('a', 1000, 1, 1, RatioType.Gain),
      makePalier('b', 15000, 2, 1, RatioType.Gain),
      { ...makePalier('c', 10, 1, 1, RatioType.Gain), unlocked: true },
    ];
    expect(affordableCount(paliers, 999)).toBe(0);
    expect(affordableCount(paliers, 1000)).toBe(1);
    expect(affordableCount(paliers, 1e6)).toBe(2);
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
