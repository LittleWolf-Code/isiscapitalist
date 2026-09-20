// Rejoue l'échantillon officiel du sujet contre updateWorld (phase 4.3). Le snippet original
// appelle une fonction `calcQtProductionforElapseTime(product, elapseTime)` qui retourne le nombre
// de productions ; ici on isole Item 1 (quantite 1, revenu 1, pas d'ange → gain 1 par production)
// et on lit ce nombre dans `money`.
import { describe, expect, it } from 'vitest';
import { origworld } from '../src/origworld.js';
import { updateWorld } from '../src/world-engine.js';
import { productionSamples } from './production-samples.js';

describe('updateWorld — échantillon officiel (snippet 2522185)', () => {
  productionSamples.forEach((t, i) => {
    it(`cas ${i + 1} : ${JSON.stringify(t.p)}, elapsed ${t.elapseTime} → qt ${t.qt}, timeleft ${t.timeleft}`, () => {
      const world = structuredClone(origworld);
      world.products = [world.products[0]];
      Object.assign(world.products[0], { quantite: 1, revenu: 1 }, t.p);
      world.lastupdate = 10_000;
      updateWorld(world, 10_000 + t.elapseTime);
      expect(world.money).toBe(t.qt);
      expect(world.products[0].timeleft).toBe(t.timeleft);
    });
  });
});
