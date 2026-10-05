import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CostUnit, PalierList } from './palier-list';
import { PalierData, ProductData } from './game.service';
import { makeWorld } from './test-world';

const world = makeWorld();

// Hôte de test : liste des managers par défaut, inputs modifiables.
@Component({
  standalone: true,
  imports: [PalierList],
  template: `
    <app-palier-list
      [paliers]="paliers()"
      [actionLabel]="actionLabel()"
      [costUnit]="costUnit()"
      [balance]="balance()"
      [showEffect]="showEffect()"
      emptyText="Tous les managers sont engagés."
      [products]="products"
      [worldLogo]="'icones/world.png'"
      (action)="clicked.push($event)"
    />
  `,
})
class Host {
  readonly paliers = signal<readonly PalierData[]>(world.managers);
  readonly actionLabel = signal<string | null>('Hire !');
  readonly costUnit = signal<CostUnit>('$');
  readonly balance = signal<number | null>(1000);
  readonly showEffect = signal(false);
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

  it('seuls les paliers NON débloqués sont affichés', async () => {
    const { host, fixture, rows } = await render();
    host.paliers.set([{ ...world.managers[0], unlocked: true }, world.managers[1]]);
    await fixture.whenStable();
    expect(rows().map((r) => r.querySelector('td.name')!.textContent!.trim())).toEqual(['Manager 2']);
  });

  it('tout débloqué → message, pas de tableau', async () => {
    const { host, fixture, el } = await render();
    host.paliers.set(world.managers.map((m) => ({ ...m, unlocked: true })));
    await fixture.whenStable();
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('.empty')?.textContent?.trim()).toBe('Tous les managers sont engagés.');
  });

  it('bouton actif seulement si le solde suffit (seuil ≤ solde), clic → palier émis', async () => {
    const { buttons, host } = await render();
    expect(buttons().map((b) => b.disabled)).toEqual([false, true]);
    buttons()[0].click();
    expect(host.clicked.map((p) => p.name)).toEqual(['Manager 1']);
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
    host.costUnit.set(null);
    host.balance.set(null);
    host.showEffect.set(true);
    await fixture.whenStable();
    expect(headers()).toEqual(['', 'nom', 'produit', 'effet', 'seuil']);
    expect(rows()[0].querySelector('td.seuil')!.textContent!.trim()).toBe('25 exemplaires de chaque produit');
    expect(buttons()).toEqual([]);
  });
});
