import { TestBed } from '@angular/core/testing';
import { Apollo } from '@apollo-orbit/angular';
import {
  DEFAULT_DISPLAY,
  DISPLAY_STORAGE_KEY,
  LEGACY_FLICKER_STORAGE_KEY,
  LEGACY_GLOW_STORAGE_KEY,
  LEGACY_SCANLINES_STORAGE_KEY,
} from './display-settings';
import {
  GameService,
  LEGACY_USER_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  readStoredUsername,
} from './game.service';
import { makeWorld, stubApollo } from './test-world';

const KEYS = [
  USERNAME_STORAGE_KEY,
  LEGACY_USER_STORAGE_KEY,
  DISPLAY_STORAGE_KEY,
  LEGACY_SCANLINES_STORAGE_KEY,
  LEGACY_GLOW_STORAGE_KEY,
  LEGACY_FLICKER_STORAGE_KEY,
];

function clearStorage(): void {
  KEYS.forEach((key) => localStorage.removeItem(key));
}

// Laisse passer les promesses des mutations (le stub résout immédiatement).
async function flush(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

describe('readStoredUsername (F-23)', () => {
  beforeEach(clearStorage);

  it('pseudo mémorisé sous « username »', () => {
    localStorage.setItem(USERNAME_STORAGE_KEY, 'alice');
    expect(readStoredUsername()).toBe('alice');
  });

  it('ancienne clé de la phase 9 : reprise puis supprimée', () => {
    localStorage.setItem(LEGACY_USER_STORAGE_KEY, 'lucas');
    expect(readStoredUsername()).toBe('lucas');
    expect(localStorage.getItem(LEGACY_USER_STORAGE_KEY)).toBeNull();
  });

  it('aucun pseudo → Captain<n> aléatoire', () => {
    expect(readStoredUsername(() => 0.1234)).toBe('Captain1234');
    expect(readStoredUsername(() => 0)).toBe('Captain0');
  });
});

describe('GameService', () => {
  let stub: ReturnType<typeof stubApollo>;
  let game: GameService;

  function setup(world = makeWorld()): void {
    stub = stubApollo();
    TestBed.configureTestingModule({
      providers: [GameService, { provide: Apollo, useValue: stub.apollo }],
    });
    game = TestBed.inject(GameService);
    // Base de temps de calcScore posée avant le chargement du monde (aucun produit n'avance).
    game.calcScore(10_000);
    stub.data.set({ getWorld: world });
  }

  beforeEach(() => {
    clearStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pseudo', () => {
    it('au démarrage : pseudo posé dans le formulaire et validé, puis mémorisé', () => {
      localStorage.setItem(USERNAME_STORAGE_KEY, 'bob');
      setup();
      expect(game.user()).toBe('bob');
      expect(game.loginForm.name().value()).toBe('bob');
      expect(localStorage.getItem(USERNAME_STORAGE_KEY)).toBe('bob');
    });

    it('sans pseudo : Captain<n> mémorisé, pour retrouver la partie au rechargement', () => {
      setup();
      expect(game.user()).toMatch(/^Captain\d+$/);
      expect(localStorage.getItem(USERNAME_STORAGE_KEY)).toBe(game.user());
    });

    it('commitName : bascule sur le pseudo saisi (espaces retirés), vide ignoré', () => {
      setup();
      game.loginForm.name().value.set('  carol ');
      game.commitName();
      expect(game.user()).toBe('carol');
      expect(localStorage.getItem(USERNAME_STORAGE_KEY)).toBe('carol');
      game.loginForm.name().value.set('   ');
      game.commitName();
      expect(game.user()).toBe('carol');
    });

    it('refreshWorld relance getWorld (bouton Refresh, F-24)', () => {
      setup();
      game.refreshWorld();
      expect(stub.refetches()).toBe(1);
    });
  });

  describe('monde', () => {
    it('world suit la réponse de getWorld et garde le dernier monde pendant un rechargement', () => {
      setup();
      expect(game.world()?.name).toBe('World');
      stub.data.set(undefined);
      expect(game.world()?.name).toBe('World');
      const other = makeWorld();
      other.name = 'Autre';
      stub.data.set({ getWorld: other });
      expect(game.world()?.name).toBe('Autre');
    });

    it('échec de getWorld → message éphémère', () => {
      setup();
      stub.error.set(new Error('backend arrêté'));
      TestBed.tick();
      expect(game.snackmessage()).toBe('Erreur de chargement du monde : backend arrêté');
    });
  });

  describe('boucle principale calcScore (F-11, F-12)', () => {
    it('production manuelle terminée : argent ET score crédités une fois', () => {
      const world = makeWorld();
      world.products[0].timeleft = 300;
      setup(world);
      game.calcScore(10_200);
      expect(game.world()!.products[0].timeleft).toBe(100);
      expect(game.world()!.money).toBe(0);
      game.calcScore(10_400);
      expect(game.world()!.products[0].timeleft).toBe(0);
      expect(game.world()!.money).toBe(1);
      expect(game.world()!.score).toBe(1);
      game.calcScore(12_000);
      expect(game.world()!.money).toBe(1);
    });

    it('manager : la production tourne en boucle, n cycles crédités', () => {
      const world = makeWorld();
      world.products[0].quantite = 10;
      world.products[0].managerUnlocked = true;
      setup(world);
      game.calcScore(11_200); // 1200 ms à 500 ms par cycle → 2 productions, 300 ms restants
      expect(game.world()!.money).toBe(20);
      expect(game.world()!.products[0].timeleft).toBe(300);
    });

    it('productionDone applique le bonus des anges (F-30)', () => {
      const world = makeWorld();
      world.activeangels = 50;
      setup(world);
      game.productionDone(game.world()!.products[0], 3);
      expect(game.world()!.money).toBe(6); // 3 × 1 × (1 + 50 × 2 / 100)
      expect(game.world()!.score).toBe(6);
    });

    it('la boucle tourne toute seule toutes les 100 ms', () => {
      const world = makeWorld();
      world.products[0].timeleft = 500;
      setup(world);
      vi.advanceTimersByTime(300);
      expect(game.world()!.products[0].timeleft).toBeLessThan(500);
    });
  });

  describe('actions appliquées localement puis transmises', () => {
    it('startProduction : timeleft = vitesse puis lancerProductionProduit', async () => {
      setup();
      game.startProduction(game.world()!.products[0]);
      expect(game.world()!.products[0].timeleft).toBe(500);
      await flush();
      expect(stub.sent).toEqual([
        { operation: 'LancerProductionProduit', variables: { user: game.user(), id: 1 } },
      ]);
    });

    it('startProduction ignoré : 0 exemplaire, déjà en cours, ou automatisé', async () => {
      const world = makeWorld();
      world.products[0].managerUnlocked = true;
      setup(world);
      game.startProduction(game.world()!.products[1]); // quantite 0
      game.startProduction(game.world()!.products[0]); // automatisé
      await flush();
      expect(stub.sent).toEqual([]);
    });

    it('buyProduct : argent, quantité, coût du prochain, unlock + message, mutation', async () => {
      const world = makeWorld();
      world.money = 1000;
      setup(world);
      game.buyProduct(24, game.world()!.products[0]);
      const after = game.world()!;
      expect(after.products[0].quantite).toBe(25);
      expect(after.products[0].cout).toBeCloseTo(4 * Math.pow(1.07, 24), 9);
      expect(after.money).toBeCloseTo(1000 - (4 * (Math.pow(1.07, 24) - 1)) / 0.07, 9);
      expect(after.products[0].vitesse).toBe(250);
      expect(game.snackmessage()).toBe('Palier débloqué : Unlock 1.1 (vitesse ×2)');
      await flush();
      expect(stub.sent).toEqual([
        { operation: 'AcheterQtProduit', variables: { user: game.user(), id: 1, quantite: 24 } },
      ]);
    });

    it('buyProduct trop cher : rien ne change, rien n’est envoyé', async () => {
      setup();
      game.buyProduct(1, game.world()!.products[0]);
      expect(game.world()!.products[0].quantite).toBe(1);
      await flush();
      expect(stub.sent).toEqual([]);
    });

    it('hireManager : argent débité, manager et produit débloqués, production lancée, message', async () => {
      const world = makeWorld();
      world.money = 1500;
      setup(world);
      game.hireManager(game.world()!.managers[0]);
      const after = game.world()!;
      expect(after.money).toBe(500);
      expect(after.managers[0].unlocked).toBe(true);
      expect(after.products[0].managerUnlocked).toBe(true);
      expect(after.products[0].timeleft).toBe(500);
      expect(game.snackmessage()).toBe('Manager 1 engagé : Item 1 est automatisé');
      await flush();
      expect(stub.sent[0]).toEqual({
        operation: 'EngagerManager',
        variables: { user: game.user(), name: 'Manager 1' },
      });
    });

    it('hireManager sans assez d’argent : ignoré', async () => {
      setup();
      game.hireManager(game.world()!.managers[0]);
      expect(game.world()!.managers[0].unlocked).toBe(false);
      await flush();
      expect(stub.sent).toEqual([]);
    });

    it('buyUpgrade : bonus appliqué, argent débité, message, mutation', async () => {
      const world = makeWorld();
      world.money = 1000;
      setup(world);
      game.buyUpgrade(game.world()!.upgrades[0]);
      expect(game.world()!.money).toBe(0);
      expect(game.world()!.upgrades[0].unlocked).toBe(true);
      expect(game.world()!.products[0].revenu).toBe(3);
      expect(game.snackmessage()).toBe('Upgrade acheté : Upgrade 1 (revenus ×3)');
      await flush();
      expect(stub.sent[0].operation).toBe('AcheterCashUpgrade');
    });

    it('buyAngelUpgrade : anges actifs débités, angelbonus augmenté, mutation', async () => {
      const world = makeWorld();
      world.activeangels = 15;
      world.totalangels = 15;
      setup(world);
      game.buyAngelUpgrade(game.world()!.angelupgrades[0]);
      expect(game.world()!.activeangels).toBe(5);
      expect(game.world()!.totalangels).toBe(15);
      expect(game.world()!.angelbonus).toBe(3);
      await flush();
      expect(stub.sent[0]).toEqual({
        operation: 'AcheterAngelUpgrade',
        variables: { user: game.user(), name: 'Angel Upgrade 1' },
      });
    });

    it('reset : mutation resetWorld, puis rechargement du monde et message', async () => {
      setup();
      await game.reset();
      expect(stub.sent[0].operation).toBe('ResetWorld');
      expect(stub.refetches()).toBe(1);
      expect(game.snackmessage()).toBe('Monde remis à zéro : 0 ange(s) gagné(s)');
    });

    it('échec de transmission : message avec le texte du serveur et rechargement (le serveur fait foi)', async () => {
      const world = makeWorld();
      world.money = 1000;
      setup(world);
      stub.failNext(new Error("Pas assez d'argent"));
      game.buyProduct(1, game.world()!.products[0]);
      await flush();
      expect(game.snackmessage()).toBe(
        "Erreur de transmission serveur pour l'achat du produit : Pas assez d'argent",
      );
      expect(stub.refetches()).toBe(1);
    });
  });

  describe('réglages CRT (D34)', () => {
    it('défauts persistés en JSON sous la clé unique', () => {
      setup();
      TestBed.tick();
      expect(game.display()).toEqual(DEFAULT_DISPLAY);
      expect(JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY)!)).toEqual(DEFAULT_DISPLAY);
    });

    it('modifier un réglage réécrit le JSON, relu au démarrage suivant', () => {
      setup();
      game.display.update((d) => ({ ...d, scanlines: false, tint: 'amber', glowLevel: 80 }));
      TestBed.tick();
      const stored = JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY)!);
      expect(stored).toEqual({ ...DEFAULT_DISPLAY, scanlines: false, tint: 'amber', glowLevel: 80 });
      TestBed.resetTestingModule();
      setup();
      expect(game.display()).toEqual(stored);
    });

    it("migration D22 : isiscapitalist.flicker = 'on' → flicker actif, ancienne clé supprimée", () => {
      localStorage.setItem(LEGACY_FLICKER_STORAGE_KEY, 'on');
      setup();
      TestBed.tick();
      expect(game.display()).toEqual({ ...DEFAULT_DISPLAY, flicker: true });
      expect(localStorage.getItem(LEGACY_FLICKER_STORAGE_KEY)).toBeNull();
    });
  });
});
