// Page du jeu, mise en page du sujet (F-04 → F-06) : bandeau d'en-tête (monde, argent,
// multiplicateur d'achat, pseudo + Refresh), bandeau gauche de boutons badgés qui ouvrent des
// fenêtres superposées (Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors, plus
// Paramètres), partie centrale avec les six produits. Messages éphémères en snack-bar (F-20).
// Toute la logique de jeu est dans GameService.
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngelsPanel } from './angels-panel';
import { BigvaluePipe } from './bigvalue.pipe';
import { GameIcon } from './game-icon';
import { affordableCount, angelsEarned } from './game-math';
import { GameService, Multiplier } from './game.service';
import { Modal } from './modal';
import { PalierList } from './palier-list';
import { ProductCard } from './product-card';
import { SettingsPanel } from './settings-panel';
import { UnlockList } from './unlock-list';

// Fenêtres ouvertes depuis le bandeau gauche, dans l'ordre de la figure 7 du sujet.
export type GameWindow = 'unlocks' | 'upgrades' | 'angelupgrades' | 'managers' | 'investors' | 'settings';

export const MENU: readonly { readonly id: GameWindow; readonly label: string }[] = [
  { id: 'unlocks', label: 'Unlocks' },
  { id: 'upgrades', label: 'Cash Upgrades' },
  { id: 'angelupgrades', label: 'Angel Upgrades' },
  { id: 'managers', label: 'Managers' },
  { id: 'investors', label: 'Investors' },
  { id: 'settings', label: 'Paramètres' },
];

// Cycle du multiplicateur d'achat (F-13) : x1 → x10 → x100 → Max → x1.
export const QT_CYCLE: readonly Multiplier[] = [1, 10, 100, 'max'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ProductCard,
    PalierList,
    UnlockList,
    AngelsPanel,
    SettingsPanel,
    Modal,
    GameIcon,
    BigvaluePipe,
    FormField,
    MatBadgeModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // Réglages d'affichage posés sur <app-root> (D22 / D34) : classes crt-* (une par effet),
  // data-tint (filtre de teinte) et variables --crt-* (intensités 0-1). Les effets sont des
  // règles globales de styles.css (app-root.crt-*, .crt-overlay).
  host: {
    '[class.crt-scanlines]': 'game.display().scanlines',
    '[class.crt-glow]': 'game.display().glow',
    '[class.crt-flicker]': 'game.display().flicker',
    '[class.crt-vignette]': 'game.display().vignette',
    '[class.crt-grid]': 'game.display().grid',
    '[class.crt-grain]': 'game.display().grain',
    '[class.crt-roll]': 'game.display().roll',
    '[class.crt-noise]': 'game.display().noise',
    '[attr.data-tint]': 'game.display().tint',
    '[style.--crt-scanlines]': 'game.display().scanlinesLevel / 100',
    '[style.--crt-glow]': 'game.display().glowLevel / 100',
    '[style.--crt-vignette]': 'game.display().vignetteLevel / 100',
  },
})
export class App {
  protected readonly game = inject(GameService);
  private readonly snackBar = inject(MatSnackBar);

  // Copie du monde du service, pour la lisibilité du template.
  protected readonly world = this.game.world;
  protected readonly menu = MENU;

  // Position du multiplicateur d'achat (F-13), transmise à chaque produit.
  readonly qtmulti = signal<Multiplier>(1);
  // Fenêtre ouverte (une seule à la fois), null = aucune.
  readonly modal = signal<GameWindow | null>(null);

  // Anges supplémentaires qu'un reset rapporterait (fenêtre Investors et son badge).
  protected readonly angelsEarned = computed(() => {
    const world = this.world();
    return world ? angelsEarned(world) : 0;
  });

  // Badges du bandeau gauche (F-21, F-27, F-31) : nombre d'éléments achetables maintenant.
  protected readonly badges = computed<Record<GameWindow, number>>(() => {
    const world = this.world();
    return {
      unlocks: 0,
      upgrades: world ? affordableCount(world.upgrades, world.money) : 0,
      angelupgrades: world ? affordableCount(world.angelupgrades, world.activeangels) : 0,
      managers: world ? affordableCount(world.managers, world.money) : 0,
      investors: this.angelsEarned(),
      settings: 0,
    };
  });

  constructor() {
    // Snack-bar à chaque nouveau message du service (F-20) ; le message initial vide est ignoré.
    effect(() => {
      const message = this.game.snackmessage();
      if (message) {
        this.snackBar.open(message, 'ok', { duration: 2000 });
      }
    });
  }

  // Libellé du multiplicateur : « Buy x1 », « Buy x10 », « Buy x100 », « Buy Max ».
  protected qtLabel(qt: Multiplier): string {
    return qt === 'max' ? 'Max' : 'x' + qt;
  }

  // Clic sur le multiplicateur : position suivante du cycle.
  protected cycleQtmulti(): void {
    const index = QT_CYCLE.indexOf(this.qtmulti());
    this.qtmulti.set(QT_CYCLE[(index + 1) % QT_CYCLE.length]);
  }

  protected open(window: GameWindow): void {
    this.modal.set(window);
  }

  protected close(): void {
    this.modal.set(null);
  }

  // Bouton de reset de la fenêtre Investors : confirmation, puis mutation et rechargement.
  protected onReset(): void {
    const user = this.game.user();
    const earned = this.angelsEarned();
    if (confirm(`Remettre à zéro la partie de « ${user} » ? Vous gagnerez ${earned} ange(s).`)) {
      this.close();
      void this.game.reset();
    }
  }
}
