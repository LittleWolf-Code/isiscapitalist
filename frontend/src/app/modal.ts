// Fenêtre superposée du sujet (F-05, F-18) : se pose au-dessus de l'interface (position fixe),
// se ferme par son bouton Close, par Échap ou par un clic sur le fond — un clic commencé ET fini
// sur le fond (D50). Le contenu est projeté.
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
  host: {
    '(document:keydown.escape)': 'closed.emit()',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;

  // Vrai si le dernier appui dans la fenêtre a commencé sur le fond (D50). Sélectionner le texte
  // d'un champ en glissant jusqu'au fond se termine par un « click » que certains navigateurs
  // envoient au fond (là où le bouton est relâché) : sans ce garde, la fenêtre se fermait.
  private pressedOnBackdrop = false;

  protected onPointerDown(event: Event): void {
    this.pressedOnBackdrop = (event.target as Element | null)?.classList.contains('backdrop') ?? false;
  }

  protected onBackdropClick(): void {
    if (this.pressedOnBackdrop) {
      this.closed.emit();
    }
    this.pressedOnBackdrop = false;
  }
}
