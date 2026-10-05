// Pipe `second` du sujet (F-09) : temps restant en ms → « heures:minutes:secondes.dixièmes »
// (formatDuration de game-math.ts).
import { Pipe, PipeTransform } from '@angular/core';
import { formatDuration } from './game-math';

@Pipe({ name: 'second' })
export class SecondPipe implements PipeTransform {
  transform(ms: number): string {
    return formatDuration(ms);
  }
}
