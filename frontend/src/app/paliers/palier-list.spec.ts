import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CostUnit, PalierList } from './palier-list';
import { PalierData, ProductData } from '../game/game.service';
import { makeWorld } from '../testing/test-world';

const world = makeWorld();

// Hôte de test : liste des managers par défaut, inputs modifiables.
@Component({
  standalone: true,
  imports: [PalierList],
  template: `
    <app-palier-list
      [paliers]="paliers()"
      [actionLabel]="actionLabel()"
      [doneLabel]="doneLabel()"
      [showDone]="showDone()"
      [costUnit]="costUnit()"
      [balance]="balance()"
      [showEffect]="showEffect()"
      emptyText="Tous les managers sont engagés."
      [products]="products"
      [worldLogo]="'icones/world.png'"
      [blockedNames]="blocked()"
      (action)="clicked.push($event)"
    />
  `,
})
class Host {
  readonly paliers = signal<readonly PalierData[]>(world.managers);
  readonly actionLabel = signal<string | null>('Hire !');
  readonly doneLabel = signal<string | null>('Engagé');
  readonly showDone = signal(true);
  readonly costUnit = signal<CostUnit>('$');
  readonly balance = signal<number | null>(1000);
  readonly showEffect = signal(false);
  readonly blocked = signal<readonly string[]>([]);
  readonly products: readonly ProductData[] = world.products;
  readonly clicked: PalierData[] = [];
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    rows: () => Array.from(el.querySelectorAll('tr.mat-mdc-row')) as HTMLTableRowElement[],
    headers: () => Array.from(el.querySelectorAll('th')).map((th) => th.textContent!.trim()),
    buttons: () => Array.from(el.querySelectorAll('tr.mat-mdc-row button')) as HTMLButtonElement[],
  };
}

