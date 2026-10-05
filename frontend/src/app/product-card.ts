// Composant « produit » du sujet (F-07) : à gauche l'image avec la quantité superposée, cliquable
// pour lancer la production (F-10) ; à droite la barre de production avec le gain d'une
// production, puis le bouton d'achat (quantité et coût) et le temps restant. Purement
// présentationnel (input / output) : GameService applique les actions.
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BigvaluePipe } from './bigvalue.pipe';
import { GameIcon } from './game-icon';
import { buyCost, maxAffordable, productionGain, productionProgress } from './game-math';
import { Multiplier, ProductData } from './game.service';
import { SecondPipe } from './second.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    GameIcon,
    BigvaluePipe,
    SecondPipe,
  ],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  readonly product = input.required<ProductData>();
  readonly activeangels = input.required<number>();
  readonly angelbonus = input.required<number>();
  // Position du multiplicateur d'achat d'App (F-13).
  readonly qtmulti = input.required<Multiplier>();
  // Argent actuel du joueur (monde local, F-14).
  readonly money = input.required<number>();
  // Rendu Pip-Boy de l'icône (D35), relayé à GameIcon.
  readonly pixelIcons = input(true);

  // Émis avec la quantité à acheter (= numberToBuy()).
  readonly buy = output<number>();
  // Clic sur l'icône (startFabrication) : GameService lance la production.
  readonly launch = output<void>();

  // F-14 : quantité maximale achetable, quantité visée par le multiplicateur, achat possible.
  protected readonly maxCanBuy = computed(() => maxAffordable(this.product(), this.money()));
  protected readonly numberToBuy = computed(() => {
    const qtmulti = this.qtmulti();
    return qtmulti === 'max' ? this.maxCanBuy() : qtmulti;
  });
  protected readonly cost = computed(() => buyCost(this.product(), this.numberToBuy()));
  // Même condition que le serveur (money < total strict → refus) ; quantité 0 jamais envoyée.
  protected readonly canBuy = computed(
    () => this.numberToBuy() > 0 && this.cost() <= this.money(),
  );

  // Gain d'une production, bonus des anges compris (F-30), écrit dans la barre de production.
  protected readonly gain = computed(() =>
    productionGain(
      { activeangels: this.activeangels(), angelbonus: this.angelbonus() },
      this.product(),
    ),
  );
  // Barre de production en % (0-100), suit timeleft que calcScore fait avancer toutes les 100 ms.
  protected readonly progress = computed(() => productionProgress(this.product()));
  // Temps restant de la production en cours, ou durée d'un cycle au repos.
  protected readonly remaining = computed(() => {
    const { vitesse, timeleft } = this.product();
    return timeleft > 0 ? timeleft : vitesse;
  });
  // Production manuelle possible : au moins un exemplaire et pas de manager (un produit
  // automatisé produit seul).
  protected readonly canProduce = computed(
    () => this.product().quantite > 0 && !this.product().managerUnlocked,
  );

  // Clic sur l'icône (F-10) ; GameService ignore aussi une production déjà en cours.
  protected startFabrication(): void {
    if (this.canProduce()) {
      this.launch.emit();
    }
  }
}
