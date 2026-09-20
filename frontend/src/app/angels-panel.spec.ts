import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import { RatioType } from './graphql';
import { AngelsPanel } from './angels-panel';
import { PalierData } from './game.service';

// Angel Upgrade 1 / 2 de backend/src/origworld.ts (seuils 10 et 100 anges).
const angelUpgrades: PalierData[] = [
  { name: 'Angel Upgrade 1', logo: 'icones/angel.png', seuil: 10, idcible: -1, ratio: 1, typeratio: RatioType.Ange, unlocked: false },
  { name: 'Angel Upgrade 2', logo: 'icones/angel.png', seuil: 100, idcible: -1, ratio: 1, typeratio: RatioType.Ange, unlocked: false },
];

// Hôte de test : fournit les inputs et enregistre les outputs.
@Component({
  standalone: true,
  imports: [AngelsPanel],
  template: `
    <app-angels-panel
      [score]="1e13"
      [totalangels]="0"
      [activeangels]="activeangels()"
      [angelbonus]="2"
      [angelsEarned]="15"
      [angelupgrades]="angelupgrades"
      (resetRequested)="resets = resets + 1"
      (buyAngelUpgrade)="bought.push($event)"
    />
  `,
})
class Host {
  readonly activeangels = signal(0);
  readonly angelupgrades = angelUpgrades;
  resets = 0;
  readonly bought: string[] = [];
}

describe('AngelsPanel', () => {
  beforeEach(async () => {
    // Animations Material désactivées : sans transitions CSS (jsdom), le contenu d'un onglet
    // n'est attaché qu'après un timer de repli de 100 ms ; désactivées, il l'est immédiatement.
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    }).compileComponents();
  });

  it('deux onglets Reset / Bonus, Reset sélectionné par défaut', async () => {
    const fixture = TestBed.createComponent(Host);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const group = await loader.getHarness(MatTabGroupHarness);
    const labels = await Promise.all((await group.getTabs()).map((t) => t.getLabel()));
    expect(labels).toEqual(['Reset', 'Bonus']);
    expect(await (await group.getSelectedTab()).getLabel()).toBe('Reset');
  });

  it('onglet Reset : anges gagnables, stats formatées, clic Reset → resetRequested', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const clean = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim();
    expect(clean(el.querySelector('.earned'))).toBe('Anges gagnables : 15');
    const stats = Array.from(el.querySelectorAll('dt, dd')).map(clean);
    expect(stats).toEqual(['Anges actifs', '0 / total : 0', 'Bonus par ange', '2 %', 'Score', '10.00 T']);

    const reset = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Reset'))!;
    expect(reset.disabled).toBe(false);
    reset.click();
    expect(fixture.componentInstance.resets).toBe(1);
  });

  it('onglet Bonus : angel upgrades, Acheter relayé vers buyAngelUpgrade', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.activeangels.set(15);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const group = await loader.getHarness(MatTabGroupHarness);
    await group.selectTab({ label: 'Bonus' });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const cells = Array.from(el.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim());
    expect(cells).toContain('Angel Upgrade 1');
    expect(cells).toContain('Angel Upgrade 2');

    // 15 anges : Angel Upgrade 1 (seuil 10) achetable, Angel Upgrade 2 (seuil 100) désactivé (D17).
    const buttons = Array.from(el.querySelectorAll('td button'));
    expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, true]);
    (buttons[0] as HTMLButtonElement).click();
    expect(fixture.componentInstance.bought).toEqual(['Angel Upgrade 1']);
  });
});
