import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RatioType } from './graphql';
import { PalierData, ProductData } from './game.service';
import { UnlockList } from './unlock-list';

// Paliers d'Item 1 dans backend/src/origworld.ts : 25 (vitesse ×2), 50 (gain ×2), 100 (vitesse ×2).
function paliers(unlocked: boolean): PalierData[] {
  return [
    { name: 'Unlock 1.1', logo: 'icones/item1.png', seuil: 25, idcible: 1, ratio: 2, typeratio: RatioType.Vitesse, unlocked },
    { name: 'Unlock 1.2', logo: 'icones/item1.png', seuil: 50, idcible: 1, ratio: 2, typeratio: RatioType.Gain, unlocked },
    { name: 'Unlock 1.3', logo: 'icones/item1.png', seuil: 100, idcible: 1, ratio: 2, typeratio: RatioType.Vitesse, unlocked },
  ];
}

// Item 1 neuf (quantite 1, tout verrouillé) et un item à 120 exemplaires, tout débloqué.
const item1: ProductData = {
  id: 1, name: 'Item 1', logo: 'icones/item1.png', cout: 4, croissance: 1.07, revenu: 1,
  vitesse: 500, quantite: 1, timeleft: 0, managerUnlocked: false, paliers: paliers(false),
};
const item2: ProductData = { ...item1, id: 2, name: 'Item 2', quantite: 120, paliers: paliers(true) };

@Component({
  standalone: true,
  imports: [UnlockList],
  template: `<app-unlock-list [products]="products()" worldLogo="icones/world.png" />`,
})
class Host {
  readonly products = signal<ProductData[]>([item1, item2]);
}

// Cellules d'une ligne, texte normalisé.
function rowCells(row: Element): string[] {
  return Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim() ?? '');
}

describe('UnlockList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('une ligne par produit : Item 1 neuf → « Unlock 1.1 | vitesse ×2 | 1 / 25 », barre à 4', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tr[mat-row]'));
    expect(rows.length).toBe(2);
    expect(rowCells(rows[0])).toEqual(['Item 1', 'Unlock 1.1', 'vitesse ×2', '1 / 25']);
    expect(rows[0].classList.contains('unlocked')).toBe(false);
    const bar = rows[0].querySelector('mat-progress-bar')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('4');
  });

  it('tout débloqué → « tous les paliers débloqués », autres cellules vides, tr.unlocked, sans icône', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tr[mat-row]'));
    expect(rowCells(rows[1])).toEqual(['Item 2', 'tous les paliers débloqués', '', '']);
    expect(rows[1].classList.contains('unlocked')).toBe(true);
    expect(rows[1].querySelector('mat-progress-bar')).toBeNull();
    expect(rows[1].querySelector('app-game-icon')).toBeNull();
  });

  // D32 : icône du prochain palier devant son nom (logo du palier = icones/item1.png ici).
  it('prochain palier → app-game-icon dans la cellule palier, src = logo du palier', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tr[mat-row]')!;
    const icon = row.querySelector('td.palier app-game-icon');
    expect(icon).not.toBeNull();
    expect(icon!.querySelector('img')?.getAttribute('src')).toBe('http://localhost:3000/icones/item1.png');
  });

  it('Unlock 1.1 débloqué, quantite 32 → « Unlock 1.2 | revenus ×2 | 32 / 50 », barre à 64', async () => {
    const fixture = TestBed.createComponent(Host);
    const [p1, ...rest] = paliers(false);
    fixture.componentInstance.products.set([{ ...item1, quantite: 32, paliers: [{ ...p1, unlocked: true }, ...rest] }]);
    await fixture.whenStable();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tr[mat-row]')!;
    expect(rowCells(row)).toEqual(['Item 1', 'Unlock 1.2', 'revenus ×2', '32 / 50']);
    expect(row.querySelector('mat-progress-bar')!.getAttribute('aria-valuenow')).toBe('64');
  });

  it('quantite 30 > seuil 25 encore verrouillé → barre bornée à 100, « 30 / 25 »', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.products.set([{ ...item1, quantite: 30 }]);
    await fixture.whenStable();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tr[mat-row]')!;
    expect(rowCells(row)[3]).toBe('30 / 25');
    expect(row.querySelector('mat-progress-bar')!.getAttribute('aria-valuenow')).toBe('100');
  });
});
