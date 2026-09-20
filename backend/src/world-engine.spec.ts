// Tests unitaires du moteur (phase 4.3). Fonctions pures : pas de Nest, pas de disque,
// `now` injecté explicitement (D10). Item 1 d'origworld : quantite 1, revenu 1, vitesse 500.
import { describe, expect, it } from 'vitest';
import { origworld } from './origworld.js';
import { Palier, RatioType, World } from './graphql.js';
import {
  angelsEarned,
  applyBonus,
  buyCost,
  buyUpgrade,
  checkAllUnlocks,
  checkProductUnlocks,
  productionGain,
  resetWorld,
  SCORE_PER_ANGEL,
  updateWorld,
} from './world-engine.js';

// Monde de test : clone d'origworld, Item 1 forcé à quantite 11 (gain = 11 sans ange),
// lastupdate 10 000 ms. `now = 10_000 + elapsed` dans chaque cas.
function makeWorld(patch: Partial<World['products'][0]> = {}): World {
  const world = structuredClone(origworld);
  world.lastupdate = 10_000;
  Object.assign(
    world.products[0],
    { quantite: 11, timeleft: 0, managerUnlocked: false },
    patch,
  );
  return world;
}

describe('buyCost', () => {
  it('Item 1, q = 10 → 4 × (1.07^10 − 1) / 0.07 ≈ 55.27', () => {
    const product = structuredClone(origworld).products[0];
    expect(buyCost(product, 10)).toBeCloseTo(55.27, 2);
  });
});

describe('productionGain', () => {
  it('sans ange : quantite × revenu', () => {
    const world = makeWorld();
    expect(productionGain(world, world.products[0])).toBe(11);
  });

  it('anges : activeangels 300, angelbonus 2 → 11 × (1 + 6) = 77', () => {
    const world = makeWorld();
    world.activeangels = 300;
    world.angelbonus = 2;
    expect(productionGain(world, world.products[0])).toBe(77);
  });
});

