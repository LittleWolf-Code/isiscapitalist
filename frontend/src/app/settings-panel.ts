// Écran Paramètres : réglages de l'écran cathodique (D22, élargis en D34) liés en two-way
// (un seul model DisplaySettings) au signal `display` de GameService par App. Purement
// présentationnel (aucune injection) : importe le modèle de display-settings.ts, pas le service.
import { Component, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DEFAULT_DISPLAY, DisplaySettings, Tint } from './display-settings';

// Libellés des teintes, dans l'ordre des boutons.
export const TINT_LABELS: readonly { value: Tint; label: string }[] = [
  { value: 'green', label: 'Vert' },
  { value: 'amber', label: 'Ambre' },
  { value: 'blue', label: 'Bleu' },
  { value: 'white', label: 'Blanc' },
];

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [MatSlideToggleModule, MatSliderModule, MatButtonToggleModule, MatButtonModule],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel {
  readonly display = model.required<DisplaySettings>();

  protected readonly tints = TINT_LABELS;

  // Chaque toggle / curseur ne modifie que son champ : l'objet est recréé (signal immuable).
  protected patch(partial: Partial<DisplaySettings>): void {
    this.display.update((d) => ({ ...d, ...partial }));
  }

  protected onTintChange(value: Tint): void {
    this.patch({ tint: value });
  }

  // Étiquette du curseur discret.
  protected percent(value: number): string {
    return `${value} %`;
  }

  protected reset(): void {
    this.display.set({ ...DEFAULT_DISPLAY });
  }
}
