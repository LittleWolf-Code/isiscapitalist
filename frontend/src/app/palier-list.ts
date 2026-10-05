// Liste de paliers d'une fenêtre (managers, cash upgrades, angel upgrades, all unlocks) :
// purement présentationnelle. Comme le demande le sujet, seuls les paliers NON débloqués sont
// affichés (F-18, F-25, F-27, F-31) : logo, nom, produit ciblé, effet, coût / seuil et bouton
// d'action actif seulement si le solde suffit. Sans `actionLabel` la liste est en lecture seule
// (all unlocks).
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { BigvaluePipe } from './bigvalue.pipe';
import { GameIcon } from './game-icon';
import { bonusLabel, logoCandidates, targetLabel } from './game-math';
import { PalierData, ProductData } from './game.service';

// Unité du seuil affichée à côté du prix : argent, anges, ou rien (seuil = quantité pour les
// all unlocks).
export type CostUnit = '$' | 'anges' | null;

@Component({
  selector: 'app-palier-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, GameIcon, BigvaluePipe],
  templateUrl: './palier-list.html',
  styleUrl: './palier-list.css',
})
export class PalierList {
  readonly paliers = input.required<readonly PalierData[]>();
  readonly actionLabel = input<string | null>(null);
  readonly costUnit = input<CostUnit>(null);
  // Solde disponible dans l'unité de costUnit (money ou activeangels) ; null = pas de bouton.
  readonly balance = input<number | null>(null);
  // Colonne « effet » : sans objet pour un manager (ratio / typeratio non utilisés, RG-12).
  readonly showEffect = input(true);
  // Message affiché quand tout est débloqué.
  readonly emptyText = input('Tout est débloqué.');
  // Produits du monde et logo du monde (D32) : cible en toutes lettres et repli d'image.
  readonly products = input<readonly ProductData[]>([]);
  readonly worldLogo = input<string>('');
  // Rendu Pip-Boy des icônes (D35), relayé à chaque GameIcon.
  readonly pixelIcons = input(true);

  // Émis avec le palier cliqué.
  readonly action = output<PalierData>();

  // Paliers encore verrouillés, dans l'ordre du monde.
  protected readonly visible = computed(() => this.paliers().filter((p) => !p.unlocked));

  protected readonly displayedColumns = computed<readonly string[]>(() => [
    'logo',
    'name',
    'produit',
    ...(this.showEffect() ? ['effet'] : []),
    'seuil',
    ...(this.actionLabel() ? ['action'] : []),
  ]);

  protected readonly bonus = bonusLabel;

  protected target(palier: PalierData): string {
    return targetLabel(palier, this.products());
  }

  protected icons(palier: PalierData): readonly string[] {
    return logoCandidates(palier, this.products(), this.worldLogo());
  }

  protected readonly trackByName = (_index: number, palier: PalierData): string => palier.name;

  // Même condition que le serveur : solde strictement inférieur au seuil → refus.
  protected canAfford(palier: PalierData): boolean {
    const balance = this.balance();
    return balance !== null && balance >= palier.seuil;
  }
}
