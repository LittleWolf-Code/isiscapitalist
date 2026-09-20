import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RatioType } from './graphql';
import { Multiplier, ProductData } from './game.service';
import { ProductCard } from './product-card';

// Item 1 de backend/src/origworld.ts (monde neuf).
const item1: ProductData = {
  id: 1,
  name: 'Item 1',
  logo: 'icones/item1.png',
  cout: 4,
  croissance: 1.07,
  revenu: 1,
  vitesse: 500,
  quantite: 1,
  timeleft: 0,
  managerUnlocked: false,
  paliers: [
    { name: 'Unlock 1.1', logo: 'icones/item1.png', seuil: 25, idcible: 1, ratio: 2, typeratio: RatioType.Vitesse, unlocked: false },
  ],
};

// Hôte de test : fournit les inputs et enregistre les outputs.
@Component({
  standalone: true,
  imports: [ProductCard],
  template: `
    <app-product-card
      [product]="product()"
      [activeangels]="0"
      [angelbonus]="2"
      [multiplier]="multiplier()"
      [money]="money()"
      [managerOwned]="managerOwned()"
      (buy)="bought.push($event)"
      (launch)="launched = launched + 1"
      (toggleManager)="toggled = toggled + 1"
    />
  `,
})
class Host {
  readonly product = signal(item1);
  readonly multiplier = signal<Multiplier>(1);
  readonly money = signal(1000);
  readonly managerOwned = signal(false);
  readonly bought: number[] = [];
  launched = 0;
  toggled = 0;
}

// Bouton de production (Produire / Arrêter / Reprendre) : le premier des actions.
function productionButton(fixture: { nativeElement: unknown }): HTMLButtonElement {
  const buttons = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('mat-card-actions button'),
  ) as HTMLButtonElement[];
  return buttons[0];
}