describe('updateWorld', () => {
  it('sans manager, production terminée : timeleft 300, elapsed 1000 → +11, timeleft 0', () => {
    const world = makeWorld({ timeleft: 300 });
    updateWorld(world, 11_000);
    expect(world.money).toBe(11);
    expect(world.score).toBe(11);
    expect(world.products[0].timeleft).toBe(0);
    expect(world.lastupdate).toBe(11_000);
  });

  it('sans manager, production partielle : timeleft 800, elapsed 300 → +0, timeleft 500', () => {
    const world = makeWorld({ timeleft: 800 });
    updateWorld(world, 10_300);
    expect(world.money).toBe(0);
    expect(world.products[0].timeleft).toBe(500);
  });

  it('sans manager, inactif : timeleft 0, elapsed 5000 → rien', () => {
    const world = makeWorld({ timeleft: 0 });
    updateWorld(world, 15_000);
    expect(world.money).toBe(0);
    expect(world.score).toBe(0);
    expect(world.products[0].timeleft).toBe(0);
    expect(world.lastupdate).toBe(15_000);
  });

  it('manager, en cours : timeleft 200, elapsed 1700 → n = 4, +44, timeleft 500', () => {
    const world = makeWorld({ timeleft: 200, managerUnlocked: true });
    updateWorld(world, 11_700);
    expect(world.money).toBe(44);
    expect(world.score).toBe(44);
    expect(world.products[0].timeleft).toBe(500);
  });

  it('manager, inactif au départ : timeleft 0, elapsed 1200 → n = 2, +22, timeleft 300', () => {
    const world = makeWorld({ timeleft: 0, managerUnlocked: true });
    updateWorld(world, 11_200);
    expect(world.money).toBe(22);
    expect(world.products[0].timeleft).toBe(300);
  });

  it('premier accès : lastupdate 0 → elapsed 0, rien ne bouge, lastupdate = now', () => {
    const world = makeWorld({ timeleft: 300 });
    world.lastupdate = 0;
    updateWorld(world, 11_000);
    expect(world.money).toBe(0);
    expect(world.products[0].timeleft).toBe(300);
    expect(world.lastupdate).toBe(11_000);
  });

  it('anges : activeangels 300, angelbonus 2 → une production rapporte 77', () => {
    const world = makeWorld({ timeleft: 300 });
    world.activeangels = 300;
    world.angelbonus = 2;
    updateWorld(world, 11_000);
    expect(world.money).toBe(77);
    expect(world.score).toBe(77);
  });

  it('elapsed négatif (horloge reculée) : traité comme 0', () => {
    const world = makeWorld({ timeleft: 300 });
    updateWorld(world, 9_000);
    expect(world.money).toBe(0);
    expect(world.products[0].timeleft).toBe(300);
    expect(world.lastupdate).toBe(9_000);
  });

  it('manager avec quantite 0 : les cycles tournent, argent inchangé', () => {
    const world = makeWorld({
      quantite: 0,
      timeleft: 0,
      managerUnlocked: true,
    });
    updateWorld(world, 11_200);
    expect(world.money).toBe(0);
    expect(world.products[0].timeleft).toBe(300);
  });

  it('grand elapsed (3 jours, manager) : n = 518 400 cycles en O(1)', () => {
    const threeDays = 3 * 24 * 3600 * 1000;
    const world = makeWorld({ timeleft: 500, managerUnlocked: true });
    updateWorld(world, 10_000 + threeDays);
    // n = 1 + floor((elapsed − 500) / 500) = elapsed / 500 = 518 400
    expect(world.money).toBe(518_400 * 11);
    expect(world.products[0].timeleft).toBe(500);
  });

  it('retourne le monde muté (même référence) et utilise Date.now() par défaut', () => {
    const world = makeWorld();
    const before = Date.now();
    const result = updateWorld(world);
    expect(result).toBe(world);
    expect(world.lastupdate).toBeGreaterThanOrEqual(before);
  });

  it('invariant : après updateWorld, timeleft >= 0 et score ne diminue jamais', () => {
    const world = makeWorld({ timeleft: 350, managerUnlocked: true });
    world.products[1].quantite = 3;
    world.products[1].timeleft = 1234;
    let now = 10_000;
    let previousScore = world.score;
    // Suite d'elapsed variés (partiels, exacts, multiples, négatif, énorme).
    for (const step of [
      1, 149, 500, 1000, 1499, 1501, 3000, -50, 7, 86_400_000, 0, 499,
    ]) {
      now += step;
      updateWorld(world, now);
      expect(world.score).toBeGreaterThanOrEqual(previousScore);
      previousScore = world.score;
      for (const product of world.products) {
        expect(product.timeleft).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(product.timeleft)).toBe(true);
      }
    }
    expect(world.money).toBe(world.score);
  });
});

