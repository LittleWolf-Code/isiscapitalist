// Liste de paliers d'une fenêtre (managers, cash upgrades, angel upgrades, all unlocks) :
// purement présentationnelle. Les paliers NON débloqués viennent d'abord, comme le demande le
// sujet (F-18, F-25, F-27, F-31) : logo, nom, produit ciblé, effet, coût / seuil et bouton
// d'action actif seulement si le solde suffit (et, pour un manager, si son produit est possédé,
// D42). Les paliers débloqués suivent, barrés, avec la
// mention `doneLabel` à la place du bouton (D40), sauf si `showDone` est faux : la fenêtre
// Managers ne liste que les managers non engagés (D47). Sans `actionLabel` la liste n'a pas de
// bouton (all unlocks).
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { BigvaluePipe } from '../shared/bigvalue.pipe';
import { GameIcon } from '../shared/game-icon';
import { bonusLabel, logoCandidates, targetLabel } from '../game/game-math';
import { PalierData, ProductData } from '../game/game.service';

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
  // Mention d'un palier débloqué (« Engagé », « Acheté », « Atteint ») : le barré seul ne serait
  // pas annoncé par un lecteur d'écran.
  readonly doneLabel = input<string | null>(null);
  // Faux : les paliers débloqués ne sont pas listés du tout (fenêtre Managers, D47).
  readonly showDone = input(true);
  readonly costUnit = input<CostUnit>(null);
  // Solde disponible dans l'unité de costUnit (money ou activeangels) ; null = pas de bouton.
  readonly balance = input<number | null>(null);
  // Colonne « effet » : sans objet pour un manager (ratio / typeratio non utilisés, RG-12).
  readonly showEffect = input(true);
  // Message affiché (au-dessus des paliers barrés) quand tout est débloqué.
  readonly emptyText = input('Tout est débloqué.');
  // Produits du monde et logo du monde (D32) : cible en toutes lettres et repli d'image.
  readonly products = input<readonly ProductData[]>([]);
  readonly worldLogo = input<string>('');
  // Rendu Pip-Boy des icônes (D35), relayé à chaque GameIcon.
  readonly pixelIcons = input(true);
  // Noms des paliers dont le bouton reste grisé quel que soit le solde : managers dont le produit
  // n'a aucun exemplaire (D42). La liste reste agnostique des produits, App calcule les noms.
  readonly blockedNames = input<readonly string[]>([]);

  // Émis avec le palier cliqué.
  readonly action = output<PalierData>();

  // Paliers encore verrouillés puis débloqués (si showDone), chacun dans l'ordre du monde.
  protected readonly rows = computed(() => [
    ...this.paliers().filter((p) => !p.unlocked),
    ...(this.showDone() ? this.paliers().filter((p) => p.unlocked) : []),
  ]);
  protected readonly allUnlocked = computed(() => this.paliers().every((p) => p.unlocked));

  protected readonly displayedColumns = computed<readonly string[]>(() => [
    'logo',
    'name',
    'produit',
    ...(this.showEffect() ? ['effet'] : []),
    'seuil',
    ...(this.actionLabel() || this.doneLabel() ? ['action'] : []),
  ]);

  protected readonly bonus = bonusLabel;

  protected target(palier: PalierData): string {
    return targetLabel(palier, this.products());
  }

  protected icons(palier: PalierData): readonly string[] {
    return logoCandidates(palier, this.products(), this.worldLogo());
  }

  protected readonly trackByName = (_index: number, palier: PalierData): string => palier.name;

  // Mêmes conditions que le serveur : palier bloqué (D42) ou solde strictement inférieur au
  // seuil → refus.
  protected canAfford(palier: PalierData): boolean {
    const balance = this.balance();
    return balance !== null && balance >= palier.seuil && !this.blockedNames().includes(palier.name);
  }
}
