// Fenêtre superposée du sujet (F-05, F-18) : se pose au-dessus de l'interface (position fixe),
// se ferme par son bouton Close, par Échap ou par un clic sur le fond. Le contenu est projeté.
// Purement présentationnelle : App décide quelle fenêtre est ouverte (signal `modal`).
// Clavier : cdkTrapFocus donne le focus au bouton Close à l'ouverture, garde Tab dans la fenêtre
// et rend le focus à l'élément d'origine à la fermeture (comme MatDialog).
import { Component, input, output } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';

let nextId = 0;

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [MatButtonModule, CdkTrapFocus],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
}
