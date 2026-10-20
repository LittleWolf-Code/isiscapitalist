// Barre d'onglets du bas de la disposition « onglets » (D22, rétablie en option par D37) :
// Produits, Managers, Upgrades, Anges, Unlocks, Paramètres. Purement présentationnelle : l'écran
// de l'onglet actif est projeté (ng-content) dans le mat-tab-nav-panel au-dessus de la barre ;
// elle n'émet que l'onglet cliqué, App décide.
import { Component, input, output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';

export type Tab = 'products' | 'managers' | 'upgrades' | 'angels' | 'unlocks' | 'settings';
export const TABS: readonly Tab[] = ['products', 'managers', 'upgrades', 'angels', 'unlocks', 'settings'];

// Onglet mémorisé (préférence d'affichage, comme en phase 9) : absent, inconnu ou localStorage
// indisponible → Produits.
export const TAB_STORAGE_KEY = 'isiscapitalist.tab';
export const DEFAULT_TAB: Tab = 'products';

export function readStoredTab(): Tab {
  try {
    const value = localStorage.getItem(TAB_STORAGE_KEY);
    return (TABS as readonly string[]).includes(value ?? '') ? (value as Tab) : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

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
  // Pastille de chaque onglet (éléments achetables, F-21 / F-27 / F-31), masquée à 0 ou absente.
  readonly badges = input<Partial<Record<Tab, number>>>({});

  // Émis avec l'onglet cliqué, sauf s'il est déjà actif (rien ne change alors).
  readonly select = output<Tab>();

  protected readonly items = NAV_ITEMS;

  protected badge(tab: Tab): number {
    return this.badges()[tab] ?? 0;
  }

  protected onClick(tab: Tab): void {
    if (tab !== this.active()) {
      this.select.emit(tab);
    }
  }
}
