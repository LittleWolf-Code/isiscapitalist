// Icône du jeu avec repli (D32) : reçoit une liste ordonnée de chemins relatifs (logoCandidates
// de game-math.ts, ou [world.logo]) et affiche le premier qui charge. Sur l'événement `error` de
// l'<img>, passe au suivant ; liste vide ou tous en échec → aucun <img>, l'hôte garde sa place
// (32 px, game-icon.css) pour que les cellules ne bougent pas. Purement présentationnel.
import { Component, computed, input, linkedSignal } from '@angular/core';

// Les images du jeu sont servies par le backend (`public/`) : préfixe de tout `logo` reçu.
// Partagé avec ProductCard (icône 64 px de la carte, D25).
export const ICON_BASE_URL = 'http://localhost:3000/';

@Component({
  selector: 'app-game-icon',
  standalone: true,
  templateUrl: './game-icon.html',
  styleUrl: './game-icon.css',
})
export class GameIcon {
  readonly candidates = input.required<readonly string[]>();
  // Décorative par défaut : le nom est déjà écrit à côté (cellule, toolbar).
  readonly alt = input('');

  // Clé de CONTENU de la liste : les parents la recalculent dans leur template à chaque cycle de
  // détection (nouveau tableau 10 fois par seconde avec le timer de GameService, D15) ; suivre
  // l'identité relancerait une image 404 sans fin. Suivre le contenu suffit : un autre monde ou
  // un autre logo (reset, getWorld, D14) réinitialise bien l'essai.
  private readonly key = computed(() => this.candidates().join('\n'));

  // Index du candidat en cours d'essai : repart à 0 dès que la liste change (linkedSignal plutôt
  // qu'un effect qui écrit un signal).
  protected readonly index = linkedSignal({ source: this.key, computation: () => 0 });

  // URL absolue du candidat courant, ou null quand il n'en reste plus.
  protected readonly src = computed<string | null>(() => {
    const candidates = this.candidates();
    const i = this.index();
    return i < candidates.length ? ICON_BASE_URL + candidates[i] : null;
  });

  protected onError(): void {
    this.index.update((i) => i + 1);
  }
}
