import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_DISPLAY, DisplaySettings } from './display-settings';
import { MIXED_CONTENT_HINT, SERVER_ERROR, SettingsPanel } from './settings-panel';

// Hôte de test : un signal DisplaySettings lié en two-way, comme App avec GameService.display.
@Component({
  standalone: true,
  imports: [SettingsPanel],
  template: `
    <app-settings-panel
      [(display)]="display"
      [server]="server()"
      defaultServer="http://localhost:3000/"
      [httpsPage]="httpsPage()"
      (serverChange)="emitted.push($event); server.set($event)"
      [angelDivisor]="angelDivisor()"
      (angelDivisorChange)="divisors.push($event); angelDivisor.set($event)"
    />
  `,
})
class Host {
  readonly display = signal<DisplaySettings>({ ...DEFAULT_DISPLAY });
  // Comme App + GameService.setServer : l'adresse émise devient l'adresse appliquée.
  readonly server = signal('http://localhost:3000/');
  readonly httpsPage = signal(false);
  readonly emitted: string[] = [];
  // Pas de monde chargé par défaut : le cadre Démonstration est masqué.
  readonly angelDivisor = signal<number | null>(null);
  readonly divisors: number[] = [];
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
  'Effets sonores',
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

  it('affiche le titre, 5 sections, 9 interrupteurs dans l\'ordre, 4 curseurs et 4 teintes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Paramètres');
    expect(Array.from(el.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual(['Écran', 'Lumière', 'Animations', 'Son', 'Serveur']);
    expect(toggles(el).map((t) => t.textContent?.trim())).toEqual(TOGGLE_ORDER);
    // Défauts : statiques on, animés off, son on.
    expect(buttons(el).map((b) => b.getAttribute('aria-checked'))).toEqual([
      'true', 'true', 'true', 'true', 'true', 'false', 'false', 'false', 'true',
    ]);
    expect(sliders(el).map((s) => s.getAttribute('aria-label'))).toEqual([
      'Intensité de la vignette',
      'Intensité des scanlines',
      'Intensité du halo',
      'Volume des effets sonores',
    ]);
    expect(sliders(el).map((s) => s.value)).toEqual(['50', '50', '50', '50']);
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

  describe('formule des anges du compte (D43)', () => {
    function formulaButtons(el: HTMLElement): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('.angel-formula mat-button-toggle'));
    }

    it('cadre masqué sans monde', async () => {
      const fixture = TestBed.createComponent(Host);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.demo-settings')).toBeNull();
    });

    it('« Sujet » coché pour 10¹⁵, clic « Express » → 1000 émis, formule affichée', async () => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.angelDivisor.set(1e15);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.demo-settings h3')?.textContent?.trim()).toBe('Démonstration');
      expect(formulaButtons(el).map((b) => b.textContent?.trim())).toEqual(['Sujet', 'Démo', 'Express']);
      expect(formulaButtons(el)[0].classList.contains('mat-button-toggle-checked')).toBe(true);
      expect(el.querySelector('.demo-settings .hint')?.textContent).toContain('150 × √(score / 10¹⁵)');
      formulaButtons(el)[2].querySelector<HTMLButtonElement>('button')!.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.divisors).toEqual([1e3]);
      expect(formulaButtons(el)[2].classList.contains('mat-button-toggle-checked')).toBe(true);
      expect(el.querySelector('.demo-settings .hint')?.textContent).toContain('150 × √(score / 10³)');
    });
  });

  describe('adresse du serveur (F-34, D41)', () => {
    async function render() {
      const fixture = TestBed.createComponent(Host);
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const input = el.querySelector('.server-field input') as HTMLInputElement;
      return {
        fixture,
        host: fixture.componentInstance,
        el,
        input,
        type: async (value: string) => {
          input.value = value;
          input.dispatchEvent(new Event('input'));
          await fixture.whenStable();
        },
        enter: async () => {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
          await fixture.whenStable();
        },
        apply: () => el.querySelector('button.apply-server') as HTMLButtonElement,
        hint: () => el.querySelector('.server-field mat-hint')?.textContent?.trim() ?? null,
      };
    }

    it("champ prérempli avec l'adresse appliquée, « Appliquer » désactivé tant qu'elle ne change pas", async () => {
      const { input, apply, type } = await render();
      expect(input.value).toBe('http://localhost:3000/');
      expect(apply().disabled).toBe(true);
      await type('http://localhost:3000');
      expect(apply().disabled).toBe(true);
      await type('https://autre-groupe.fr');
      expect(apply().disabled).toBe(false);
    });

    it('Entrée sur une adresse valide → forme normalisée émise', async () => {
      const { host, input, type, enter } = await render();
      await type('  https://autre-groupe.fr/api ');
      await enter();
      expect(host.emitted).toEqual(['https://autre-groupe.fr/api/']);
      expect(input.value).toBe('https://autre-groupe.fr/api/');
    });

    it("adresse invalide → message d'erreur, rien n'est émis ; nouvelle saisie → message effacé", async () => {
      const { fixture, host, apply, type, hint } = await render();
      await type('localhost:3000');
      apply().click();
      await fixture.whenStable();
      expect(host.emitted).toEqual([]);
      expect(hint()).toBe(SERVER_ERROR);
      await type('localhost:300');
      expect(hint()).toBeNull();
    });

    it("« Défaut » émet l'adresse par défaut et remet le champ à jour", async () => {
      const { fixture, host, el, input } = await render();
      host.server.set('https://autre-groupe.fr/');
      await fixture.whenStable();
      (el.querySelector('button.default-server') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(host.emitted).toEqual(['http://localhost:3000/']);
      expect(input.value).toBe('http://localhost:3000/');
    });

    it('avertissement de contenu mixte seulement si la page est en https et la saisie en http', async () => {
      const { fixture, host, type, hint } = await render();
      expect(hint()).toBeNull();
      host.httpsPage.set(true);
      await fixture.whenStable();
      expect(hint()).toBe(MIXED_CONTENT_HINT);
      await type('https://autre-groupe.fr');
      expect(hint()).toBeNull();
    });
  });
});
