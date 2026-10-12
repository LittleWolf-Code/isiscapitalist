// Contenu de la fenêtre « Investors » (F-29, fig. 11 du sujet) : anges actifs et accumulés, bonus
// par ange, et le nombre d'anges supplémentaires que rapporterait un reset, sur le bouton qui le
// déclenche. Purement présentationnel : le confirm() et la mutation sont faits par App /
// GameService. Les angel upgrades ont leur propre fenêtre.
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BigvaluePipe } from './bigvalue.pipe';
import { angelFormulaLabel } from './game-math';

@Component({
  selector: 'app-angels-panel',
  standalone: true,
  imports: [MatButtonModule, BigvaluePipe],
  templateUrl: './angels-panel.html',
  styleUrl: './angels-panel.css',
})
export class AngelsPanel {
  readonly score = input.required<number>();
  readonly totalangels = input.required<number>();
  readonly activeangels = input.required<number>();
  readonly angelbonus = input.required<number>();
  // Diviseur de la formule des anges du compte (D43) : la formule est affichée, pour qu'une
  // démonstration montre clairement laquelle s'applique.
  readonly angeldivisor = input.required<number>();
  protected readonly formula = computed(() => angelFormulaLabel(this.angeldivisor()));
  // Anges supplémentaires gagnés par la partie en cours (angelsEarned, RG-09), calculé par App.
  readonly angelsEarned = input.required<number>();

  // Clic sur le bouton de reset : App confirme puis appelle game.reset(). Jamais désactivé
  // (un reset à 0 ange est permis, comme dans le jeu original).
  readonly resetRequested = output<void>();
}
