import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RatioType } from './graphql';
import { PalierData, ProductData } from './game.service';
import { PalierList } from './palier-list';

// Manager 1 de backend/src/origworld.ts (seuil 1000 $).
const manager1: PalierData = {
  name: 'Manager 1',
  logo: 'icones/manager1.png',
  seuil: 1000,
  idcible: 1,
  ratio: 1,
  typeratio: RatioType.Gain,
  unlocked: false,
};

// Item 1 d'origworld, réduit à ce que la liste utilise (id, name, logo).
const item1 = { id: 1, name: 'Item 1', logo: 'icones/item1.png' } as ProductData;

// Hôte de test : fournit les inputs et enregistre l'output.
@Component({
  standalone: true,
  imports: [PalierList],
  template: `
    <app-palier-list
      title="Managers"
      [paliers]="paliers()"
      actionLabel="Engager"
      costUnit="$"
      [balance]="balance()"
      [blockedNames]="blocked()"
      [products]="products()"
      worldLogo="icones/world.png"
      (action)="actions.push($event)"
    />
  `,
})
class Host {
  readonly paliers = signal<PalierData[]>([manager1]);
  readonly products = signal<readonly ProductData[]>([item1]);
  readonly balance = signal<number | null>(null);
  readonly blocked = signal<readonly string[]>([]);
  readonly actions: string[] = [];
}

describe('PalierList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  async function actionButton(fixture: { nativeElement: unknown; whenStable(): Promise<unknown> }) {
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('button')!;
  }

  it('balance 999 < seuil 1000 → désactivé', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(999);
    expect((await actionButton(fixture)).disabled).toBe(true);
  });

  it('balance 1000 = seuil → actif, clic → action émise avec le name', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(1000);
    const button = await actionButton(fixture);
    expect(button.disabled).toBe(false);
    button.click();
    expect(fixture.componentInstance.actions).toEqual(['Manager 1']);
  });

  it('balance null → pas de vérification, actif', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(null);
    expect((await actionButton(fixture)).disabled).toBe(false);
  });

  it('mat-table : cellules name / seuil rendues, ligne marquée unlocked', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.paliers.set([{ ...manager1, unlocked: true }]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const cells = Array.from(el.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim());
    expect(cells).toContain('Manager 1');
    expect(cells).toContain('1.00 k $');
    expect(el.querySelector('tr.unlocked')).not.toBeNull();
  });

  // D32 : colonne « produit » (cible en toutes lettres) à la place d'idcible, colonne logo.
  it("colonne « produit » : Item 1, Global, Anges, #9 ; plus d'en-tête idcible", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.paliers.set([
      manager1,
      { ...manager1, name: 'All Unlock 1', logo: 'icones/all.png', idcible: 0 },
      { ...manager1, name: 'Angel Upgrade 1', logo: 'icones/angel.png', idcible: -1 },
      { ...manager1, name: 'Orphelin', logo: '', idcible: 9 },
    ]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toContain('produit');
    expect(headers).not.toContain('idcible');
    const produit = headers.indexOf('produit');
    const rows = Array.from(el.querySelectorAll('tr[mat-row]'));
    expect(rows.map((row) => row.querySelectorAll('td')[produit].textContent?.trim())).toEqual([
      'Item 1',
      'Global',
      'Anges',
      '#9',
    ]);
    expect(el.textContent).not.toMatch(/-1/);
  });

  it('colonne logo : un app-game-icon par ligne, premier candidat = logo du palier, repli produit', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.paliers.set([manager1, { ...manager1, name: 'Manager sans logo', logo: '' }]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const icons = Array.from(el.querySelectorAll('tr[mat-row] app-game-icon'));
    expect(icons.length).toBe(2);
    expect(icons[0].querySelector('img')?.getAttribute('src')).toBe('http://localhost:3000/icones/manager1.png');
    expect(icons[1].querySelector('img')?.getAttribute('src')).toBe('http://localhost:3000/icones/item1.png');
  });

  it('products vide → « #1 », sans exception', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.products.set([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const cells = Array.from(el.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(cells).toContain('#1');
  });

  it('palier déjà unlocked → désactivé même avec le solde', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(5000);
    fixture.componentInstance.paliers.set([{ ...manager1, unlocked: true }]);
    expect((await actionButton(fixture)).disabled).toBe(true);
  });

  // D24 : le parent peut bloquer un palier par son nom (manager dont le produit est à 0).
  it('blockedNames contient le palier → désactivé malgré le solde, clic sans effet', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(20000);
    fixture.componentInstance.blocked.set(['Manager 1']);
    const button = await actionButton(fixture);
    expect(button.disabled).toBe(true);
    button.click();
    expect(fixture.componentInstance.actions).toEqual([]);
  });

  it('blockedNames vide → actif', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(20000);
    fixture.componentInstance.blocked.set([]);
    expect((await actionButton(fixture)).disabled).toBe(false);
  });

  it('blockedNames avec un nom inconnu → sans effet', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.balance.set(20000);
    fixture.componentInstance.blocked.set(['Manager 99']);
    expect((await actionButton(fixture)).disabled).toBe(false);
  });
});
