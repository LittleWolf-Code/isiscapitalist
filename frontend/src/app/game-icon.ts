// Icône du jeu avec repli (D32) : reçoit une liste ordonnée de chemins relatifs (logoCandidates
// de game-math.ts, ou [world.logo]) et affiche le premier qui charge. Sur l'événement `error` de
// l'<img>, passe au suivant ; liste vide ou tous en échec → aucun <img>, l'hôte garde sa place
// (32 px, game-icon.css) pour que les cellules ne bougent pas. Purement présentationnel.
// Depuis D35, rend par défaut l'image en « écran Pip-Boy » (pixel-art.ts : 96 × 96, 4 verts) via
// une data URL dans le même <img> ; `pixelIcons` à false → image couleur d'origine.
import { Component, computed, effect, input, linkedSignal, signal, untracked } from '@angular/core';
import { pipboyDataUrl } from './pixel-art';
import { SERVER } from './server';

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
  // Rendu Pip-Boy (D35) ; descend d'App par inputs comme candidates, le composant reste sans
  // injection (D32).
  readonly pixelIcons = input(true);

  // Clé de CONTENU de la liste : les parents la recalculent dans leur template à chaque cycle de
  // détection (nouveau tableau 10 fois par seconde avec la boucle calcScore de GameService) ; suivre
  // l'identité relancerait une image 404 sans fin. Suivre le contenu suffit : un autre monde ou
  // un autre logo (reset, getWorld, D14) réinitialise bien l'essai.
  private readonly key = computed(() => this.candidates().join('\n'));

  // Index du candidat en cours d'essai : repart à 0 dès que la liste change (linkedSignal plutôt
  // qu'un effect qui écrit un signal).
  protected readonly index = linkedSignal({ source: this.key, computation: () => 0 });

  // URL absolue du candidat courant (adresse du serveur + logo, F-03), ou null quand il n'en
  // reste plus.
  protected readonly src = computed<string | null>(() => {
    const candidates = this.candidates();
    const i = this.index();
    return i < candidates.length ? SERVER() + candidates[i] : null;
  });

  // Ce que l'<img> affiche vraiment : src() en mode couleur, la data URL Pip-Boy sinon — et null
  // tant qu'elle n'est pas résolue (pas d'image couleur qui clignoterait avant le vert).
  protected readonly displaySrc = signal<string | null>(null);

  constructor() {
    effect(() => {
      const src = this.src();
      const pixel = this.pixelIcons();
      if (src === null || !pixel) {
        this.displaySrc.set(src);
        return;
      }
      this.displaySrc.set(null);
      // Garde : le résultat n'est appliqué que si le candidat et le mode n'ont pas changé
      // entre-temps (candidat suivant, bascule du réglage). Rejet = l'image ne se charge pas
      // → candidat suivant, comme l'événement (error) de l'<img>.
      const stillWanted = () => untracked(this.src) === src && untracked(this.pixelIcons);
      pipboyDataUrl(src).then(
        (dataUrl) => stillWanted() && this.displaySrc.set(dataUrl),
        () => stillWanted() && this.onError(),
      );
    });
  }

  protected onError(): void {
    this.index.update((i) => i + 1);
  }
}
