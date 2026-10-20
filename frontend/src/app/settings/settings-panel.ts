// Écran Paramètres : réglages de l'écran cathodique (D22, élargis en D34) liés en two-way
// (un seul model DisplaySettings) au signal `display` de GameService par App, et adresse du
// serveur (F-34, D41 : saisie validée ici, appliquée par GameService.setServer via
// `serverChange`), et formule des anges du compte (D43, démonstration : appliquée par
// GameService.setAngelDivisor via `angelDivisorChange`). Purement présentationnel (aucune injection) : importe le modèle de
// display-settings.ts et les fonctions pures de server.ts / game-math.ts, pas le service.
import { Component, computed, input, linkedSignal, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DEFAULT_DISPLAY, DisplaySettings, Layout, Tint } from './display-settings';
import { ANGEL_FORMULAS, angelFormulaLabel } from '../game/game-math';
import { normalizeServerUrl } from './server';

export const SERVER_ERROR = "L'adresse doit commencer par http:// ou https://";
export const MIXED_CONTENT_HINT = 'Depuis une page https, le navigateur peut bloquer un serveur en http://';

// Libellés des teintes, dans l'ordre des boutons.
export const TINT_LABELS: readonly { value: Tint; label: string }[] = [
  { value: 'green', label: 'Vert' },
  { value: 'amber', label: 'Ambre' },
  { value: 'blue', label: 'Bleu' },
  { value: 'white', label: 'Blanc' },
];

// Libellés des dispositions (D37), dans l'ordre des boutons.
export const LAYOUT_LABELS: readonly { value: Layout; label: string }[] = [
  { value: 'sujet', label: 'Menu à gauche (sujet)' },
  { value: 'onglets', label: 'Onglets en bas' },
];

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [
    MatSlideToggleModule,
    MatSliderModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel {
  readonly display = model.required<DisplaySettings>();
  // Titre « Paramètres » : masqué quand le panneau est dans une fenêtre qui porte déjà ce titre.
  readonly showTitle = input(true);
  // Adresse appliquée, adresse par défaut (server.ts), et page servie en https (avertissement de
  // contenu mixte). Émis : l'adresse normalisée à appliquer.
  readonly server = input.required<string>();
  readonly defaultServer = input.required<string>();
  readonly httpsPage = input(globalThis.location?.protocol === 'https:');
  readonly serverChange = output<string>();
  // Diviseur de la formule des anges du compte (D43) ; null tant qu'aucun monde n'est chargé
  // (le cadre Démonstration est alors masqué). Émis : le diviseur choisi.
  readonly angelDivisor = input<number | null>(null);
  readonly angelDivisorChange = output<number>();
  protected readonly angelFormulas = ANGEL_FORMULAS;
  protected readonly angelFormula = computed(() => {
    const divisor = this.angelDivisor();
    return divisor === null ? '' : angelFormulaLabel(divisor);
  });

  // Saisie en cours : repart de l'adresse appliquée chaque fois que celle-ci change.
  protected readonly serverDraft = linkedSignal(() => this.server());
  protected readonly serverError = signal<string | null>(null);
  private readonly draftUrl = computed(() => normalizeServerUrl(this.serverDraft()));
  // « Appliquer » inutile tant que la saisie désigne déjà l'adresse appliquée.
  protected readonly canApply = computed(() => this.draftUrl() !== this.server());
  protected readonly mixedContent = computed(
    () => this.httpsPage() && /^http:/i.test(this.serverDraft().trim()),
  );
  protected readonly mixedContentHint = MIXED_CONTENT_HINT;

  protected readonly tints = TINT_LABELS;
  protected readonly layouts = LAYOUT_LABELS;

  // Chaque toggle / curseur ne modifie que son champ : l'objet est recréé (signal immuable).
  protected patch(partial: Partial<DisplaySettings>): void {
    this.display.update((d) => ({ ...d, ...partial }));
  }

  protected onTintChange(value: Tint): void {
    this.patch({ tint: value });
  }

  protected onLayoutChange(value: Layout): void {
    this.patch({ layout: value });
  }

  // Étiquette du curseur discret.
  protected percent(value: number): string {
    return `${value} %`;
  }

  // Réglages d'affichage seulement : l'adresse du serveur a son propre bouton « Défaut ».
  protected reset(): void {
    this.display.set({ ...DEFAULT_DISPLAY });
  }

  protected onAngelDivisorChange(value: number): void {
    if (value !== this.angelDivisor()) {
      this.angelDivisorChange.emit(value);
    }
  }

  protected onServerInput(value: string): void {
    this.serverDraft.set(value);
    this.serverError.set(null);
  }

  // Entrée ou « Appliquer » : adresse invalide → message, rien n'est émis.
  protected applyServer(): void {
    const url = this.draftUrl();
    if (url === null) {
      this.serverError.set(SERVER_ERROR);
      return;
    }
    if (url !== this.server()) {
      this.serverChange.emit(url);
    }
  }

  protected resetServer(): void {
    this.serverDraft.set(this.defaultServer());
    this.serverError.set(null);
    if (this.server() !== this.defaultServer()) {
      this.serverChange.emit(this.defaultServer());
    }
  }
}
