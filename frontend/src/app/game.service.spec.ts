import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Apollo } from '@apollo-orbit/angular';
import {
  DEFAULT_TAB,
  FLICKER_STORAGE_KEY,
  GLOW_STORAGE_KEY,
  GameService,
  SCANLINES_STORAGE_KEY,
  TAB_STORAGE_KEY,
  readStoredFlag,
  readStoredTab,
} from './game.service';

// Apollo remplacé par un stub : seuls `signal.query` (data/error/refetch) et `signal.mutation`
// (mutate) sont touchés par le constructeur ; aucun serveur en test.
function stubApollo() {
  return {
    signal: {
      query: () => ({
        data: signal(undefined),
        error: signal(undefined),
        refetch: () => Promise.resolve(),
      }),
      mutation: () => ({ mutate: () => Promise.resolve() }),
    },
  };
}

const FLAG_KEYS = [SCANLINES_STORAGE_KEY, GLOW_STORAGE_KEY, FLICKER_STORAGE_KEY];

function clearStorage(): void {
  localStorage.removeItem(TAB_STORAGE_KEY);
  FLAG_KEYS.forEach((key) => localStorage.removeItem(key));
}

describe('readStoredTab', () => {
  beforeEach(clearStorage);

  it("absent → onglet par défaut ('products')", () => {
    expect(DEFAULT_TAB).toBe('products');
    expect(readStoredTab()).toBe('products');
  });

  it("'upgrades' → 'upgrades'", () => {
    localStorage.setItem(TAB_STORAGE_KEY, 'upgrades');
    expect(readStoredTab()).toBe('upgrades');
  });

  it("'none' (ancien panneau fermé, D19) et valeur inconnue → 'products'", () => {
    localStorage.setItem(TAB_STORAGE_KEY, 'none');
    expect(readStoredTab()).toBe('products');
    localStorage.setItem(TAB_STORAGE_KEY, 'foo');
    expect(readStoredTab()).toBe('products');
  });
});

describe('readStoredFlag', () => {
  beforeEach(clearStorage);

  it('absent → valeur par défaut', () => {
    expect(readStoredFlag(SCANLINES_STORAGE_KEY, true)).toBe(true);
    expect(readStoredFlag(FLICKER_STORAGE_KEY, false)).toBe(false);
  });

  it("'off' → false, 'on' → true, inconnu → défaut", () => {
    localStorage.setItem(GLOW_STORAGE_KEY, 'off');
    expect(readStoredFlag(GLOW_STORAGE_KEY, true)).toBe(false);
    localStorage.setItem(GLOW_STORAGE_KEY, 'on');
    expect(readStoredFlag(GLOW_STORAGE_KEY, false)).toBe(true);
    localStorage.setItem(GLOW_STORAGE_KEY, 'maybe');
    expect(readStoredFlag(GLOW_STORAGE_KEY, true)).toBe(true);
  });
});

describe('GameService : onglet et réglages CRT', () => {
  beforeEach(() => {
    clearStorage();
    TestBed.configureTestingModule({
      providers: [GameService, { provide: Apollo, useValue: stubApollo() }],
    });
  });

  it("selectTab remplace l'onglet actif (re-clic sans effet) et le persiste", () => {
    const game = TestBed.inject(GameService);
    expect(game.activeTab()).toBe('products');
    game.selectTab('angels');
    TestBed.tick();
    expect(game.activeTab()).toBe('angels');
    expect(localStorage.getItem(TAB_STORAGE_KEY)).toBe('angels');
    game.selectTab('angels');
    TestBed.tick();
    expect(game.activeTab()).toBe('angels');
    expect(localStorage.getItem(TAB_STORAGE_KEY)).toBe('angels');
  });

  it('réglages CRT par défaut (on, on, off) persistés sous leurs trois clés', () => {
    const game = TestBed.inject(GameService);
    TestBed.tick();
    expect([game.scanlines(), game.glow(), game.flicker()]).toEqual([true, true, false]);
    expect(localStorage.getItem(SCANLINES_STORAGE_KEY)).toBe('on');
    expect(localStorage.getItem(GLOW_STORAGE_KEY)).toBe('on');
    expect(localStorage.getItem(FLICKER_STORAGE_KEY)).toBe('off');
  });

  it("modifier un réglage l'écrit ('off' / 'on') et il est relu au démarrage", () => {
    const game = TestBed.inject(GameService);
    game.scanlines.set(false);
    game.flicker.set(true);
    TestBed.tick();
    expect(localStorage.getItem(SCANLINES_STORAGE_KEY)).toBe('off');
    expect(localStorage.getItem(FLICKER_STORAGE_KEY)).toBe('on');
    expect(readStoredFlag(SCANLINES_STORAGE_KEY, true)).toBe(false);
    expect(readStoredFlag(FLICKER_STORAGE_KEY, false)).toBe(true);
  });
});
