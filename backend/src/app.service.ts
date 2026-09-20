import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Palier, Product, World } from './graphql.js';
import { origworld } from './origworld.js';
import { updateWorld } from './world-engine.js';

@Injectable()
export class AppService {
  // Chemin du fichier JSON d'un utilisateur : backend/userworlds/<user>-world.json
  // (process.cwd() et non __dirname : le backend est en ESM, voir docs/DECISIONS.md D2).
  private worldPath(user: string): string {
    return path.join(process.cwd(), 'userworlds', user + '-world.json');
  }

  // Lit le monde d'un utilisateur. Fichier absent, illisible ou JSON corrompu :
  // on repart d'une copie profonde d'origworld (jamais origworld lui-même, D3).
  readUserWorld(user: string): World {
    try {
      const data = fs.readFileSync(this.worldPath(user));
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      console.log((e as Error).message);
      return structuredClone(origworld);
    }
  }

  // Écriture synchrone (D8) : une requête suivante doit relire un fichier à jour.
  saveWorld(user: string, world: World): void {
    try {
      fs.writeFileSync(this.worldPath(user), JSON.stringify(world));
    } catch (err) {
      console.error(err);
      throw new Error("Erreur d'écriture du monde coté serveur");
    }
  }

  // Évolution temporelle depuis world.lastupdate (phase 4) : délègue à la fonction pure de
  // world-engine.ts avec l'horloge réelle. À appeler juste après readUserWorld, avant toute action.
  updateWorld(world: World): World {
    return updateWorld(world);
  }

  // Aides communes aux mutations. Messages d'erreur exacts : le frontend les affiche tels quels
  // et les tests e2e (phase 8) les comparent.
  findProduct(world: World, id: number): Product {
    const product = world.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }
    return product;
  }

  findManager(world: World, name: string): Palier {
    const manager = world.managers.find((m) => m.name === name);
    if (!manager) {
      throw new Error(`Le manager ${name} n'existe pas`);
    }
    return manager;
  }

  // Manager possédé pour ce produit : palier de world.managers ciblant le produit et acheté.
  // Distinct de product.managerUnlocked (automatisation active), qui peut être en pause (D20).
  hasManager(world: World, product: Product): boolean {
    return world.managers.some((m) => m.idcible === product.id && m.unlocked);
  }
}
