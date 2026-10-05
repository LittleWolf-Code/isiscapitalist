// Fenêtre Unlocks, section « Par produit » (D23, option « prochain seuil de chaque produit » du
// sujet, F-25) : pour chaque produit, le prochain palier verrouillé, son effet en toutes lettres et
// la progression quantite / seuil. Purement présentationnel (input, aucun output, aucune
// injection) ; les paliers sont débloqués par GameService (applyUnlocks) et par le serveur.
import { Component, computed, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { GameIcon } from './game-icon';
import { bonusLabel, logoCandidates, nextUnlock } from './game-math';
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
  // Rendu Pip-Boy des icônes (D35), relayé à GameIcon.
  readonly pixelIcons = input(true);

  protected readonly displayedColumns = COLUMNS;

  // Lignes dérivées des produits du monde. Progression bornée à 0-100, et 100 si seuil <= 0.
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

  protected readonly bonus = bonusLabel;

  // Candidats d'image du prochain palier (logo, puis produit ciblé ou monde, D32).
  protected icons(palier: PalierData): readonly string[] {
    return logoCandidates(palier, this.products(), this.worldLogo());
  }

  // Identité des lignes pour mat-table (même clé que la grille des cartes).
  protected readonly trackById = (_index: number, row: UnlockRow): number => row.product.id;
}
