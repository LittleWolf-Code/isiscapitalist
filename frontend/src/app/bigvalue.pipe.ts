// Pipe `bigvalue` du sujet (F-09) : grand nombre → HTML en puissance de dix, à lier par
// [innerHTML] (« 1.235 × 10<sup>6</sup> »). La mise en forme est dans game-math.ts (bigValue),
// testée sans Angular.
import { Pipe, PipeTransform } from '@angular/core';
import { bigValue } from './game-math';

@Pipe({ name: 'bigvalue' })
export class BigvaluePipe implements PipeTransform {
  transform(valeur: number): string {
    return bigValue(valeur);
  }
}
