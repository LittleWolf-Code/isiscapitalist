// Données et doublures partagées par les specs (aucun import de vitest : le fichier est aussi
// compilé avec l'application, où il n'est jamais importé). Monde réduit calqué sur
// backend/src/origworld.ts : deux produits, leurs paliers, un allunlock, des upgrades, des angel
// upgrades et deux managers.
import { signal } from '@angular/core';
import { DocumentNode } from 'graphql';
import { PalierData, WorldData } from './game-math';
import { RatioType } from './graphql';

export function palier(
  name: string,
  seuil: number,
  idcible: number,
  ratio: number,
  typeratio: RatioType,
  logo = '',
): PalierData {
  return { name, logo, seuil, idcible, ratio, typeratio, unlocked: false };
}

export function makeWorld(): WorldData {
  return {
    name: 'World',
    logo: 'icones/world.png',
    money: 0,
    score: 0,
    totalangels: 0,
    activeangels: 0,
    angelbonus: 2,
    lastupdate: 0,
    products: [
      {
        id: 1,
        name: 'Item 1',
        logo: 'icones/item1.png',
        cout: 4,
        croissance: 1.07,
        revenu: 1,
        vitesse: 500,
        quantite: 1,
        timeleft: 0,
        managerUnlocked: false,
        paliers: [
          palier('Unlock 1.1', 25, 1, 2, RatioType.Vitesse, 'icones/item1.png'),
          palier('Unlock 1.2', 50, 1, 2, RatioType.Gain, 'icones/item1.png'),
        ],
      },
      {
        id: 2,
        name: 'Item 2',
        logo: 'icones/item2.png',
        cout: 60,
        croissance: 1.15,
        revenu: 60,
        vitesse: 3000,
        quantite: 0,
        timeleft: 0,
        managerUnlocked: false,
        paliers: [palier('Unlock 2.1', 25, 2, 2, RatioType.Vitesse, 'icones/item2.png')],
      },
    ],
    allunlocks: [palier('All 1', 25, 0, 2, RatioType.Gain, 'icones/all.png')],
    upgrades: [
      palier('Upgrade 1', 1000, 1, 3, RatioType.Gain, 'icones/item1.png'),
      palier('Upgrade 7', 1e6, 0, 2, RatioType.Gain, 'icones/all.png'),
    ],
    angelupgrades: [
      palier('Angel Upgrade 1', 10, -1, 1, RatioType.Ange, 'icones/angel.png'),
      palier('Angel Upgrade 2', 100, 0, 2, RatioType.Gain, 'icones/angel.png'),
    ],
    managers: [
      palier('Manager 1', 1000, 1, 1, RatioType.Gain, 'icones/manager1.png'),
      palier('Manager 2', 15000, 2, 1, RatioType.Gain, 'icones/manager2.png'),
    ],
  };
}

// Mutation enregistrée par le stub : nom de l'opération GraphQL et variables envoyées.
export interface SentMutation {
  readonly operation: string;
  readonly variables: Record<string, unknown>;
}

// Doublure d'Apollo : `signal.query` rend des signaux pilotables (data / error) et compte les
// refetch ; `signal.mutation` enregistre chaque appel et peut échouer sur demande (`failNext`).
export function stubApollo(world?: WorldData) {
  const data = signal<{ getWorld: WorldData } | undefined>(world ? { getWorld: world } : undefined);
  const error = signal<unknown>(undefined);
  const sent: SentMutation[] = [];
  let refetches = 0;
  let failure: unknown = null;
  return {
    data,
    error,
    sent,
    refetches: () => refetches,
    failNext(reason: unknown): void {
      failure = reason;
    },
    apollo: {
      signal: {
        query: () => ({
          data,
          error,
          refetch: () => {
            refetches++;
            return Promise.resolve();
          },
        }),
        mutation: (document: DocumentNode) => ({
          mutate: (options: { variables: Record<string, unknown> }) => {
            const definition = document.definitions[0] as { name?: { value: string } };
            sent.push({ operation: definition.name?.value ?? '?', variables: options.variables });
            if (failure !== null) {
              const reason = failure;
              failure = null;
              return Promise.reject(reason);
            }
            return Promise.resolve({ data: {} });
          },
        }),
      },
    },
  };
}
