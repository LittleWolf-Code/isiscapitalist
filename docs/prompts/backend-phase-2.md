# Prompt — Phase 2 : lecture / persistance des mondes, `getWorld`

- Date : 2026-09-19
- Étape roadmap : 2.1, 2.2
- Sous-projet : backend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt (série `backend-00-index.md`)

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22, hors périmètre ici). Réponds en français ;
code et commentaires selon les conventions de `CLAUDE.md`.

Ce prompt est la **phase 2 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x et 1.x cochées dans `docs/ROADMAP.md` (`origworld.ts` existe avec Item 1…6). Sinon,
arrête-toi et signale-le.

### Objectif

Chaque joueur est identifié par une chaîne `user` ; son monde vit dans
`backend/userworlds/<user>-world.json`. Cette phase écrit la lecture/écriture de ce fichier et la
query `getWorld`, première opération réellement fonctionnelle de l'API. Elle correspond aux
étapes 2.1 et 2.2 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/SPEC-backend.md` §4 et §5 — code fourni pour `readUserWorld` / `saveWorld` / resolver
3. `docs/DECISIONS.md` — D1, D2, D3 (`structuredClone`), D8 (`saveWorld`)
4. `backend/src/app.service.ts`, `backend/src/resolver.ts`, `backend/src/origworld.ts`

### Comportement attendu

- `AppService.readUserWorld(user: string): World` — lit et parse
  `path.join(process.cwd(), 'userworlds', user + '-world.json')` ; si le fichier n'existe pas ou
  est illisible, retourne `structuredClone(origworld)`.
- `AppService.saveWorld(user: string, world: World): void` — écrit le JSON du monde au même
  chemin avec **`fs.writeFileSync`** ; en cas d'erreur, `throw new Error("Erreur d'écriture du
  monde coté serveur")`.
- `GraphQlResolver.getWorld(@Args('user') user)` : `readUserWorld` → `saveWorld` → retourne le
  monde. (`updateWorld` sera intercalé en phase 4.)

Exemple : `getWorld(user: "alice")` sans fichier existant → réponse = copie d'`origworld`
(`money: 0`, `products[0].name == "Item 1"`, `products[0].quantite == 1`) et création de
`backend/userworlds/alice-world.json` contenant ce même JSON.

### Cas limites

- Fichier JSON corrompu (parse impossible) → même comportement que « pas de fichier » : clone
  d'`origworld`, et log `console.log((e as Error).message)` comme dans le sujet.
- `user` vide → la validation GraphQL (`String!`) accepte `""` ; ne pas ajouter de contrôle,
  le fichier s'appellera `-world.json` (comportement du sujet).
- Deux appels successifs `getWorld("alice")` renvoient le même monde (le second lit le fichier).

### Contraintes (et pourquoi)

- Retourner `structuredClone(origworld)` et jamais `origworld` lui-même (D3) — sinon la première
  mutation d'un joueur modifierait le monde initial de tous les autres et du reset.
- `fs.writeFileSync` plutôt que le `fs.writeFile` à callback du sujet : deux requêtes successives
  (typiquement un test e2e « getWorld puis acheterQtProduit ») doivent lire un fichier à jour ;
  avec l'écriture asynchrone non attendue, la seconde peut lire l'ancien état. Écrire dans
  `docs/DECISIONS.md` que D8 est tranché ainsi.
- `import * as fs from 'fs'; import * as path from 'path';` et suffixe `.js` sur les imports
  relatifs (ESM, D1). Pas de `__dirname` (D2).
- Ne pas modifier `backend/src/graphql.ts` (généré) ni `schema.graphql`.

### Hors périmètre

- Évolution temporelle (`updateWorld`), mutations : phases 3 et 4.
- Validation ou nettoyage du nom d'utilisateur.

### Étapes

1. Lire les fichiers ci-dessus.
2. Implémenter `readUserWorld` et `saveWorld` dans `AppService`.
3. Implémenter `getWorld` dans le resolver.
4. Vérifier (section suivante) ; mettre à jour D8 dans `DECISIONS.md`.
5. Cocher 2.1 et 2.2 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint` sans erreur.
- [ ] Preview `backend` lancée, puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"{ getWorld(user: \"alice\") { name money products { id name quantite } managers { name unlocked } } }"}'
  ```
  Réponse attendue : `{"data":{"getWorld":{"name":"World","money":0,"products":[{"id":1,"name":"Item 1","quantite":1},…6 produits…],"managers":[…6 managers unlocked:false…]}}}`, pas de champ `errors`.
- [ ] `backend/userworlds/alice-world.json` existe et `node -e "const w=require('./backend/userworlds/alice-world.json');console.log(w.products.length, w.upgrades.length)"` affiche `6 10`.
- [ ] Modifier à la main `money` à `42` dans ce fichier, relancer la requête : la réponse renvoie
  `money: 42` (preuve que la lecture passe par le fichier, pas par `origworld`).
- [ ] `git status` ne montre pas `alice-world.json` (ignoré par `.gitignore`).

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle des commandes de vérification, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Rôle de `user`, où vivent les données |
| 2 | Instructions séquencées | 2 | 5 étapes |
| 3 | Exemples concrets | 2 | Exemple `alice` entrée→sortie + fichier attendu |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | Hors périmètre : updateWorld, validation |
| 6 | Critères mesurables | 2 | curl, node -e, test du `money: 42` |
| 7 | Pourquoi des contraintes | 2 | structuredClone, writeFileSync motivés |
| 8 | Raisonnement guidé | 1 | Feature < 3 fichiers, pas de plan demandé |
| 9 | Format de sortie | 2 | Fichiers, D8, ROADMAP |
| 10 | Concision | 1 | Le cas « user vide » est discutable mais évite une validation non demandée |

Historique : v1 16/20 → v2 18/20 (ajout de la vérification `money: 42` qui prouve la lecture
fichier, et de la motivation de `writeFileSync`).
