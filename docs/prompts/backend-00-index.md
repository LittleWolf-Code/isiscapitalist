# Prompts backend ISIS Capitalist — index

- Date : 2026-09-19
- Source : /feature-to-prompt, demande initiale : « réalise le back-end en remplissant la base de
  donnée seulement par des noms génériques item 1, item 2, … ; backend GraphQL, front Angular »
- Périmètre retenu : **backend seul, phases 0 → 8 de `docs/ROADMAP.md`**, un prompt par phase.
  Le frontend Angular (phase 9) attend son sujet ; seul le schéma GraphQL est partagé avec lui.

## Ordre d'exécution

Chaque fichier est autonome : ouvrir une **nouvelle session Claude Code** dans `isiscapitalist/`,
coller le bloc « Prompt », attendre le rapport, vérifier la coche dans `ROADMAP.md`, passer au suivant.

| Fichier | Phase | Contenu |
|---|---|---|
| `backend-phase-0.md` | 0 | Nettoyage de l'exercice « patients », `userworlds/`, `public/icones/` |
| `backend-phase-1.md` | 1 | Schéma GraphQL, `origworld.ts` générique (Item 1…6), icônes placeholder, `main.ts` |
| `backend-phase-2.md` | 2 | `readUserWorld` / `saveWorld`, query `getWorld` |
| `backend-phase-3.md` | 3 | `acheterQtProduit`, `lancerProductionProduit`, `engagerManager` |
| `backend-phase-4.md` | 4 | Moteur temporel `updateWorld` + tests |
| `backend-phase-5.md` | 5 | Bonus, unlocks produit, allunlocks + tests |
| `backend-phase-6.md` | 6 | `acheterCashUpgrade`, `acheterAngelUpgrade` |
| `backend-phase-7.md` | 7 | `resetWorld`, anges |
| `backend-phase-8.md` | 8 | Lint/build/tests, e2e supertest, README |

## Décisions transverses prises pendant la préparation (à reporter dans `DECISIONS.md` par les prompts)

| Décision | Choix | Phase qui l'écrit |
|---|---|---|
| D5 ObserveModule / AppController | **Conserver tels quels** (choix utilisateur) | 0 |
| D6 `lastupdate` | **`Float!` dans le schéma**, tout en millisecondes | 1 |
| D8 `saveWorld` | **`fs.writeFileSync`** (cohérence lecture-après-écriture entre deux requêtes) | 2 |
| D10 Moteur métier | Fonctions pures dans `src/world-engine.ts` (`buyCost` dès la phase 3, `now` injecté en phase 4) ; `AppService` gère la persistance | 3 |
| D11 Icônes | PNG unis générés par `scripts/make-icons.mjs` (zlib natif, aucune dépendance) | 1 |
| D12 `lancerProductionProduit` | `quantite == 0` → erreur ; production déjà en cours → no-op | 3 |
| D13 Managers | `ratio: 1, typeratio: gain` sans effet : `engagerManager` n'applique aucun bonus | 1 |
| Noms | **100 % génériques** : World, Item N, Manager N, Unlock N.k, All Unlock N, Upgrade N, Angel Upgrade N | 1 |

## Comparaison aux standards (étape 2 du skill)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Anges au reset | AdVenture Capitalist : `150·√(gains/1e15) − anges déjà obtenus` | Identique (`GAME-RULES` §Reset) | reprendre |
| Coût achat ×q | Série géométrique finie `c·(g^q − 1)/(g − 1)` | Identique | reprendre |
| Progression hors-ligne | n productions complètes calculées au retour du joueur | Identique (`updateWorld` avec manager) | reprendre |
| Erreurs GraphQL | Communauté NestJS : « errors as data » / ExceptionFilter | Diverge : le sujet impose `throw new Error('…')` | ignorer (sujet prime) |
| Tests dépendant du temps | vitest `vi.useFakeTimers` / `vi.setSystemTime` | `updateWorld(world, now)` avec `now` injecté → pas de mock | D10 |
| Logique métier | Resolvers fins, logique dans le service | Identique (sujet + ARCHITECTURE) | reprendre |
| Persistance | Écriture terminée avant la réponse | Sujet : `fs.writeFile` callback → lecture stale possible | D8 |

Sources : [wiki Angel Investors](https://adventure-capitalist.fandom.com/wiki/Angel_Investors),
[wiki Businesses](https://adventure-capitalist.fandom.com/wiki/Businesses),
[vitest — Mocking dates](https://vitest.dev/guide/mocking/dates).

## Notation — voir le bas de chaque fichier

Historique global (moyenne des 9 prompts) : v1 15,6/20 → v2 18,0/20 (un tour d'amélioration ; tous ≥ 17, arrêt conforme au skill).
