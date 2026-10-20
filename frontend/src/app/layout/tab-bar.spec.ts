import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Tab, TabBar, TAB_STORAGE_KEY, readStoredTab } from './tab-bar';

// Hôte de test : fournit les inputs, projette un écran et enregistre l'output.
@Component({
  standalone: true,
  imports: [TabBar],
  template: `
    <app-tab-bar [active]="active()" [badges]="badges()" (select)="selected.push($event)">
      <p class="projected">écran projeté</p>
    </app-tab-bar>
  `,
})
class Host {
  readonly active = signal<Tab>('products');
  readonly badges = signal<Partial<Record<Tab, number>>>({});
  readonly selected: Tab[] = [];
}

describe('readStoredTab', () => {
  beforeEach(() => localStorage.removeItem(TAB_STORAGE_KEY));

  it("absent ou inconnu → 'products' ; valeur connue conservée", () => {
    expect(readStoredTab()).toBe('products');
    localStorage.setItem(TAB_STORAGE_KEY, 'upgrades');
    expect(readStoredTab()).toBe('upgrades');
    localStorage.setItem(TAB_STORAGE_KEY, 'none');
    expect(readStoredTab()).toBe('products');
  });
});

describe('TabBar (disposition « onglets », D37)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      // Sans transitions CSS ni ResizeObserver fiable (jsdom), la barre paginée est calculée sans
      // animation.
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    }).compileComponents();
  });

  function links(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('nav[mat-tab-nav-bar] a[mat-tab-link]'));
  }

  it('affiche les 6 onglets dans l’ordre, texte seul', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    // Premier nœud texte du libellé : le span porte aussi la pastille matBadge (« 0 », masquée).
    const labels = links(fixture.nativeElement).map((a) =>
      a.querySelector('.tab-label')?.firstChild?.textContent?.trim(),
    );
    expect(labels).toEqual(['Produits', 'Managers', 'Upgrades', 'Anges', 'Unlocks', 'Paramètres']);
  });

  it('marque le seul lien actif (mdc-tab--active, aria-selected) et suit l’input', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const active = () =>
      links(el)
        .filter((a) => a.classList.contains('mdc-tab--active'))
        .map((a) => [a.dataset['tab'], a.getAttribute('aria-selected')]);
    expect(active()).toEqual([['products', 'true']]);

    fixture.componentInstance.active.set('settings');
    await fixture.whenStable();
    expect(active()).toEqual([['settings', 'true']]);
  });

  it('onglets étirés sur toute la largeur (stretch Material actif)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav[mat-tab-nav-bar]')!;
    expect(nav.classList.contains('mat-mdc-tab-nav-bar-stretch-tabs')).toBe(true);
  });

  it('projette l’écran dans le mat-tab-nav-panel', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-tab-nav-panel .projected')?.textContent).toBe('écran projeté');
  });

  it('pastilles par onglet : visibles si > 0, masquées à 0 ou absentes', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.badges.set({ managers: 2, angels: 0 });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const badgeHost = (tab: Tab) => el.querySelector(`[data-tab="${tab}"] .mat-badge`)!;
    expect(badgeHost('managers').classList.contains('mat-badge-hidden')).toBe(false);
    expect(badgeHost('managers').querySelector('.mat-badge-content')?.textContent?.trim()).toBe('2');
    expect(badgeHost('angels').classList.contains('mat-badge-hidden')).toBe(true);
    expect(badgeHost('upgrades').classList.contains('mat-badge-hidden')).toBe(true);
  });

  it('clic sur un onglet → select émis, sauf sur l’onglet déjà actif', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLElement>('[data-tab="products"]')!.click();
    el.querySelector<HTMLElement>('[data-tab="upgrades"]')!.click();
    el.querySelector<HTMLElement>('[data-tab="managers"]')!.click();
    expect(fixture.componentInstance.selected).toEqual(['upgrades', 'managers']);
  });
});
