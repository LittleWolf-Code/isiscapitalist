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
- Le backend est **autoritaire** sur l'état du jeu : le client déclenche des actions, le serveur
  recalcule l'évolution temporelle (`updateWorld`) à chaque appel à partir de `lastupdate`.

## Backend — flux d'une opération

```
Resolver.<op>(user, …)
  │
  ├─ world = service.readUserWorld(user)      // fichier ou clone d'origworld
  ├─ service.updateWorld(world)               // gains depuis lastupdate, lastupdate = now
  ├─ … action propre à l'opération …          // achat, lancement, manager, upgrade, reset
  ├─ service.checkUnlocks(world, product) …   // si pertinent
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
| `src/app.service.ts` | Persistance + toute la logique métier (`updateWorld`, unlocks, bonus, coûts, reset) |
| `src/main.ts` | Bootstrap : static `public/`, CORS, port 3000 |
| `public/icones/` | Images référencées par les champs `logo` |
| `userworlds/` | Données joueurs (ignoré par git) |

Le sujet demande explicitement de garder la logique commune dans le service et le code spécifique
dans le resolver. Si `app.service.ts` devient trop gros, on pourra extraire `world-engine.ts`
(fonctions pures : `updateWorld`, `applyBonus`, `checkUnlocks`, `buyCost`) facilement testables
avec vitest — à noter dans `DECISIONS.md` le moment venu.

## Frontend (front générique de test, en attendant `frontend.pdf`)

- `src/app/graphql/schema.graphql` = copie du schéma backend ; `queries.graphql` / `mutations.graphql`
  → `npm run codegen` → `types.ts`, `operations.ts`.
- `GameService` (seul point de contact Apollo) : `getWorld` en `no-cache` + poll 2 s, refetch après chaque
  mutation ; le monde reçu remplace l'état local en entier (D14). Un timer 100 ms n'anime que `timeleft` (D15).
- `ProductCard` / `PalierList` sont présentationnels (input/output) ; `App` assemble la page unique.
- Détail des fichiers : `frontend/CLAUDE.md`.

## Outils Claude Code

- `.claude/launch.json` : configurations `backend` (port 3000) et `frontend` (port 4200) pour la preview.
- `.claude/settings.json` : permissions pré-accordées (npm build/lint/test, lecture de fichiers).
- `.claude/skills/next-step` : implémenter la prochaine étape non cochée de `ROADMAP.md`.
- `.claude/skills/verify-backend` : build + lint + test + smoke test GraphQL.
