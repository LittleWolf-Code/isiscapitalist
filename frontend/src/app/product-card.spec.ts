import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Multiplier, ProductData } from './game.service';
import { ProductCard } from './product-card';
import { makeWorld } from './test-world';

// Produit 1 du monde de test (Item 1 d'origworld : cout 4, croissance 1.07, revenu 1, 500 ms).
const item1: ProductData = makeWorld().products[0];

// Hôte de test : fournit les inputs et enregistre les outputs.
@Component({
  standalone: true,
  imports: [ProductCard],
  template: `
    <app-product-card
      [product]="product()"
      [activeangels]="activeangels()"
      [angelbonus]="2"
      [qtmulti]="qtmulti()"
      [money]="money()"
      [pixelIcons]="pixelIcons()"
      (buy)="bought.push($event)"
      (launch)="launched = launched + 1"
    />
  `,
})
class Host {
  readonly product = signal<ProductData>(item1);
  readonly activeangels = signal(0);
  readonly qtmulti = signal<Multiplier>(1);
  readonly money = signal(1000);
  readonly pixelIcons = signal(true);
  readonly bought: number[] = [];
  launched = 0;
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    icon: () => el.querySelector('button.icon-button') as HTMLButtonElement,
    buy: () => el.querySelector('button.buy') as HTMLButtonElement,
    text: (selector: string) => el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim(),
  };
}

describe('ProductCard (F-07)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('partie gauche : image du produit (Pip-Boy relayé) et quantité superposée', async () => {
    const { el, text, host, fixture } = await render();
    const img = el.querySelector('.product-visual app-game-icon img')!;
    // jsdom : pas de canvas → repli sur l'URL d'origine, avec la classe pixel (mode Pip-Boy).
    expect(img.getAttribute('src')).toBe('http://localhost:3000/icones/item1.png');
    expect(img.getAttribute('alt')).toBe('Item 1');
    expect(img.classList.contains('pixel')).toBe(true);
    expect(text('.product-visual .quantite')).toBe('1');
    host.pixelIcons.set(false);
    await fixture.whenStable();
    expect(el.querySelector('.product-visual img')!.classList.contains('pixel')).toBe(false);
  });

  it("clic sur l'icône : émet launch (startFabrication, F-10)", async () => {
    const { icon, host } = await render();
    icon().click();
    expect(host.launched).toBe(1);
  });

  it("icône désactivée sans exemplaire et quand un manager automatise la production", async () => {
    const { icon, host, fixture } = await render();
    host.product.set({ ...item1, quantite: 0 });
    await fixture.whenStable();
    expect(icon().disabled).toBe(true);
    host.product.set({ ...item1, managerUnlocked: true });
    await fixture.whenStable();
    expect(icon().disabled).toBe(true);
    icon().click();
    expect(host.launched).toBe(0);
  });

  it('barre de production : gain d’une production écrit dedans, anges compris', async () => {
    const { text, host, fixture } = await render();
    expect(text('.product-gain .bar-label')).toBe('1.00');
    host.activeangels.set(50);
    await fixture.whenStable();
    expect(text('.product-gain .bar-label')).toBe('2.00');
  });

  it('barre de production : progression suivant timeleft (0 au repos, 75 % à 125 ms de la fin)', async () => {
    const { el, host, fixture } = await render();
    const bar = () => el.querySelector('.product-gain mat-progress-bar')!.getAttribute('aria-valuenow');
    expect(bar()).toBe('0');
    host.product.set({ ...item1, timeleft: 125 });
    await fixture.whenStable();
    expect(bar()).toBe('75');
  });

  it('temps restant à côté du bouton d’achat : durée d’un cycle au repos, timeleft en cours', async () => {
    const { text, host, fixture } = await render();
    expect(text('.product-buy .product-timer')).toBe('00:00:00.5');
    host.product.set({ ...item1, vitesse: 61_000, timeleft: 1_250 });
    await fixture.whenStable();
    expect(text('.product-buy .product-timer')).toBe('00:00:01.3');
  });

  it('bouton d’achat : quantité et coût (x1 → 4.00, x10 → 55.27)', async () => {
    const { text, host, fixture } = await render();
    expect(text('button.buy')).toBe('x1 — 4.00');
    host.qtmulti.set(10);
    await fixture.whenStable();
    expect(text('button.buy')).toBe('x10 — 55.27');
  });

  it('bouton d’achat désactivé si le joueur ne peut pas payer (F-14)', async () => {
    const { buy, host, fixture } = await render();
    host.qtmulti.set(100);
    await fixture.whenStable();
    expect(buy().disabled).toBe(true);
    host.money.set(3.99);
    host.qtmulti.set(1);
    await fixture.whenStable();
    expect(buy().disabled).toBe(true);
    host.money.set(4);
    await fixture.whenStable();
    expect(buy().disabled).toBe(false);
  });

  it('mode Max : quantité maximale achetable inscrite dans le bouton et émise au clic', async () => {
    const { buy, text, host, fixture } = await render();
    host.qtmulti.set('max');
    host.money.set(100);
    await fixture.whenStable();
    expect(text('button.buy')).toBe('x14 — 90.20');
    buy().click();
    expect(host.bought).toEqual([14]);
    host.money.set(3);
    await fixture.whenStable();
    expect(text('button.buy')).toBe('x0 — 0.00');
    expect(buy().disabled).toBe(true);
  });

  it('chip « manager » quand la production est automatisée', async () => {
    const { el, host, fixture } = await render();
    expect(el.querySelector('mat-chip')).toBeNull();
    host.product.set({ ...item1, managerUnlocked: true });
    await fixture.whenStable();
    expect(el.querySelector('mat-chip')?.textContent?.trim()).toBe('manager');
  });
});
