// Liste de paliers (managers, upgrades, angel upgrades, all unlocks) : purement présentationnelle.
// Sans `actionLabel`, la liste est en lecture seule (all unlocks) et n'a pas de colonne action.
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { GameIcon } from './game-icon';
import { formatNumber, logoCandidates, targetLabel } from './game-math';
import { PalierData, ProductData } from './game.service';

// Unité du seuil affichée à côté du prix : argent, anges, ou rien (seuil = quantité pour les
// all unlocks).
export type CostUnit = '$' | 'anges' | null;

// Colonne « logo » (icône avec repli) et « produit » (cible en toutes lettres) à la place de
// l'id brut `idcible` (D32).
const BASE_COLUMNS = ['logo', 'name', 'seuil', 'produit', 'ratio', 'typeratio', 'unlocked'] as const;

@Component({
  selector: 'app-palier-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, GameIcon],
  templateUrl: './palier-list.html',
  styleUrl: './palier-list.css',
})
export class PalierList {
  readonly title = input.required<string>();
  readonly paliers = input.required<readonly PalierData[]>();
  readonly actionLabel = input<string | null>(null);
  readonly costUnit = input<CostUnit>(null);
  // Solde disponible dans l'unité de costUnit (money ou activeangels) ; null = pas de vérification
  // d'argent (all unlocks). Désactive le bouton si balance < seuil (D17).
  readonly balance = input<number | null>(null);
  // Noms des paliers dont l'action est refusée par le serveur pour une autre raison que l'argent
  // (managers dont le produit cible n'a aucun exemplaire, D24). La liste reste agnostique des
  // produits : le parent dérive les noms (blockedManagerNames), elle ne fait que griser.
  readonly blockedNames = input<readonly string[]>([]);
  // Produits du monde et logo du monde (D32) : servent à nommer la cible (targetLabel) et au
  // repli d'image (logoCandidates). Reçus en inputs pour que la liste reste présentationnelle ;
  // par défaut vides (la liste montée seule affiche « #id » et n'a pas de repli).
  readonly products = input<readonly ProductData[]>([]);
  readonly worldLogo = input<string>('');

  // Émis avec le `name` du palier cliqué.
  readonly action = output<string>();

  // Colonnes du mat-table : la colonne action n'existe que si un libellé est fourni.
  protected readonly displayedColumns = computed<readonly string[]>(() =>
    this.actionLabel() ? [...BASE_COLUMNS, 'action'] : BASE_COLUMNS,
  );

  protected readonly fmt = formatNumber;

  // Colonne « produit » : nom du produit ciblé, « Global » (0), « Anges » (-1) ou « #id ».
  protected target(palier: PalierData): string {
    return targetLabel(palier, this.products());
  }

  // Candidats d'image du palier, dans l'ordre (logo, puis produit ciblé ou monde).
  protected icons(palier: PalierData): readonly string[] {
    return logoCandidates(palier, this.products(), this.worldLogo());
  }

  // Identité des lignes pour mat-table (même clé que `track palier.name` avant).
  protected readonly trackByName = (_index: number, palier: PalierData): string => palier.name;

  // Même condition que le serveur : déjà débloqué, solde strictement inférieur au seuil, ou
  // palier bloqué par le parent (blockedNames, D24).
  protected isDisabled(palier: PalierData): boolean {
    const balance = this.balance();
    return (
      palier.unlocked ||
      (balance !== null && balance < palier.seuil) ||
      this.blockedNames().includes(palier.name)
    );
  }
}
