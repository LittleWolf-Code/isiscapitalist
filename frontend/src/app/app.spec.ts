import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { App } from './app';
import { GameService, Tab, WorldData } from './game.service';

// Monde minimal pour la toolbar (D32) : nom, logo, stats ; aucune liste.
const world: WorldData = {
  name: 'World',
  logo: 'icones/world.png',
  money: 0,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: 0,
  products: [],
  allunlocks: [],
  upgrades: [],
  angelupgrades: [],
  managers: [],
};

// GameService remplacé par un stub : pas d'Apollo réel (ni de serveur) en test.
function stubGameService(): Partial<GameService> {
  const activeTab = signal<Tab>('products');
  return {
    user: signal('test'),
    multiplier: signal(1),
    world: signal<WorldData | undefined>(undefined),
    errorMessage: signal(null),
    activeTab,
    selectTab: (tab: Tab) => activeTab.set(tab),
    scanlines: signal(true),
    glow: signal(true),
    flicker: signal(false),
    toggleManager: () => Promise.resolve(),
  } as Partial<GameService>;
}

describe('App', () => {
  let game: Partial<GameService>;

  beforeEach(async () => {
    game = stubGameService();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: GameService, useValue: game },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    }).compileComponents();
  });

  it('se crée sans monde chargé : bandeau, 6 onglets, ni carte ni liste ni Reset', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[type="text"]')).not.toBeNull();
    expect(compiled.textContent).toContain('aucun monde chargé');
    // La barre reste affichée (6 onglets) même sans monde ; les écrans de jeu non.
    expect(compiled.querySelectorAll('app-tab-bar a[mat-tab-link]').length).toBe(6);
    expect(compiled.querySelector('mat-card')).toBeNull();
    expect(compiled.querySelector('app-palier-list')).toBeNull();
    expect(compiled.textContent).not.toContain('Reset');
  });

  // D32 : logo + nom du monde dans la toolbar dès qu'un monde est chargé.
  it('monde chargé → .world-name avec « World » et son icône ; sans monde → rien', async () => {
    game.world!.set(world);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const name = compiled.querySelector('mat-toolbar .world-name');
    expect(name?.textContent).toContain('World');
    expect(name?.querySelector('app-game-icon img')?.getAttribute('src')).toBe('http://localhost:3000/icones/world.png');
    expect(compiled.textContent).not.toContain('aucun monde chargé');

    game.world!.set(undefined);
    await fixture.whenStable();
    expect(compiled.querySelector('.world-name')).toBeNull();
    expect(compiled.querySelector('mat-toolbar app-game-icon')).toBeNull();
    expect(compiled.textContent).toContain('aucun monde chargé');
  });

  it("l'écran Paramètres s'affiche sans monde, avec 3 interrupteurs", async () => {
    game.activeTab!.set('settings');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-settings-panel mat-slide-toggle').length).toBe(3);
    expect(compiled.querySelector('mat-card')).toBeNull();
  });

  it('le toggle du multiplicateur courant est le seul coché, et cliquer un autre met à jour le service', async () => {
    game.multiplier!.set(10);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggles = Array.from(compiled.querySelectorAll<HTMLElement>('.multiplier mat-button-toggle'));
    expect(toggles.length).toBe(4);
    const checked = toggles.filter((t) => t.classList.contains('mat-button-toggle-checked'));
    expect(checked.length).toBe(1);
    expect(checked[0].textContent?.trim()).toBe('x10');

    // Clic sur le bouton interne de x100 : $event.value transmis tel quel, en nombre (D17).
    const x100 = toggles.find((t) => t.textContent?.trim() === 'x100')!;
    x100.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(game.multiplier!()).toBe(100);
    expect(x100.classList.contains('mat-button-toggle-checked')).toBe(true);
    expect(checked[0].classList.contains('mat-button-toggle-checked')).toBe(false);
  });

  it('classes crt-scanlines et crt-glow posées par défaut sur app-root, pas crt-flicker', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('crt-scanlines')).toBe(true);
    expect(host.classList.contains('crt-glow')).toBe(true);
    expect(host.classList.contains('crt-flicker')).toBe(false);

    game.flicker!.set(true);
    game.scanlines!.set(false);
    await fixture.whenStable();
    expect(host.classList.contains('crt-flicker')).toBe(true);
    expect(host.classList.contains('crt-scanlines')).toBe(false);
  });
});