describe('ProductCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('affiche le nom et la quantité « 1 / 25 » (prochain palier), plus de « id 1 »', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const text = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Item 1');
    expect(text).toContain('1 / 25');
    expect(text).not.toContain('id 1');
  });

  // Barre d'achat vers le prochain palier (D23) : la 2e mat-progress-bar de la carte.
  function ownedBar(fixture: { nativeElement: unknown }): Element {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'mat-progress-bar[aria-label="Progression vers le prochain palier"]',
    )!;
  }

  it("quantite 22 → barre d'achat à 88 (100 × 22 / 25), texte « 22 / 25 »", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, quantite: 22 });
    await fixture.whenStable();
    expect(ownedBar(fixture).getAttribute('aria-valuenow')).toBe('88');
    const text = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('22 / 25');
  });

  it('palier débloqué (tout débloqué) → « 22 » seul, barre à 100', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({
      ...item1,
      quantite: 22,
      paliers: [{ ...item1.paliers[0], unlocked: true }],
    });
    await fixture.whenStable();
    expect(ownedBar(fixture).getAttribute('aria-valuenow')).toBe('100');
    const owned = (fixture.nativeElement as HTMLElement).querySelector('.product-owned .bar-label')!;
    expect(owned.textContent?.replace(/\s+/g, ' ').trim()).toBe('22');
  });

  it('quantite 30 > seuil 25 encore verrouillé (JSON édité) → barre bornée à 100, « 30 / 25 »', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, quantite: 30 });
    await fixture.whenStable();
    expect(ownedBar(fixture).getAttribute('aria-valuenow')).toBe('100');
    const owned = (fixture.nativeElement as HTMLElement).querySelector('.product-owned .bar-label')!;
    expect(owned.textContent?.replace(/\s+/g, ' ').trim()).toBe('30 / 25');
  });

  // Structure D25 : la barre d'achat est dans l'en-tête maison (à droite de l'icône, sous le
  // nom), plus dans mat-card-content ; la barre de production y reste.
  it("la barre d'achat est dans .product-header .product-heading, pas dans mat-card-content", async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-card-header')).toBeNull();
    const owned = el.querySelector('.product-header .product-heading .product-owned');
    expect(owned).not.toBeNull();
    expect(owned!.contains(ownedBar(fixture))).toBe(true);
    expect(owned!.querySelector('.bar-label')).not.toBeNull();
    expect(el.querySelector('mat-card-content .product-owned')).toBeNull();
    expect(el.querySelector('mat-card-content mat-progress-bar[aria-label="Production en cours"]')).not.toBeNull();
    // L'icône et le titre sont bien dans le même en-tête, le titre dans la colonne de droite.
    expect(el.querySelector('.product-header > .icon')).not.toBeNull();
    expect(el.querySelector('.product-heading .product-title-row mat-card-title')?.textContent?.trim()).toBe('Item 1');
  });

  it('la carte ne montre plus vitesse, croissance, timeleft ni cout (hors bouton Acheter)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const content = el.querySelector('mat-card-content')!.textContent ?? '';
    for (const word of ['vitesse', 'croissance', 'timeleft', 'cout', 'id ']) {
      expect(content).not.toContain(word);
    }
    // Le coût reste sur le bouton Acheter (D17).
    const buy = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Acheter'));
    expect(buy?.textContent).toContain('4.00');
  });

  it('Acheter affiche 55.27 avec multiplier 10 sur Item 1', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiplier.set(10);
    await fixture.whenStable();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const buy = buttons.find((b) => b.textContent?.includes('Acheter'));
    expect(buy?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Acheter x10 — 55.27');
  });

  // Bouton Acheter (texte normalisé) après stabilisation de la vue.
  async function buyButton(fixture: { nativeElement: unknown; whenStable(): Promise<unknown> }) {
    await fixture.whenStable();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const buy = buttons.find((b) => b.textContent?.includes('Acheter'))!;
    return { button: buy, text: buy.textContent?.replace(/\s+/g, ' ').trim() };
  }

  it('x10 / money 55.26 → désactivé (55.2658 > 55.26) ; 55.27 → actif (égalité permise)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiplier.set(10);
    fixture.componentInstance.money.set(55.26);
    let { button, text } = await buyButton(fixture);
    expect(text).toBe('Acheter x10 — 55.27');
    expect(button.disabled).toBe(true);

    fixture.componentInstance.money.set(55.27);
    ({ button } = await buyButton(fixture));
    expect(button.disabled).toBe(false);
  });

  it('max / money 55.27 → « Acheter x10 — 55.27 », buy émis avec 10', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiplier.set('max');
    fixture.componentInstance.money.set(55.27);
    const { button, text } = await buyButton(fixture);
    expect(text).toBe('Acheter x10 — 55.27');
    expect(button.disabled).toBe(false);
    button.click();
    expect(fixture.componentInstance.bought).toEqual([10]);
  });

  it('max / money 0 → « Acheter x0 — 0.00 » désactivé', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiplier.set('max');
    fixture.componentInstance.money.set(0);
    const { button, text } = await buyButton(fixture);
    expect(text).toBe('Acheter x0 — 0.00');
    expect(button.disabled).toBe(true);
  });

  it('progress() : vitesse 1000, timeleft 250 → mat-progress-bar à 75 %', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, vitesse: 1000, timeleft: 250 });
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar[aria-label="Production en cours"]')!;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-valuenow')).toBe('75');
  });

  it('progress() : vitesse 0 → 0 (pas de division par zéro)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, vitesse: 0, timeleft: 0 });
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar[aria-label="Production en cours"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  // D29 : cycle plus court que FAST_CYCLE_MS (400 ms) → barre pleine en continu ; cycle qui
  // démarre (timeleft = vitesse) → la barre part bien de 0.
  it('progress() : vitesse 125, timeleft 25 → 100 (cycle trop rapide, barre pleine)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, vitesse: 125, timeleft: 25 });
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar[aria-label="Production en cours"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('progress() : vitesse 500, timeleft 500 → 0 (cycle qui démarre)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, vitesse: 500, timeleft: 500 });
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar[aria-label="Production en cours"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  // Gain d'une production dans la barre de production, plus de ligne « revenu » (D28).
  it('gain « 1.00 » dans .product-gain .bar-label (Item 1, 0 ange), « 10.00 » avec quantite 10, plus de « revenu »', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.product-stats')).toBeNull();
    expect(el.querySelector('mat-card-content')!.textContent).not.toContain('revenu');
    const label = () => el.querySelector('.product-gain .bar-label')!.textContent?.trim();
    expect(label()).toBe('1.00');

    fixture.componentInstance.product.set({ ...item1, quantite: 10 });
    await fixture.whenStable();
    expect(label()).toBe('10.00');
  });

  // Chrono : timeleft en cours (arrondi à la seconde supérieure), ou vitesse au repos (D28).
  it('chrono : au repos (timeleft 0, vitesse 500) → 00:01 ; timeleft 61001 → 01:02 ; timeleft 250 → 00:01', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const timer = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.product-timer')!.textContent?.trim();
    expect(timer()).toBe('00:01');

    fixture.componentInstance.product.set({ ...item1, vitesse: 120000, timeleft: 61001 });
    await fixture.whenStable();
    expect(timer()).toBe('01:02');

    fixture.componentInstance.product.set({ ...item1, vitesse: 1000, timeleft: 250 });
    await fixture.whenStable();
    expect(timer()).toBe('00:01');

    // Production finie (timeleft 0 reçu) : retour à la durée d'un cycle.
    fixture.componentInstance.product.set({ ...item1, vitesse: 120000, timeleft: 0 });
    await fixture.whenStable();
    expect(timer()).toBe('02:00');
  });

  // Structure D28 : la barre de production (avec son texte) puis le chrono, dans cet ordre, sur
  // la ligne .product-progress. L'alignement se vérifie dans le navigateur.
  it('.product-progress contient .product-gain (barre « Production en cours ») puis .product-timer[role=timer]', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const row = el.querySelector('mat-card-content .product-progress')!;
    expect(row).not.toBeNull();
    const children = Array.from(row.children);
    expect(children).toHaveLength(2);
    expect(children[0].classList.contains('product-gain')).toBe(true);
    expect(children[0].querySelector('mat-progress-bar[aria-label="Production en cours"]')).not.toBeNull();
    expect(children[0].querySelector('.bar-label')).not.toBeNull();
    expect(children[1].classList.contains('product-timer')).toBe(true);
    expect(children[1].getAttribute('role')).toBe('timer');
    expect(children[1].getAttribute('aria-label')).toBe('Temps restant');
  });

  // Trois états du bouton de production et de la chip (D20).
  it('sans manager : « Produire », pas de chip, clic → launch', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = productionButton(fixture);
    expect(button.textContent?.trim()).toBe('Produire');
    expect(button.disabled).toBe(false);
    expect(el.querySelector('mat-chip')).toBeNull();
    button.click();
    expect(fixture.componentInstance.launched).toBe(1);
    expect(fixture.componentInstance.toggled).toBe(0);
  });

  it('manager possédé et actif : « Arrêter », chip « manager », clic → toggleManager', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.managerOwned.set(true);
    fixture.componentInstance.product.set({ ...item1, managerUnlocked: true });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = productionButton(fixture);
    expect(button.textContent?.trim()).toBe('Arrêter');
    expect(button.disabled).toBe(false);
    expect(el.querySelector('mat-chip')?.textContent?.trim()).toBe('manager');
    button.click();
    expect(fixture.componentInstance.toggled).toBe(1);
    expect(fixture.componentInstance.launched).toBe(0);
  });

  it('manager possédé en pause : « Reprendre », chip « manager », clic → toggleManager', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.managerOwned.set(true);
    fixture.componentInstance.product.set({ ...item1, managerUnlocked: false });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = productionButton(fixture);
    expect(button.textContent?.trim()).toBe('Reprendre');
    expect(button.disabled).toBe(false);
    // Texte constant (D30) : la pause ne se lit que sur le bouton, jamais dans la chip.
    expect(el.querySelector('mat-chip')?.textContent?.trim()).toBe('manager');
    expect(el.textContent).not.toContain('(en pause)');
    button.click();
    expect(fixture.componentInstance.toggled).toBe(1);
    expect(fixture.componentInstance.launched).toBe(0);
  });

  // Bouton de production désactivé sans exemplaire, quel que soit le libellé (D21).
  it('quantite 0 sans manager : « Produire » désactivé, clic sans effet', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, quantite: 0 });
    await fixture.whenStable();
    const button = productionButton(fixture);
    expect(button.textContent?.trim()).toBe('Produire');
    expect(button.disabled).toBe(true);
    button.click();
    expect(fixture.componentInstance.launched).toBe(0);
    expect(fixture.componentInstance.toggled).toBe(0);
  });

  it('quantite 0 avec manager actif : « Arrêter » désactivé, clic sans effet', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.managerOwned.set(true);
    fixture.componentInstance.product.set({ ...item1, quantite: 0, managerUnlocked: true });
    await fixture.whenStable();
    const button = productionButton(fixture);
    expect(button.textContent?.trim()).toBe('Arrêter');
    expect(button.disabled).toBe(true);
    button.click();
    expect(fixture.componentInstance.toggled).toBe(0);
    expect(fixture.componentInstance.launched).toBe(0);
  });

  it('quantite 0 puis 1 (achat reçu par getWorld) : le bouton redevient actif', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, quantite: 0 });
    await fixture.whenStable();
    expect(productionButton(fixture).disabled).toBe(true);

    fixture.componentInstance.product.set({ ...item1, quantite: 1 });
    await fixture.whenStable();
    const button = productionButton(fixture);
    expect(button.disabled).toBe(false);
    button.click();
    expect(fixture.componentInstance.launched).toBe(1);
  });

  it('chip affichée seulement si le manager est possédé (managerUnlocked seul ne suffit pas)', async () => {
    // Fichier userworlds incohérent (managerUnlocked true sans manager acheté) : Produire, sans chip.
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.product.set({ ...item1, managerUnlocked: true });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-chip')).toBeNull();
    expect(productionButton(fixture).textContent?.trim()).toBe('Produire');
  });

  // Acheter au bord droit (D26) : accroche CSS .buy, et toujours le second bouton des actions
  // (productionButton() compte sur l'ordre). L'alignement se vérifie dans le navigateur.
  it('le bouton Acheter porte la classe buy et reste le second bouton de mat-card-actions', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-card-actions button'),
    );
    expect(buttons).toHaveLength(2);
    expect(buttons[1].classList.contains('buy')).toBe(true);
    expect(buttons[1].textContent).toContain('Acheter');
    expect(buttons[0].classList.contains('buy')).toBe(false);
  });

  it('clic sur Acheter → buy émis avec la quantité ; Produire → launch', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiplier.set(10);
    await fixture.whenStable();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.includes('Acheter'))?.click();
    buttons.find((b) => b.textContent?.includes('Produire'))?.click();
    expect(fixture.componentInstance.bought).toEqual([10]);
    expect(fixture.componentInstance.launched).toBe(1);
  });
});
