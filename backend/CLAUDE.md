# backend/ — NestJS 12, GraphQL schema-first

Voir `../CLAUDE.md` pour le contexte global et `../docs/` pour la spec.

## Stack

- NestJS 12 (`@nestjs/core`, `@nestjs/graphql` 14, `@nestjs/apollo` 14, `@apollo/server` 5), TypeScript 6, **ESM**.
- Tests : vitest (`npm test`, `npm run test:e2e`). Lint : oxlint. Format : prettier (single quotes).
- Pas de base de données : les mondes sont des fichiers `userworlds/{user}-world.json`.

## Fichiers clés (cible)

```
backend/
├── public/icones/         # images servies statiquement (http://localhost:3000/icones/x.jpg)
├── userworlds/            # un fichier JSON par utilisateur (créé à la volée) — ignoré par git
└── src/
    ├── schema.graphql     # schéma FOURNI (docs/reference/schema.graphql) — deux écarts documentés : D6, D20
    ├── graphql.ts         # GÉNÉRÉ au démarrage (World, Product, Palier, RatioType) — ne pas éditer
    ├── origworld.ts       # monde initial (6 produits, 6 managers, unlocks, upgrades, angelupgrades)
    ├── app.module.ts      # GraphQLModule.forRoot + providers [AppService, GraphQlResolver]
    ├── app.service.ts     # logique métier commune : readUserWorld, saveWorld, updateWorld, unlocks…
    ├── resolver.ts        # @Resolver('World') : getWorld + les 6 mutations du sujet + basculerManager (D20)
    └── main.ts            # NestExpressApplication, useStaticAssets(public), enableCors, port 3000
```

Les fichiers de l'exercice précédent (`patients.json`, types `Patient`/`Symptome`, `getPatients`)
doivent disparaître.

## Conventions

- Imports relatifs **avec suffixe `.js`** : `import { AppService } from './app.service.js';`
- `import * as fs from 'fs'; import * as path from 'path';` (pas `path/win32`).
- Chemins de fichiers via `path.join(process.cwd(), ...)` (pas de `__dirname` en ESM).
- Resolvers : `@Query()` / `@Mutation()` sans argument, le nom de la méthode = le nom dans le schéma.
  Chaque argument via `@Args('nom')`.
- Erreurs métier : `throw new Error(\`Le produit avec l'id ${id} n'existe pas\`)` (message en français).
- Timestamps `lastupdate` en **millisecondes** (`Date.now()`), cohérent avec `vitesse`/`timeleft` en ms.
- Toute méthode de resolver : `readUserWorld` → `updateWorld` (évolution temporelle) → action → `saveWorld`.
- Ne pas muter `origworld` (utiliser `structuredClone(origworld)`).
- Les nombres GraphQL `Float` peuvent devenir très grands : rester en `number`, pas de `BigInt`.

## Vérification d'une étape

1. `npm run build` passe sans erreur.
2. `npm run start:dev` démarre, `src/graphql.ts` est régénéré, http://localhost:3000/graphql répond.
3. Tester la query/mutation dans le playground (ou via `curl -X POST http://localhost:3000/graphql`).
4. Vérifier le fichier `userworlds/{user}-world.json` produit.
5. Cocher l'étape dans `../docs/ROADMAP.md`.
