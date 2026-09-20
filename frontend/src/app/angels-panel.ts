// Panneau Anges : deux sous-onglets, Reset (anges gagnables, stats, bouton Reset) et Bonus
// (angel upgrades via PalierList). Purement présentationnel : ne connaît ni l'utilisateur ni
// Apollo ; le confirm() du reset est fait par App, qui seule connaît `user`.
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { formatNumber } from './game-math';
import { PalierData, ProductData } from './game.service';
import { PalierList } from './palier-list';

@Component({
  selector: 'app-angels-panel',
  standalone: true,
  imports: [MatTabsModule, MatButtonModule, PalierList],
  templateUrl: './angels-panel.html',
  styleUrl: './angels-panel.css',
})
export class AngelsPanel {
  readonly score = input.required<number>();
  readonly totalangels = input.required<number>();
  readonly activeangels = input.required<number>();
  readonly angelbonus = input.required<number>();
  // Calculé une fois dans App (angelsEarned de game-math.ts) et partagé avec la barre latérale.
  readonly angelsEarned = input.required<number>();
  readonly angelupgrades = input.required<readonly PalierData[]>();
  // Transmis tels quels à la PalierList des angel upgrades (colonne « produit », repli d'image,
  // D32) : le panneau reste sans injection.
  readonly products = input<readonly ProductData[]>([]);
  readonly worldLogo = input<string>('');

  // Clic sur Reset : App confirme puis appelle game.reset(). Jamais désactivé (reset à 0 permis).
  readonly resetRequested = output<void>();
  // Relayé depuis la PalierList des angel upgrades (name du palier).
  readonly buyAngelUpgrade = output<string>();

  protected readonly fmt = formatNumber;
}