// Phase 5.3 — unlocks et bonus. Item 1 d'origworld : paliers 25 (vitesse ×2), 50 (gain ×2),
// 100 (vitesse ×2) ; allunlocks 25 (gain ×2), 50 (gain ×3), 100 (vitesse ×2), idcible 0.
describe('unlocks', () => {
  // Palier de test hors origworld pour isoler applyBonus des données du monde.
  function palier(patch: Partial<Palier>): Palier {
    return {
      name: 'test',
      logo: '',
      seuil: 0,
      idcible: 1,
      ratio: 2,
      typeratio: RatioType.gain,
      unlocked: false,
      ...patch,
    };
  }

  // Monde neuf (Item 1 quantite 1, vitesse 500, revenu 1), sans forcer quantite 11.
  function freshWorld(): World {
    return structuredClone(origworld);
  }

  describe('applyBonus', () => {
    it('gain, cible id : revenu du produit × ratio, les autres inchangés', () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.gain, idcible: 2, ratio: 3 }),
      );
      expect(world.products[1].revenu).toBe(180);
      expect(world.products[0].revenu).toBe(1);
    });

    it('vitesse, cible id : vitesse = floor(vitesse / ratio), timeleft plafonné', () => {
      const world = freshWorld();
      world.products[0].timeleft = 400;
      applyBonus(
        world,
        palier({ typeratio: RatioType.vitesse, idcible: 1, ratio: 2 }),
      );
      expect(world.products[0].vitesse).toBe(250);
      expect(world.products[0].timeleft).toBe(250);
    });

    it('vitesse : un timeleft déjà inférieur à la nouvelle vitesse est conservé', () => {
      const world = freshWorld();
      world.products[0].timeleft = 100;
      applyBonus(
        world,
        palier({ typeratio: RatioType.vitesse, idcible: 1, ratio: 2 }),
      );
      expect(world.products[0].timeleft).toBe(100);
    });

    it('vitesse : ne descend jamais sous 1 ms', () => {
      const world = freshWorld();
      world.products[0].vitesse = 3;
      applyBonus(
        world,
        palier({ typeratio: RatioType.vitesse, idcible: 1, ratio: 10 }),
      );
      expect(world.products[0].vitesse).toBe(1);
    });

    it('gain, cible 0 : tous les produits', () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.gain, idcible: 0, ratio: 2 }),
      );
      expect(world.products.map((p) => p.revenu)).toEqual([
        2, 120, 1080, 8640, 103680, 1244160,
      ]);
    });

    it('vitesse, cible 0 : tous les produits', () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.vitesse, idcible: 0, ratio: 2 }),
      );
      expect(world.products.map((p) => p.vitesse)).toEqual([
        250, 1500, 3000, 6000, 24000, 60000,
      ]);
    });

    it('ange, cible -1 : angelbonus += ratio, produits inchangés', () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.ange, idcible: -1, ratio: 1 }),
      );
      expect(world.angelbonus).toBe(3);
      expect(world.products[0].revenu).toBe(1);
      expect(world.products[0].vitesse).toBe(500);
    });

    it("ange avec cible id ou 0 : s'applique quand même au monde", () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.ange, idcible: 1, ratio: 2 }),
      );
      applyBonus(
        world,
        palier({ typeratio: RatioType.ange, idcible: 0, ratio: 0.5 }),
      );
      expect(world.angelbonus).toBe(4.5);
      expect(world.products[0].revenu).toBe(1);
    });

    it('gain / vitesse avec cible -1 : aucun effet', () => {
      const world = freshWorld();
      applyBonus(
        world,
        palier({ typeratio: RatioType.gain, idcible: -1, ratio: 5 }),
      );
      applyBonus(
        world,
        palier({ typeratio: RatioType.vitesse, idcible: -1, ratio: 5 }),
      );
      expect(world.products.map((p) => p.revenu)).toEqual(
        origworld.products.map((p) => p.revenu),
      );
      expect(world.products.map((p) => p.vitesse)).toEqual(
        origworld.products.map((p) => p.vitesse),
      );
      expect(world.angelbonus).toBe(2);
    });

    it('ne modifie pas palier.unlocked (responsabilité des checks)', () => {
      const world = freshWorld();
      const p = palier({ typeratio: RatioType.gain, idcible: 1 });
      applyBonus(world, p);
      expect(p.unlocked).toBe(false);
    });
  });

  describe('checkProductUnlocks', () => {
    it('seuil atteint exactement (25) : Unlock 1.1 débloqué, vitesse 500 → 250', () => {
      const world = freshWorld();
      const item = world.products[0];
      item.quantite = 25;
      const unlocked = checkProductUnlocks(world, item);
      expect(unlocked.map((p) => p.name)).toEqual(['Unlock 1.1']);
      expect(item.paliers[0].unlocked).toBe(true);
      expect(item.paliers[1].unlocked).toBe(false);
      expect(item.paliers[2].unlocked).toBe(false);
      expect(item.vitesse).toBe(250);
      expect(item.revenu).toBe(1);
    });

    it('seuil non atteint (24) : rien', () => {
      const world = freshWorld();
      const item = world.products[0];
      item.quantite = 24;
      expect(checkProductUnlocks(world, item)).toEqual([]);
      expect(item.paliers.every((p) => !p.unlocked)).toBe(true);
      expect(item.vitesse).toBe(500);
    });

    it('plusieurs seuils en un achat (1 → 120) : les trois, chacun une fois', () => {
      const world = freshWorld();
      const item = world.products[0];
      item.quantite = 120;
      const unlocked = checkProductUnlocks(world, item);
      expect(unlocked.map((p) => p.name)).toEqual([
        'Unlock 1.1',
        'Unlock 1.2',
        'Unlock 1.3',
      ]);
      expect(item.vitesse).toBe(125); // 500 → 250 → 125
      expect(item.revenu).toBe(2);
    });

    it('pas de double application : second appel sans effet', () => {
      const world = freshWorld();
      const item = world.products[0];
      item.quantite = 25;
      checkProductUnlocks(world, item);
      expect(checkProductUnlocks(world, item)).toEqual([]);
      expect(item.vitesse).toBe(250);
      item.quantite = 26;
      expect(checkProductUnlocks(world, item)).toEqual([]);
      expect(item.vitesse).toBe(250);
    });

    it('palier déjà unlocked (fichier existant) : jamais réappliqué', () => {
      const world = freshWorld();
      const item = world.products[0];
      item.paliers[0].unlocked = true;
      item.quantite = 30;
      expect(checkProductUnlocks(world, item)).toEqual([]);
      expect(item.vitesse).toBe(500);
    });

    it('ne touche pas aux autres produits ni aux allunlocks', () => {
      const world = freshWorld();
      world.products[0].quantite = 100;
      checkProductUnlocks(world, world.products[0]);
      expect(world.products[1].vitesse).toBe(3000);
      expect(world.allunlocks.every((p) => !p.unlocked)).toBe(true);
    });
  });

  describe('checkAllUnlocks', () => {
    it("refusé tant qu'un produit est en dessous (Item 1 à 25, les autres à 0)", () => {
      const world = freshWorld();
      world.products[0].quantite = 25;
      expect(checkAllUnlocks(world)).toEqual([]);
      expect(world.allunlocks[0].unlocked).toBe(false);
      expect(world.products[0].revenu).toBe(1);
    });

    it('refusé si un seul produit est à 24 alors que les cinq autres sont à 25', () => {
      const world = freshWorld();
      for (const p of world.products) p.quantite = 25;
      world.products[5].quantite = 24;
      expect(checkAllUnlocks(world)).toEqual([]);
    });

    it('accepté quand tous sont à 25 : All Unlock 1, les six revenu doublent', () => {
      const world = freshWorld();
      for (const p of world.products) p.quantite = 25;
      const unlocked = checkAllUnlocks(world);
      expect(unlocked.map((p) => p.name)).toEqual(['All Unlock 1']);
      expect(world.allunlocks[0].unlocked).toBe(true);
      expect(world.allunlocks[1].unlocked).toBe(false);
      expect(world.products.map((p) => p.revenu)).toEqual([
        2, 120, 1080, 8640, 103680, 1244160,
      ]);
    });

    it('plusieurs allunlocks en un coup (tous à 100) : gain ×2 puis ×3, vitesse /2', () => {
      const world = freshWorld();
      for (const p of world.products) p.quantite = 100;
      const unlocked = checkAllUnlocks(world);
      expect(unlocked).toHaveLength(3);
      expect(world.products[0].revenu).toBe(6);
      expect(world.products[0].vitesse).toBe(250);
    });

    it('pas de double application : second appel sans effet', () => {
      const world = freshWorld();
      for (const p of world.products) p.quantite = 25;
      checkAllUnlocks(world);
      expect(checkAllUnlocks(world)).toEqual([]);
      expect(world.products[0].revenu).toBe(2);
    });
  });

  it('scénario du prompt : achat de 24 sur un monde neuf', () => {
    const world = freshWorld();
    const item = world.products[0];
    world.money = 2000;
    world.money -= buyCost(item, 24);
    item.quantite += 24;
    checkProductUnlocks(world, item);
    checkAllUnlocks(world);
    expect(world.money).toBeCloseTo(1767.29, 2);
    expect(item.quantite).toBe(25);
    expect(item.vitesse).toBe(250);
    expect(item.revenu).toBe(1);
    expect(item.paliers.map((p) => p.unlocked)).toEqual([true, false, false]);
    expect(world.allunlocks[0].unlocked).toBe(false);
  });
});

