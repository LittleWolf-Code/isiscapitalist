// Écran Paramètres : trois interrupteurs de l'effet écran cathodique, liés en two-way (model)
// aux signaux de GameService par App. Purement présentationnel (aucune injection), D22.
import { Component, model } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [MatSlideToggleModule],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel {
  readonly scanlines = model.required<boolean>();
  readonly glow = model.required<boolean>();
  readonly flicker = model.required<boolean>();
}
