import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_DISPLAY, DisplaySettings } from './display-settings';
import { SettingsPanel } from './settings-panel';

// Hôte de test : un signal DisplaySettings lié en two-way, comme App avec GameService.display.
@Component({
  standalone: true,
  imports: [SettingsPanel],
  template: `<app-settings-panel [(display)]="display" />`,
})
class Host {
  readonly display = signal<DisplaySettings>({ ...DEFAULT_DISPLAY });
}

const TOGGLE_ORDER = [
  'Vignette',
  'Grille de pixels',
  'Grain',
  'Scanlines',
  'Halo',
  'Scintillement',
  'Bande de balayage',
  'Bruit animé',
];

describe('SettingsPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  function toggles(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('mat-slide-toggle'));
  }
  function buttons(el: HTMLElement): HTMLButtonElement[] {
    return toggles(el).map((t) => t.querySelector<HTMLButtonElement>('button[role="switch"]')!);
  }
  function sliders(el: HTMLElement): HTMLInputElement[] {
    return Array.from(el.querySelectorAll<HTMLInputElement>('mat-slider input[matSliderThumb]'));
  }
  function tintButtons(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('.tint mat-button-toggle'));
  }
  function layoutButtons(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('.layout mat-button-toggle'));
  }

  it('affiche le titre, 3 sections, 8 interrupteurs dans l\'ordre, 3 curseurs et 4 teintes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Paramètres');
    expect(Array.from(el.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual(['Écran', 'Lumière', 'Animations']);
    expect(toggles(el).map((t) => t.textContent?.trim())).toEqual(TOGGLE_ORDER);
    // Défauts : statiques on, animés off.
    expect(buttons(el).map((b) => b.getAttribute('aria-checked'))).toEqual([
      'true', 'true', 'true', 'true', 'true', 'false', 'false', 'false',
    ]);
    expect(sliders(el).map((s) => s.getAttribute('aria-label'))).toEqual([
      'Intensité de la vignette',
      'Intensité des scanlines',
      'Intensité du halo',
    ]);
    expect(sliders(el).map((s) => s.value)).toEqual(['50', '50', '50']);
    expect(tintButtons(el).map((t) => t.textContent?.trim())).toEqual(['Vert', 'Ambre', 'Bleu', 'Blanc']);
    expect(tintButtons(el)[0].classList.contains('mat-button-toggle-checked')).toBe(true);
    expect(el.textContent).toContain('ignorées si votre système réduit les animations');
    expect(el.querySelector('button.reset')?.textContent?.trim()).toBe('Réinitialiser les réglages');
  });

  it('clic sur un interrupteur → seul ce champ change dans le modèle', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    buttons(el)[0].click(); // Vignette off
    buttons(el)[5].click(); // Scintillement on
    await fixture.whenStable();
    expect(fixture.componentInstance.display()).toEqual({ ...DEFAULT_DISPLAY, vignette: false, flicker: true });
    expect(buttons(el)[0].getAttribute('aria-checked')).toBe('false');
    expect(buttons(el)[5].getAttribute('aria-checked')).toBe('true');
  });

  it('curseur Halo désactivé quand Halo est off, valeur conservée', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const halo = sliders(el)[2];
    expect(halo.disabled).toBe(false);
    buttons(el)[4].click(); // Halo off
    await fixture.whenStable();
    expect(halo.disabled).toBe(true);
    expect(fixture.componentInstance.display().glowLevel).toBe(50);
    buttons(el)[4].click(); // Halo on
    await fixture.whenStable();
    expect(halo.disabled).toBe(false);
  });

  it('déplacer un curseur → niveau mis à jour', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const halo = sliders(el)[2];
    halo.value = '100';
    halo.dispatchEvent(new Event('input'));
    halo.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.display().glowLevel).toBe(100);
  });

  it("clic Ambre → tint 'amber'", async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    tintButtons(el)[1].querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.display().tint).toBe('amber');
    expect(tintButtons(el)[1].classList.contains('mat-button-toggle-checked')).toBe(true);
  });

  it("disposition (D37) : « Menu à gauche (sujet) » coché par défaut, clic « Onglets en bas » → layout 'onglets'", async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(layoutButtons(el).map((b) => b.textContent?.trim())).toEqual(['Menu à gauche (sujet)', 'Onglets en bas']);
    expect(layoutButtons(el)[0].classList.contains('mat-button-toggle-checked')).toBe(true);
    layoutButtons(el)[1].querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.display().layout).toBe('onglets');
    expect(layoutButtons(el)[1].classList.contains('mat-button-toggle-checked')).toBe(true);
  });

  it('clic Réinitialiser → DEFAULT_DISPLAY', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.display.set({ ...DEFAULT_DISPLAY, tint: 'white', roll: true, glowLevel: 90, grid: false, layout: 'onglets' });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('button.reset')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.display()).toEqual(DEFAULT_DISPLAY);
    expect(tintButtons(el)[0].classList.contains('mat-button-toggle-checked')).toBe(true);
    expect(sliders(el)[2].value).toBe('50');
  });
});
