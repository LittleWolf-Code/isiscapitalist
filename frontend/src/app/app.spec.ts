import { TestBed } from '@angular/core/testing';
import { Apollo } from '@apollo-orbit/angular';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { App } from './app';
import { DISPLAY_STORAGE_KEY } from './display-settings';
import { TAB_STORAGE_KEY } from './tab-bar';
import { GameService, USERNAME_STORAGE_KEY, WorldData } from './game.service';
import { makeWorld, stubApollo } from './test-world';

// App avec le vrai GameService, Apollo remplacé par la doublure de test-world.ts (aucun serveur).
describe('App (mise en page du sujet, F-04 → F-06)', () => {
  let stub: ReturnType<typeof stubApollo>;

  beforeEach(async () => {
    localStorage.setItem(USERNAME_STORAGE_KEY, 'test');
    localStorage.removeItem(DISPLAY_STORAGE_KEY);
    localStorage.removeItem(TAB_STORAGE_KEY);
    stub = stubApollo();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Apollo, useValue: stub.apollo },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    }).compileComponents();
  });

  async function render(world?: WorldData) {
    if (world) {
      stub.data.set({ getWorld: world });
    }
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      app: fixture.componentInstance,
      game: TestBed.inject(GameService),
      menu: (id: string) => el.querySelector(`.menu-button[data-window="${id}"]`) as HTMLButtonElement,
      badge: (id: string) => {
        const button = el.querySelector(`.menu-button[data-window="${id}"]`)!;
        return button.classList.contains('mat-badge-hidden')
          ? null
          : button.querySelector('.mat-badge-content')?.textContent?.trim();
      },
    };
  }

  it('sans monde : en-tête (argent 0, multiplicateur, pseudo, Refresh), 6 boutons à gauche, aucun produit', async () => {
    const { el } = await render();
    expect(el.textContent).toContain('aucun monde chargé');
    expect(el.querySelector('#money')?.textContent).toBe('0.00');
    expect(el.querySelector('.multiplier')?.textContent?.trim()).toBe('Buy x1');
    expect((el.querySelector('.user-field input') as HTMLInputElement).value).toBe('test');
    expect(el.querySelector('button.refresh')?.textContent?.trim()).toBe('Refresh');
    expect(Array.from(el.querySelectorAll('.menu-button .mdc-button__label')).map((b) => b.textContent!.trim())).toEqual([
      'Unlocks',
      'Cash Upgrades',
      'Angel Upgrades',
      'Managers',
      'Investors',
      'Paramètres',
    ]);
    expect(el.querySelector('app-product-card')).toBeNull();
  });

  it('monde chargé : logo et nom du monde, argent en puissance de dix, un composant produit par produit', async () => {
    const world = makeWorld();
    world.money = 1_234_567;
    const { el } = await render(world);
    expect(el.querySelector('.world-name')?.textContent).toBe('World');
    expect(el.querySelector('.world app-game-icon img')?.getAttribute('src')).toBe('http://localhost:3000/icones/world.png');
    expect(el.querySelector('#money')?.innerHTML).toBe('1.235 × 10<sup>6</sup>');
    expect(el.querySelectorAll('.products app-product-card').length).toBe(2);
  });

  it('multiplicateur : un bouton qui cycle x1 → x10 → x100 → Max → x1, transmis aux produits (F-13)', async () => {
    const world = makeWorld();
    world.money = 100;
    const { el, fixture, app } = await render(world);
    const multi = el.querySelector('.multiplier') as HTMLButtonElement;
    const labels: string[] = [];
    for (let i = 0; i < 4; i++) {
      multi.click();
      await fixture.whenStable();
      labels.push(multi.textContent!.trim());
    }
    expect(labels).toEqual(['Buy x10', 'Buy x100', 'Buy Max', 'Buy x1']);
    multi.click();
    multi.click();
    multi.click();
    await fixture.whenStable();
    expect(app.qtmulti()).toBe('max');
    expect(el.querySelector('app-product-card button.buy')?.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^x14 — /);
  });

  it('badges : managers, cash upgrades et angel upgrades achetables, anges à réclamer (F-21, F-27, F-31)', async () => {
    const world = makeWorld();
    world.money = 1000;
    world.activeangels = 10;
    const { badge, fixture, game } = await render(world);
    expect(badge('managers')).toBe('1');
    expect(badge('upgrades')).toBe('1');
    expect(badge('angelupgrades')).toBe('1');
    expect(badge('investors')).toBeNull();
    expect(badge('unlocks')).toBeNull();
    game.world.update((w) => w && { ...w, money: 999, activeangels: 0, score: 1e15 });
    await fixture.whenStable();
    expect(badge('managers')).toBeNull();
    expect(badge('upgrades')).toBeNull();
    expect(badge('angelupgrades')).toBeNull();
    expect(badge('investors')).toBe('150');
  });

  it('fenêtre Managers : superposée, managers non engagés, Hire ! engage, Close ferme (F-18, F-19)', async () => {
    const world = makeWorld();
    world.money = 1000;
    const { el, fixture, menu, game } = await render(world);
    menu('managers').click();
    await fixture.whenStable();
    const modal = el.querySelector('app-modal')!;
    expect(modal.querySelector('h2')?.textContent?.trim()).toBe('Managers make you feel better !');
    const hire = modal.querySelector('tr.mat-mdc-row button') as HTMLButtonElement;
    hire.click();
    await fixture.whenStable();
    expect(game.world()!.managers[0].unlocked).toBe(true);
    expect(Array.from(modal.querySelectorAll('td.name')).map((td) => td.textContent!.trim())).toEqual(['Manager 2']);
    (modal.querySelector('button.closebutton') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-modal')).toBeNull();
  });

  it('fenêtres Unlocks, Cash Upgrades, Angel Upgrades et Investors', async () => {
    const { el, fixture, menu } = await render(makeWorld());
    const titles: string[] = [];
    for (const id of ['unlocks', 'upgrades', 'angelupgrades', 'investors']) {
      menu(id).click();
      await fixture.whenStable();
      titles.push(el.querySelector('app-modal h2')!.textContent!.trim());
    }
    expect(titles).toEqual(['Unlocks', 'Cash Upgrades', 'Angel Upgrades', 'Angel Investors']);
    // Une seule fenêtre à la fois : la dernière ouverte.
    expect(el.querySelectorAll('app-modal').length).toBe(1);
    expect(el.querySelector('app-modal app-angels-panel')).not.toBeNull();
  });

  it('Investors : reset après confirmation, puis rechargement du monde (F-29)', async () => {
    const { el, fixture, menu } = await render(makeWorld());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    menu('investors').click();
    await fixture.whenStable();
    (el.querySelector('app-angels-panel button.reset') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(confirmSpy).toHaveBeenCalledWith('Remettre à zéro la partie de « test » ? Vous gagnerez 0 ange(s).');
    expect(stub.sent.map((m) => m.operation)).toEqual(['ResetWorld']);
    expect(stub.refetches()).toBe(1);
    expect(el.querySelector('app-modal')).toBeNull();
    confirmSpy.mockRestore();
  });

  it('Paramètres s’ouvre même sans monde, avec 8 interrupteurs et 3 curseurs', async () => {
    const { el, fixture, menu } = await render();
    menu('settings').click();
    await fixture.whenStable();
    expect(el.querySelector('app-modal h2')?.textContent?.trim()).toBe('Paramètres');
    expect(el.querySelectorAll('app-settings-panel mat-slide-toggle').length).toBe(8);
    expect(el.querySelectorAll('app-settings-panel mat-slider').length).toBe(3);
  });

  it('message éphémère : chaque snackmessage ouvre un snack-bar (F-20)', async () => {
    const { fixture, game } = await render(makeWorld());
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    game.snackmessage.set('Manager 1 engagé : Item 1 est automatisé');
    await fixture.whenStable();
    game.snackmessage.set('Manager 1 engagé : Item 1 est automatisé');
    await fixture.whenStable();
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith('Manager 1 engagé : Item 1 est automatisé', 'ok', { duration: 2000 });
  });

  it('classes crt-* par défaut sur app-root (statiques on, animées off), data-tint et variables --crt-*', async () => {
    const { el: host, fixture, game } = await render();
    const on = ['crt-scanlines', 'crt-glow', 'crt-vignette', 'crt-grid', 'crt-grain'];
    const off = ['crt-flicker', 'crt-roll', 'crt-noise'];
    on.forEach((c) => expect(host.classList.contains(c), c).toBe(true));
    off.forEach((c) => expect(host.classList.contains(c), c).toBe(false));
    expect(host.getAttribute('data-tint')).toBe('green');
    expect(host.getAttribute('style')).toContain('--crt-glow: 0.5');
    expect(host.querySelector(':scope > .crt-overlay')?.getAttribute('aria-hidden')).toBe('true');

    game.display.update((d) => ({ ...d, flicker: true, scanlines: false, tint: 'amber', glowLevel: 100 }));
    await fixture.whenStable();
    expect(host.classList.contains('crt-flicker')).toBe(true);
    expect(host.classList.contains('crt-scanlines')).toBe(false);
    expect(host.getAttribute('data-tint')).toBe('amber');
    expect(host.getAttribute('style')).toContain('--crt-glow: 1');
  });

  // Disposition « onglets » (D37) : barre du haut à cases de stats, barre d'onglets en bas.
  describe('disposition « onglets »', () => {
    async function renderTabs(world: WorldData) {
      const view = await render(world);
      view.game.display.update((d) => ({ ...d, layout: 'onglets' }));
      await view.fixture.whenStable();
      const tab = async (id: string) => {
        (view.el.querySelector(`a.tab[data-tab="${id}"]`) as HTMLElement).click();
        await view.fixture.whenStable();
      };
      return { ...view, tab };
    }

    it('barre du haut (stats, multiplicateur en 4 boutons), 6 onglets en bas, écran Produits', async () => {
      const world = makeWorld();
      world.money = 1000;
      const { el, app, fixture } = await renderTabs(world);
      expect(el.classList.contains('layout-onglets')).toBe(true);
      expect(el.querySelector('.menu')).toBeNull();
      expect(Array.from(el.querySelectorAll('.stat dt')).map((d) => d.textContent)).toEqual(['argent', 'score', 'anges', 'bonus']);
      expect(el.querySelectorAll('app-tab-bar a.tab').length).toBe(6);
      expect(el.querySelectorAll('.screen .product-grid app-product-card').length).toBe(2);
      const toggles = Array.from(el.querySelectorAll<HTMLElement>('.multiplier-toggle mat-button-toggle'));
      expect(toggles.map((t) => t.textContent?.trim())).toEqual(['x1', 'x10', 'x100', 'Max']);
      toggles[1].querySelector('button')!.click();
      await fixture.whenStable();
      expect(app.qtmulti()).toBe(10);
    });

    it('un écran par onglet, badges sur Managers / Upgrades / Anges, onglet mémorisé', async () => {
      const world = makeWorld();
      world.money = 1000;
      world.activeangels = 10;
      const { el, tab, fixture } = await renderTabs(world);
      const badge = (id: string) => {
        const host = el.querySelector(`a.tab[data-tab="${id}"] .mat-badge`)!;
        return host.classList.contains('mat-badge-hidden') ? null : host.querySelector('.mat-badge-content')?.textContent?.trim();
      };
      expect([badge('managers'), badge('upgrades'), badge('angels'), badge('products')]).toEqual(['1', '1', '1', null]);
      await tab('managers');
      expect(el.querySelector('.screen h2')?.textContent).toBe('Managers');
      expect(el.querySelectorAll('.screen app-palier-list tr.mat-mdc-row').length).toBe(2);
      await tab('angels');
      expect(el.querySelector('.screen app-angels-panel')).not.toBeNull();
      expect(el.querySelector('.screen h3')?.textContent).toBe('Angel Upgrades');
      await tab('unlocks');
      expect(el.querySelector('.screen app-unlock-list')).not.toBeNull();
      await fixture.whenStable();
      expect(localStorage.getItem(TAB_STORAGE_KEY)).toBe('unlocks');
    });

    it('changer de disposition dans Paramètres garde le joueur sur ses réglages, dans les deux sens', async () => {
      const { el, fixture, menu, app } = await render(makeWorld());
      menu('settings').click();
      await fixture.whenStable();
      const layoutButton = (i: number) =>
        el.querySelectorAll<HTMLElement>('app-settings-panel .layout mat-button-toggle')[i].querySelector('button')!;
      layoutButton(1).click();
      await fixture.whenStable();
      expect(app.layout()).toBe('onglets');
      expect(el.querySelector('app-modal')).toBeNull();
      expect(app.tab()).toBe('settings');
      expect(el.querySelector('.screen app-settings-panel h2')?.textContent?.trim()).toBe('Paramètres');

      layoutButton(0).click();
      await fixture.whenStable();
      expect(app.layout()).toBe('sujet');
      expect(el.querySelector('app-tab-bar')).toBeNull();
      expect(el.querySelector('app-modal h2')?.textContent?.trim()).toBe('Paramètres');
      // Dans la fenêtre, le panneau ne répète pas le titre.
      expect(el.querySelector('app-modal app-settings-panel h2')).toBeNull();
    });
  });
});
