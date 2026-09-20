// Onglet Unlocks, section « Par produit » (D23) : pour chaque produit, le prochain palier
// verrouillé, son effet et la progression quantite / seuil. Purement présentationnel (input,
// aucun output, aucune injection) ; le backend seul débloque les paliers (GAME-RULES.md §Unlocks),
// on ne fait qu'afficher product.paliers[].unlocked via nextUnlock (même formule que la carte).
import { Component, computed, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { GameIcon } from './game-icon';
import { logoCandidates, nextUnlock } from './game-math';
import { PalierData, ProductData } from './game.service';

// Une ligne de la table : le produit, son prochain palier (null = tout débloqué) et la
// progression en % (0-100) pour la mat-progress-bar.
interface UnlockRow {
  readonly product: ProductData;
  readonly next: PalierData | null;
  readonly progress: number;
}

const COLUMNS = ['produit', 'palier', 'effet', 'progression'] as const;

@Component({
  selector: 'app-unlock-list',
  standalone: true,
  imports: [MatTableModule, MatProgressBarModule, GameIcon],
  templateUrl: './unlock-list.html',
  styleUrl: './unlock-list.css',
})
export class UnlockList {
  readonly products = input.required<readonly ProductData[]>();
  // Logo du monde : repli d'image d'un palier à idcible 0 (D32) ; '' = pas de repli.
  readonly worldLogo = input<string>('');

  protected readonly displayedColumns = COLUMNS;

  // Lignes dérivées des produits reçus (getWorld, D14) : rien n'est animé par le timer (D15).
  // Progression bornée à 0-100 et 100 si seuil <= 0, comme ownedProgress sur la carte.
  protected readonly rows = computed<readonly UnlockRow[]>(() =>
    this.products().map((product) => {
      const next = nextUnlock(product);
      const progress =
        next === null || next.seuil <= 0
          ? 100
          : Math.min(100, Math.max(0, (100 * product.quantite) / next.seuil));
      return { product, next, progress };
    }),
  );

  // Candidats d'image du prochain palier (logo, puis produit ciblé ou monde, D32).
  protected icons(palier: PalierData): readonly string[] {
    return logoCandidates(palier, this.products(), this.worldLogo());
  }

  // Identité des lignes pour mat-table (même clé que la grille des cartes).
  protected readonly trackById = (_index: number, row: UnlockRow): number => row.product.id;
}
