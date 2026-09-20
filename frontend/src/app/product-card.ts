// Carte d'un produit : purement présentationnelle (input/output, aucune injection). Les formules
// affichées (coût, gain) sont recalculées localement pour l'affichage seulement (game-math.ts).
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  buyCost,
  formatDuration,
  formatNumber,
  maxAffordable,
  nextUnlock,
  productionGain,
  productionProgress,
} from './game-math';
// Préfixe des images du jeu, partagé avec GameIcon (D32).
import { ICON_BASE_URL } from './game-icon';
import { Multiplier, ProductData } from './game.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatChipsModule, MatProgressBarModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  readonly product = input.required<ProductData>();
  readonly activeangels = input.required<number>();
  readonly angelbonus = input.required<number>();
  readonly multiplier = input.required<Multiplier>();
  // Solde du dernier getWorld (D15) : sert à calculer la quantité en mode 'max' et à désactiver
  // le bouton Acheter (D17).
  readonly money = input.required<number>();
  // Manager acheté pour ce produit (world.managers[].unlocked, dérivé par App). Distinct de
  // product.managerUnlocked (automatisation active) : possédé + inactif = en pause (D20).
  readonly managerOwned = input.required<boolean>();

  // Émis avec la quantité à acheter (= quantity()).
  readonly buy = output<number>();
  // Production manuelle (bouton Produire, sans manager).
  readonly launch = output<void>();
  // Pause / reprise de l'automatisation (bouton Arrêter / Reprendre, manager possédé).
  readonly toggleManager = output<void>();

  protected readonly iconUrl = computed(() => ICON_BASE_URL + this.product().logo);
  // Libellé du bouton de production, trois états (D20) : sans manager → Produire ; manager
  // actif → Arrêter ; manager possédé mais en pause → Reprendre. Désactivé si quantite = 0 (D21).
  protected readonly productionLabel = computed(() => {
    if (!this.managerOwned()) return 'Produire';
    return this.product().managerUnlocked ? 'Arrêter' : 'Reprendre';
  });
  // Même garde-fou que le serveur (D12 : aucun exemplaire → refus) ; quantite seule décide, quel
  // que soit le libellé. Pas de désactivation pendant une production en cours (no-op serveur).
  protected readonly canProduce = computed(() => this.product().quantite > 0);
  // Quantité réellement envoyée à acheterQtProduit : le multiplicateur, ou le maximum payable.
  protected readonly quantity = computed(() => {
    const multiplier = this.multiplier();
    return multiplier === 'max'
      ? maxAffordable(this.product(), this.money())
      : multiplier;
  });
  protected readonly cost = computed(() => buyCost(this.product(), this.quantity()));
  // Même condition que le serveur (money < total strict → refus) ; quantité 0 jamais envoyée.
  protected readonly canBuy = computed(
    () => this.quantity() > 0 && this.cost() <= this.money(),
  );
  protected readonly gain = computed(() =>
    productionGain(
      { activeangels: this.activeangels(), angelbonus: this.angelbonus() },
      this.product(),
    ),
  );
  // Progression de la barre de production en % (mat-progress-bar attend 0-100) : calcul pur dans
  // game-math.ts (même schéma que nextPalier / nextUnlock) — 0 si vitesse ≤ 0, pleine en continu
  // sous FAST_CYCLE_MS (cycle trop rapide pour le tick 100 ms, D29), sinon suit timeleft.
  protected readonly progress = computed(() => productionProgress(this.product()));
  // Chrono : temps restant de la production en cours, ou durée d'un cycle au repos (comme
  // AdVenture Capitalist : le joueur voit ce que coûtera la prochaine production). Suit le timer
  // 100 ms de GameService via product().timeleft (D15, D28).
  protected readonly remainingLabel = computed(() => {
    const { vitesse, timeleft } = this.product();
    return formatDuration(timeleft > 0 ? timeleft : vitesse);
  });

  // Prochain palier verrouillé (plus petit seuil, D23) : null si tout est débloqué. Dérivé de
  // product() seulement, jamais du timer 100 ms : quantite ne change qu'à la réception d'un
  // getWorld (D14 / D15).
  protected readonly nextPalier = computed(() => nextUnlock(this.product()));
  // Barre d'achat « quantite / seuil du prochain palier » en % : 100 si tout est débloqué ou si
  // seuil <= 0 (données absurdes, même garde-fou que progress()) ; bornée à 0-100 (un JSON édité à
  // la main peut porter quantite > seuil avec le palier encore verrouillé : le backend ne vérifie
  // les unlocks qu'à l'achat suivant).
  protected readonly ownedProgress = computed(() => {
    const next = this.nextPalier();
    if (next === null || next.seuil <= 0) return 100;
    return Math.min(100, Math.max(0, (100 * this.product().quantite) / next.seuil));
  });

  protected readonly fmt = formatNumber;

  // Sans manager : lance une production ; avec manager possédé : bascule l'automatisation.
  protected onProductionClick(): void {
    if (this.managerOwned()) {
      this.toggleManager.emit();
    } else {
      this.launch.emit();
    }
  }
}
