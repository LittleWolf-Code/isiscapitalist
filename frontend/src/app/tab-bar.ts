// Barre d'onglets du bas (Produits, Managers, Upgrades, Anges, Unlocks, Paramètres) : purement
// présentationnelle. L'écran de l'onglet actif est projeté (ng-content) dans le mat-tab-nav-panel
// au-dessus de la barre ; ne fait qu'émettre l'onglet cliqué, GameService.selectTab décide (D22).
import { Component, input, output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { Tab } from './game.service';

// Libellé de chaque onglet, dans l'ordre d'affichage (texte seul, pas d'icône).
export const NAV_ITEMS: readonly { id: Tab; label: string }[] = [
  { id: 'products', label: 'Produits' },
  { id: 'managers', label: 'Managers' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'angels', label: 'Anges' },
  { id: 'unlocks', label: 'Unlocks' },
  { id: 'settings', label: 'Paramètres' },
];

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [MatTabsModule, MatBadgeModule],
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.css',
})
export class TabBar {
  // Onglet actif (toujours un : Material pose mdc-tab--active / aria-selected sur son lien).
  readonly active = input.required<Tab>();
  // Anges que rapporterait un reset maintenant : pastille sur l'onglet Anges, masquée à 0 (D19).
  readonly angelsEarned = input.required<number>();

  // Émis avec l'onglet cliqué, sauf s'il est déjà actif (rien ne change alors).
  readonly select = output<Tab>();

  protected readonly items = NAV_ITEMS;

  protected onClick(tab: Tab): void {
    if (tab !== this.active()) {
      this.select.emit(tab);
    }
  }
}
