# Architecture

## Vue d'ensemble

```
┌──────────────────────┐    GraphQL (HTTP POST /graphql)    ┌────────────────────────────┐
│ frontend/ (Angular)  │ ─────────────────────────────────▶ │ backend/ (NestJS + Apollo) │
│ apollo-orbit, codegen│ ◀───────────────────────────────── │ resolver → service         │
│ localhost:4200       │        images GET /icones/*.jpg    │ localhost:3000             │
└──────────────────────┘                                    └───────────┬────────────────┘
                                                                        │ fs
                                                                        ▼
                                                        backend/userworlds/{user}-world.json
```

- Pas d'authentification : l'utilisateur est identifié par la chaîne `user` passée à chaque opération.
- Pas de base de données : un fichier JSON par utilisateur, écrasé à chaque opération.
- Le serveur **fait foi** : à chaque opération il recalcule l'évolution temporelle (`updateWorld`)
  depuis `lastupdate` et sauvegarde. Le client est **autonome** entre deux chargements (sujet
  frontend, D36) : il fait le même calcul toutes les 100 ms et applique ses actions localement
  avant de les transmettre ; il se recale sur le serveur au chargement, sur Refresh, après un reset
  et après un refus.

## Backend — flux d'une opération

```
Resolver.<op>(user, …)
  │
  ├─ world = service.readUserWorld(user)      // fichier ou clone d'origworld
  ├─ service.updateWorld(world)               // gains depuis lastupdate, lastupdate = now
  ├─ … action propre à l'opération …          // achat, lancement, manager, upgrade, reset
  ├─ checkProductUnlocks / checkAllUnlocks    // world-engine.ts, après un achat
  ├─ service.saveWorld(user, world)
  └─ return (Product | Palier | World)
```

Responsabilités :

| Fichier | Rôle |
|---|---|
| `src/schema.graphql` | Contrat GraphQL (fourni) |
| `src/graphql.ts` | Types TS générés (`World`, `Product`, `Palier`, `RatioType`) |
| `src/origworld.ts` | État initial du jeu (données) |
| `src/resolver.ts` | 1 query + 6 mutations, orchestration uniquement |
| `src/app.service.ts` | Persistance (`readUserWorld`, `saveWorld`, nom de fichier encodé) et recherches communes |
| `src/world-engine.ts` | Règles du jeu en fonctions pures (`advanceProduction`, `updateWorld`, `applyBonus`, unlocks, `buyUpgrade`, anges, `resetWorld`), D10 |
| `src/main.ts` | Bootstrap : static `public/`, CORS, port 3000 |
| `public/icones/` | Images référencées par les champs `logo` |
| `userworlds/` | Données joueurs (ignoré par git) |

Le sujet demande de garder la logique commune dans le service et le code spécifique dans le
resolver ; les règles sont en fonctions pures dans `world-engine.ts` (D10), testées sans Nest.

## Frontend (sujet `frontendangularsignal.pdf`)

- `src/app/graphql/schema.graphql` = copie du schéma backend ; `queries.graphql` / `mutations.graphql`
  → `npm run codegen` → `types.ts`, `operations.ts`. Adresse du serveur : `src/app/server.ts` seul.
- `GameService` (seul point de contact Apollo) : `world` = `linkedSignal` de `getWorld` ; boucle
  `calcScore` 100 ms + `productionDone` ; actions appliquées par les fonctions immuables de
  `game-math.ts` (copie des règles du serveur) puis mutation ; message éphémère `snackmessage`.
- `App` : en-tête, bandeau gauche de boutons badgés, produits, fenêtres `Modal` ; les autres
  composants sont présentationnels (input / output). Détail des fichiers : `frontend/CLAUDE.md`.

## Outils Claude Code

- `.claude/launch.json` : configurations `backend` (port 3000) et `frontend` (port 4200) pour la preview.
- `.claude/settings.json` : permissions pré-accordées (npm build/lint/test, lecture de fichiers).
- `.claude/skills/next-step` : implémenter la prochaine étape non cochée de `ROADMAP.md`.
- `.claude/skills/verify-backend` : build + lint + test + smoke test GraphQL.