describe('PalierList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('managers (F-18) : logo, nom, produit géré, coût, bouton — pas de colonne effet', async () => {
    const { headers, rows } = await render();
    expect(headers()).toEqual(['', 'nom', 'produit', 'coût', '']);
    const cells = Array.from(rows()[0].querySelectorAll('td')).map((td) => td.textContent!.trim());
    expect(cells).toEqual(['', 'Manager 1', 'Item 1', '1000 $', 'Hire !']);
    expect(rows()[0].querySelector('app-game-icon img')?.getAttribute('src')).toBe(
      'http://localhost:3000/icones/manager1.png',
    );
  });

  it("non débloqués d'abord, puis débloqués (D40), chacun dans l'ordre du monde", async () => {
    const { host, fixture, rows } = await render();
    host.paliers.set([{ ...world.managers[0], unlocked: true }, world.managers[1]]);
    await fixture.whenStable();
    expect(rows().map((r) => r.querySelector('td.name')!.textContent!.trim())).toEqual(['Manager 2', 'Manager 1']);
    expect(rows().map((r) => r.classList.contains('done'))).toEqual([false, true]);
  });

  it('palier débloqué : ligne .done barrée, mention doneLabel à la place du bouton', async () => {
    const { host, fixture, rows, buttons } = await render();
    host.paliers.set([{ ...world.managers[0], unlocked: true }, world.managers[1]]);
    await fixture.whenStable();
    const done = rows()[1];
    expect(done.querySelector('button')).toBeNull();
    expect(done.querySelector('.done-label')?.textContent?.trim()).toBe('Engagé');
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Hire !']);
  });

  it('showDone faux : paliers débloqués non listés, message seul quand tout est débloqué (D47)', async () => {
    const { host, fixture, el, rows } = await render();
    host.showDone.set(false);
    host.paliers.set([{ ...world.managers[0], unlocked: true }, world.managers[1]]);
    await fixture.whenStable();
    expect(rows().map((r) => r.querySelector('td.name')!.textContent!.trim())).toEqual(['Manager 2']);
    host.paliers.set(world.managers.map((m) => ({ ...m, unlocked: true })));
    await fixture.whenStable();
    expect(el.querySelector('.empty')?.textContent?.trim()).toBe('Tous les managers sont engagés.');
    expect(el.querySelector('table')).toBeNull();
  });

  it('tout débloqué → message au-dessus du tableau barré', async () => {
    const { host, fixture, el, rows } = await render();
    host.paliers.set(world.managers.map((m) => ({ ...m, unlocked: true })));
    await fixture.whenStable();
    expect(el.querySelector('.empty')?.textContent?.trim()).toBe('Tous les managers sont engagés.');
    expect(el.querySelector('.empty')!.compareDocumentPosition(el.querySelector('table')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(rows().every((r) => r.classList.contains('done'))).toBe(true);
  });

  it('il reste un palier verrouillé → pas de message', async () => {
    const { el } = await render();
    expect(el.querySelector('.empty')).toBeNull();
  });

  it('bouton actif seulement si le solde suffit (seuil ≤ solde), clic → palier émis', async () => {
    const { buttons, host } = await render();
    expect(buttons().map((b) => b.disabled)).toEqual([false, true]);
    buttons()[0].click();
    expect(host.clicked.map((p) => p.name)).toEqual(['Manager 1']);
  });

  it('palier dans blockedNames : bouton grisé malgré le solde, ligne non mise en avant (D42)', async () => {
    const { buttons, host, fixture, rows } = await render();
    host.balance.set(20000);
    host.blocked.set(['Manager 2', 'Inconnu']);
    await fixture.whenStable();
    expect(buttons().map((b) => b.disabled)).toEqual([false, true]);
    expect(rows().map((r) => r.classList.contains('affordable'))).toEqual([true, false]);
    buttons()[1].click();
    expect(host.clicked).toEqual([]);
  });

  it('upgrades (F-27) : colonne effet en toutes lettres, cible Global, coût en puissance de dix', async () => {
    const { host, fixture, headers, rows } = await render();
    host.paliers.set(world.upgrades);
    host.showEffect.set(true);
    host.actionLabel.set('Buy !');
    await fixture.whenStable();
    expect(headers()).toEqual(['', 'nom', 'produit', 'effet', 'coût', '']);
    const cells = Array.from(rows()[1].querySelectorAll('td')).map((td) => td.textContent!.trim());
    expect(cells).toEqual(['', 'Upgrade 7', 'Global', 'revenus ×2', '1.000 × 106 $', 'Buy !']);
    expect(rows()[1].querySelector('td.seuil sup')?.textContent).toBe('6');
  });

  it('angel upgrades (F-31) : coût en anges, cible Anges', async () => {
    const { host, fixture, rows, buttons } = await render();
    host.paliers.set(world.angelupgrades);
    host.costUnit.set('anges');
    host.balance.set(10);
    host.showEffect.set(true);
    await fixture.whenStable();
    const cells = Array.from(rows()[0].querySelectorAll('td')).map((td) => td.textContent!.trim());
    expect(cells).toEqual(['', 'Angel Upgrade 1', 'Anges', 'anges +1 %', '10.00 anges', 'Hire !']);
    expect(buttons().map((b) => b.disabled)).toEqual([false, true]);
  });

  it('all unlocks en lecture seule : seuil en quantité, pas de bouton', async () => {
    const { host, fixture, headers, rows, buttons } = await render();
    host.paliers.set(world.allunlocks);
    host.actionLabel.set(null);
    host.doneLabel.set(null);
    host.costUnit.set(null);
    host.balance.set(null);
    host.showEffect.set(true);
    await fixture.whenStable();
    expect(headers()).toEqual(['', 'nom', 'produit', 'effet', 'seuil']);
    expect(rows()[0].querySelector('td.seuil')!.textContent!.trim()).toBe('25 exemplaires de chaque produit');
    expect(buttons()).toEqual([]);
  });

  it('all unlocks avec doneLabel : colonne de mention, remplie pour les seuls paliers atteints', async () => {
    const { host, fixture, headers, rows, buttons } = await render();
    host.paliers.set([{ ...world.allunlocks[0], unlocked: true }, { ...world.allunlocks[0], name: 'All 2', seuil: 50 }]);
    host.actionLabel.set(null);
    host.doneLabel.set('Atteint');
    host.costUnit.set(null);
    host.balance.set(null);
    host.showEffect.set(true);
    await fixture.whenStable();
    expect(headers()).toEqual(['', 'nom', 'produit', 'effet', 'seuil', '']);
    expect(rows().map((r) => r.querySelector('td.name')!.textContent!.trim())).toEqual(['All 2', 'All 1']);
    expect(rows().map((r) => r.querySelector('td.action-cell')!.textContent!.trim())).toEqual(['', 'Atteint']);
    expect(buttons()).toEqual([]);
  });
});