// Phase 6 — upgrades. origworld : Upgrade 1 (1000 $, Item 1 gain ×3), Upgrade 6 (3.1e8 $) ;
// Angel Upgrade 1 (10 anges, ange +1), Angel Upgrade 2 (100 anges, tous gain ×2).
describe('buyUpgrade', () => {
  // Joueur du prompt : money 2000, activeangels 300, totalangels 300, angelbonus 2.
  function richWorld(): World {
    const world = structuredClone(origworld);
    world.money = 2000;
    world.activeangels = 300;
    world.totalangels = 300;
    world.angelbonus = 2;
    return world;
  }

  it('succès argent : Upgrade 1 → money 1000, Item 1 revenu 3, unlocked, palier retourné', () => {
    const world = richWorld();
    const palier = buyUpgrade(world, world.upgrades, 'Upgrade 1', 'money');
    expect(palier).toBe(world.upgrades[0]);
    expect(palier.unlocked).toBe(true);
    expect(world.money).toBe(1000);
    expect(world.products[0].revenu).toBe(3);
    expect(world.products[1].revenu).toBe(origworld.products[1].revenu);
    expect(world.activeangels).toBe(300);
  });

  it('succès anges : Angel Upgrade 1 → activeangels 290, totalangels inchangé, angelbonus 3', () => {
    const world = richWorld();
    const palier = buyUpgrade(
      world,
      world.angelupgrades,
      'Angel Upgrade 1',
      'activeangels',
    );
    expect(palier.unlocked).toBe(true);
    expect(world.activeangels).toBe(290);
    expect(world.totalangels).toBe(300);
    expect(world.angelbonus).toBe(3);
    expect(world.money).toBe(2000);
    // Gain d'Item 1 (quantite 1, revenu 1) : 1 × (1 + 290 × 3 / 100) = 9.7 (× revenu 3 = 29.1
    // dans l'exemple du prompt, après Upgrade 1).
    expect(productionGain(world, world.products[0])).toBeCloseTo(9.7, 10);
  });

  it('exemple du prompt : Upgrade 1 puis Angel Upgrade 1 → gain 21 → 29.1', () => {
    const world = richWorld();
    buyUpgrade(world, world.upgrades, 'Upgrade 1', 'money');
    expect(productionGain(world, world.products[0])).toBe(21);
    buyUpgrade(world, world.angelupgrades, 'Angel Upgrade 1', 'activeangels');
    expect(productionGain(world, world.products[0])).toBeCloseTo(29.1, 10);
    buyUpgrade(world, world.angelupgrades, 'Angel Upgrade 2', 'activeangels');
    expect(world.activeangels).toBe(190);
    expect(world.products.map((p) => p.revenu)).toEqual(
      origworld.products.map((p, i) => p.revenu * (i === 0 ? 6 : 2)),
    );
  });

  it("déjà achetée : second achat → erreur, rien n'est débité ni réappliqué", () => {
    const world = richWorld();
    buyUpgrade(world, world.upgrades, 'Upgrade 1', 'money');
    expect(() =>
      buyUpgrade(world, world.upgrades, 'Upgrade 1', 'money'),
    ).toThrow("L'upgrade Upgrade 1 est déjà achetée");
    expect(world.money).toBe(1000);
    expect(world.products[0].revenu).toBe(3);
  });

  it("ressource insuffisante : Upgrade 6 → « Pas assez d'argent », monde intact", () => {
    const world = richWorld();
    expect(() =>
      buyUpgrade(world, world.upgrades, 'Upgrade 6', 'money'),
    ).toThrow("Pas assez d'argent");
    expect(world.money).toBe(2000);
    expect(world.upgrades.find((u) => u.name === 'Upgrade 6')?.unlocked).toBe(
      false,
    );
  });

  it("anges insuffisants : activeangels 0 (jamais reset) → « Pas assez d'anges »", () => {
    const world = structuredClone(origworld);
    expect(world.activeangels).toBe(0);
    for (const u of world.angelupgrades) {
      expect(() =>
        buyUpgrade(world, world.angelupgrades, u.name, 'activeangels'),
      ).toThrow("Pas assez d'anges");
    }
    expect(world.angelbonus).toBe(origworld.angelbonus);
  });

  it('ressource exactement égale au seuil : accepté, solde 0', () => {
    const world = richWorld();
    world.money = 1000;
    buyUpgrade(world, world.upgrades, 'Upgrade 1', 'money');
    expect(world.money).toBe(0);
    world.activeangels = 10;
    buyUpgrade(world, world.angelupgrades, 'Angel Upgrade 1', 'activeangels');
    expect(world.activeangels).toBe(0);
  });

  it("nom inconnu ou d'une autre liste : « n'existe pas » (chaque mutation ne cherche que dans sa liste)", () => {
    const world = richWorld();
    expect(() =>
      buyUpgrade(world, world.upgrades, 'Angel Upgrade 1', 'money'),
    ).toThrow("L'upgrade Angel Upgrade 1 n'existe pas");
    expect(() =>
      buyUpgrade(world, world.angelupgrades, 'Upgrade 1', 'activeangels'),
    ).toThrow("L'upgrade Upgrade 1 n'existe pas");
    expect(() =>
      buyUpgrade(world, world.upgrades, 'Manager 1', 'money'),
    ).toThrow("L'upgrade Manager 1 n'existe pas");
    expect(world.money).toBe(2000);
    expect(world.activeangels).toBe(300);
  });
});

