// Page du jeu, deux dispositions au choix (réglage « Disposition », D37) :
// - 'sujet' (défaut, F-04 → F-06) : bandeau d'en-tête (monde, argent, multiplicateur d'achat,
//   pseudo + Refresh), bandeau gauche de boutons badgés qui ouvrent des fenêtres superposées
//   (Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors, plus Paramètres), produits au
//   centre ;
// - 'onglets' (disposition de la phase 9) : barre du haut à cases de stats et multiplicateur en
//   4 boutons, barre d'onglets en bas, un écran par onglet.
// Le contenu (produits, listes, Investors, Paramètres) est écrit une fois dans des ng-template et
// placé dans une fenêtre ou dans un écran. Messages éphémères en snack-bar (F-20). Toute la
// logique de jeu est dans GameService.
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AngelsPanel } from './angels-panel';
import { BigvaluePipe } from './bigvalue.pipe';
import { DisplaySettings } from './display-settings';
import { GameIcon } from './game-icon';
import { affordableCount, angelsEarned } from './game-math';
import { GameService, Multiplier } from './game.service';
import { Modal } from './modal';
import { PalierList } from './palier-list';
import { ProductCard } from './product-card';
import { SettingsPanel } from './settings-panel';
import { Tab, TabBar, TAB_STORAGE_KEY, readStoredTab } from './tab-bar';
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
    NgTemplateOutlet,
    ProductCard,
    PalierList,
    UnlockList,
    AngelsPanel,
    SettingsPanel,
    Modal,
    TabBar,
    GameIcon,
    BigvaluePipe,
    FormField,
    MatBadgeModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // Réglages d'affichage posés sur <app-root> (D22 / D34) : classes crt-* (une par effet),
  // data-tint (filtre de teinte) et variables --crt-* (intensités 0-1), plus la classe de
  // disposition (D37). Les effets sont des règles globales de styles.css.
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
    '[class.layout-sujet]': "layout() === 'sujet'",
    '[class.layout-onglets]': "layout() === 'onglets'",
  },
})
export class App {
  protected readonly game = inject(GameService);
  private readonly snackBar = inject(MatSnackBar);

  // Copie du monde du service, pour la lisibilité du template.
  protected readonly world = this.game.world;
  protected readonly menu = MENU;
  protected readonly qtCycle = QT_CYCLE;

  // Disposition choisie dans Paramètres (D37).
  readonly layout = computed(() => this.game.display().layout);
  // Position du multiplicateur d'achat (F-13), transmise à chaque produit.
  readonly qtmulti = signal<Multiplier>(1);
  // Disposition 'sujet' : fenêtre ouverte (une seule à la fois), null = aucune.
  readonly modal = signal<GameWindow | null>(null);
  // Disposition 'onglets' : onglet actif, mémorisé comme en phase 9.
  readonly tab = signal<Tab>(readStoredTab());

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

  // Mêmes badges sur la barre d'onglets ; l'onglet Anges regroupe Investors et angel upgrades,
  // il compte les angel upgrades achetables.
  protected readonly tabBadges = computed<Partial<Record<Tab, number>>>(() => {
    const badges = this.badges();
    return { managers: badges.managers, upgrades: badges.upgrades, angels: badges.angelupgrades };
  });

  constructor() {
    // Snack-bar à chaque nouveau message du service (F-20) ; le message initial vide est ignoré.
    effect(() => {
      const message = this.game.snackmessage();
      if (message) {
        this.snackBar.open(message, 'ok', { duration: 2000 });
      }
    });

    effect(() => {
      const tab = this.tab();
      try {
        localStorage.setItem(TAB_STORAGE_KEY, tab);
      } catch {
        // localStorage indisponible : l'onglet ne survit pas au rechargement.
      }
    });
  }

  // Libellé du multiplicateur : « x1 », « x10 », « x100 », « Max ».
  protected qtLabel(qt: Multiplier): string {
    return qt === 'max' ? 'Max' : 'x' + qt;
  }

  // Clic sur le multiplicateur du sujet : position suivante du cycle.
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

  // Réglages modifiés dans Paramètres. Changer de disposition garde le joueur sur ses réglages :
  // vers 'onglets', la fenêtre se ferme et l'onglet Paramètres s'ouvre ; vers 'sujet', la
  // fenêtre Paramètres s'ouvre.
  protected onDisplayChange(display: DisplaySettings): void {
    const before = this.layout();
    this.game.display.set(display);
    if (display.layout === before) {
      return;
    }
    if (display.layout === 'onglets') {
      this.modal.set(null);
      this.tab.set('settings');
    } else {
      this.modal.set('settings');
    }
  }

  // Bouton de reset (Investors) : confirmation, puis mutation et rechargement.
  protected onReset(): void {
    const user = this.game.user();
    const earned = this.angelsEarned();
    if (confirm(`Remettre à zéro la partie de « ${user} » ? Vous gagnerez ${earned} ange(s).`)) {
      this.close();
      void this.game.reset();
    }
  }
}
