// Page unique du jeu, disposition « écran cathodique » (D22) : bandeau Material (titre, user,
// multiplicateur, cases MONEY / SCORE / ANGES / BONUS), bandeau d'erreur, puis TabBar qui projette
// l'écran de l'onglet actif (6 ProductCard, PalierList, UnlockList + PalierList, AngelsPanel ou
// SettingsPanel) au-dessus de la barre d'onglets du bas. Toute la logique est dans GameService.
import { Component, computed, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AngelsPanel } from './angels-panel';
import { GameIcon } from './game-icon';
import { angelsEarned, blockedManagerNames, formatNumber } from './game-math';
import { GameService, Multiplier, ProductData, WorldData } from './game.service';
import { PalierList } from './palier-list';
import { ProductCard } from './product-card';
import { SettingsPanel } from './settings-panel';
import { TabBar } from './tab-bar';
import { UnlockList } from './unlock-list';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ProductCard,
    PalierList,
    UnlockList,
    TabBar,
    AngelsPanel,
    SettingsPanel,
    GameIcon,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // Réglages CRT posés en classes sur <app-root> : les effets sont des règles globales de
  // styles.css (app-root.crt-*), hors budget anyComponentStyle.
  host: {
    '[class.crt-scanlines]': 'game.scanlines()',
    '[class.crt-glow]': 'game.glow()',
    '[class.crt-flicker]': 'game.flicker()',
  },
})
export class App {
  protected readonly game = inject(GameService);

  protected readonly multipliers: readonly Multiplier[] = [1, 10, 100, 'max'];
  protected readonly fmt = formatNumber;

  // Anges que rapporterait un reset maintenant, calculés une seule fois pour la pastille de la
  // barre et l'écran Anges ; 0 tant qu'aucun monde n'est chargé (pastille masquée).
  protected readonly angelsEarned = computed(() => {
    const world = this.game.world();
    return world ? angelsEarned(world) : 0;
  });

  // Managers non possédés dont le produit cible n'a aucun exemplaire : leur bouton Engager est
  // grisé (D24), le serveur refuserait. Recalculé à chaque getWorld (D14).
  protected readonly blockedManagers = computed(() => {
    const world = this.game.world();
    return world ? blockedManagerNames(world) : [];
  });

  // Manager acheté pour ce produit (palier de world.managers ciblant le produit et débloqué) :
  // ProductCard en déduit Produire / Arrêter / Reprendre avec product.managerUnlocked (D20).
  protected managerOwned(world: WorldData, product: ProductData): boolean {
    return world.managers.some((m) => m.idcible === product.id && m.unlocked);
  }

  // `change` (et non `input`) : le monde n'est rechargé qu'une fois la saisie terminée, sinon
  // chaque frappe créerait un fichier userworlds/<préfixe>-world.json côté serveur.
  protected onUserChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.game.user.set(value);
  }

  // `$event.value` du mat-button-toggle-group est la valeur fournie au [value] du toggle
  // (nombre ou 'max'), transmise telle quelle : pas de conversion.
  protected onMultiplierChange(value: Multiplier): void {
    this.game.multiplier.set(value);
  }

  // Le confirm() vit ici (l'écran Anges ne connaît pas `user`) ; `earned` est l'estimation
  // client, le serveur recalcule au reset (D19).
  protected onReset(earned: number): void {
    const user = this.game.user();
    if (confirm(`Réinitialiser le monde de « ${user} » ? Vous gagnerez ${earned} ange(s).`)) {
      void this.game.reset();
    }
  }
}