// Phase 7 — reset et anges. Formule (D20) : floor(score / 50) − totalangels, borné à 0
// (« 2 % du score », SCORE_PER_ANGEL = 50). Mêmes cas chiffrés que frontend/src/app/game-math.spec.ts.
describe('angelsEarned', () => {
  // Monde « joué » : argent, produits, paliers, upgrades, manager — tout doit disparaître au reset.
  function playedWorld(
    score: number,
    totalangels: number,
    activeangels: number,
  ): World {
    const world = structuredClone(origworld);
    world.score = score;
    world.totalangels = totalangels;
    world.activeangels = activeangels;
    world.money = 5000;
    world.lastupdate = 10_000;
    world.angelbonus = 3;
    world.products[0].quantite = 30;
    world.products[0].paliers[0].unlocked = true;
    world.products[0].vitesse = 250;
    world.products[0].timeleft = 100;
    world.products[0].managerUnlocked = true;
    world.products[2].quantite = 7;
    world.managers[0].unlocked = true;
    world.upgrades[0].unlocked = true;
    world.angelupgrades[0].unlocked = true;
    return world;
  }

  it('SCORE_PER_ANGEL = 50 (2 % du score)', () => {
    expect(SCORE_PER_ANGEL).toBe(50);
  });

  it('exemple 1 (monde réel) : score 8 019 386, totalangels 0 → 160387', () => {
    expect(angelsEarned(playedWorld(8_019_386, 0, 0))).toBe(160_387);
  });

  it('exemple 2 : score 12 000, totalangels 100 → 240 − 100 = 140', () => {
    expect(angelsEarned(playedWorld(12_000, 100, 60))).toBe(140);
  });

  it('exemple 3 (seuils) : 49 → 0, 50 → 1, 99 → 1, 100 → 2', () => {
    expect(angelsEarned(playedWorld(49, 0, 0))).toBe(0);
    expect(angelsEarned(playedWorld(50, 0, 0))).toBe(1);
    expect(angelsEarned(playedWorld(99, 0, 0))).toBe(1);
    expect(angelsEarned(playedWorld(100, 0, 0))).toBe(2);
  });

  it('score 0 → 0', () => {
    expect(angelsEarned(playedWorld(0, 0, 0))).toBe(0);
  });

  it('score inchangé après un reset (totalangels déjà à 160387) → 0', () => {
    expect(angelsEarned(playedWorld(8_019_386, 160_387, 160_387))).toBe(0);
  });

  it("jamais négatif : totalangels supérieur à la formule (mondes de l'ancienne formule) → 0", () => {
    expect(angelsEarned(playedWorld(1000, 300, 300))).toBe(0);
    expect(angelsEarned(playedWorld(49, 5, 5))).toBe(0);
  });

  describe('resetWorld', () => {
    it('exemple 1 : score 8 019 386, 0 ange → 160387/160387, money 0, produits et paliers réinitialisés', () => {
      const old = playedWorld(8_019_386, 0, 0);
      const fresh = resetWorld(old, 20_000);
      expect(fresh.score).toBe(8_019_386);
      expect(fresh.totalangels).toBe(160_387);
      expect(fresh.activeangels).toBe(160_387);
      expect(fresh.money).toBe(0);
      expect(fresh.lastupdate).toBe(20_000);
      expect(fresh.angelbonus).toBe(origworld.angelbonus);
      expect(fresh.products[0].quantite).toBe(1);
      expect(fresh.products[0].vitesse).toBe(500);
      expect(fresh.products[0].timeleft).toBe(0);
      expect(fresh.products[0].managerUnlocked).toBe(false);
      expect(fresh.products[0].paliers.every((p) => !p.unlocked)).toBe(true);
      expect(fresh.products.slice(1).every((p) => p.quantite === 0)).toBe(true);
      expect(fresh.managers.every((m) => !m.unlocked)).toBe(true);
      expect(fresh.upgrades.every((u) => !u.unlocked)).toBe(true);
      expect(fresh.angelupgrades.every((u) => !u.unlocked)).toBe(true);
    });

    it('second reset immédiat → 0 gagné, anges inchangés', () => {
      const first = resetWorld(playedWorld(8_019_386, 0, 0), 20_000);
      const second = resetWorld(first, 30_000);
      expect(second.totalangels).toBe(160_387);
      expect(second.activeangels).toBe(160_387);
      expect(second.score).toBe(8_019_386);
      expect(second.money).toBe(0);
    });

    it('exemple 2 : score 12 000, 100 total / 60 actifs (40 dépensés) → 240 / 200', () => {
      const fresh = resetWorld(playedWorld(12_000, 100, 60), 20_000);
      expect(fresh.totalangels).toBe(240);
      expect(fresh.activeangels).toBe(200);
      expect(fresh.score).toBe(12_000);
    });

    it('score 0 : reset possible, tout à zéro, aucun ange', () => {
      const fresh = resetWorld(playedWorld(0, 0, 0), 20_000);
      expect(fresh.score).toBe(0);
      expect(fresh.totalangels).toBe(0);
      expect(fresh.activeangels).toBe(0);
      expect(fresh.money).toBe(0);
      expect(fresh.products[0].quantite).toBe(1);
    });

    it("retourne un nouvel objet : l'ancien monde n'est pas muté", () => {
      const old = playedWorld(8_019_386, 0, 0);
      const snapshot = structuredClone(old);
      const fresh = resetWorld(old, 20_000);
      expect(fresh).not.toBe(old);
      expect(old).toEqual(snapshot);
      expect(fresh.products).not.toBe(old.products);
    });

    it('ne partage rien avec origworld : un achat après reset ne le corrompt pas', () => {
      const fresh = resetWorld(playedWorld(8_019_386, 0, 0), 20_000);
      expect(fresh.products).not.toBe(origworld.products);
      fresh.products[0].quantite = 99;
      fresh.products[0].paliers[0].unlocked = true;
      expect(origworld.products[0].quantite).toBe(1);
      expect(origworld.products[0].paliers[0].unlocked).toBe(false);
    });

    it('lastupdate = Date.now() par défaut', () => {
      const before = Date.now();
      const fresh = resetWorld(playedWorld(8_019_386, 0, 0));
      expect(fresh.lastupdate).toBeGreaterThanOrEqual(before);
    });

    // 7.2 : la formule de gain (phase 4) applique bien activeangels × angelbonus / 100 sur le
    // monde issu du reset. Score 5000 → 100 anges ; Item 1 : quantite 1, revenu 1,
    // 100 anges × 2 % → 1 × (1 + 2) = 3.
    it("7.2 : après reset avec 100 anges, une production d'Item 1 rapporte 3 au lieu de 1", () => {
      const fresh = resetWorld(playedWorld(5000, 0, 0), 20_000);
      expect(fresh.activeangels).toBe(100);
      expect(productionGain(fresh, fresh.products[0])).toBe(3);
      fresh.products[0].timeleft = 500;
      updateWorld(fresh, 20_500);
      expect(fresh.money).toBe(3);
      expect(fresh.score).toBe(5003);
    });
  });
});
