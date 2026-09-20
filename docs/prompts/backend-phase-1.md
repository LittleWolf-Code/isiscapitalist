# Prompt — Phase 1 : schéma GraphQL et monde initial générique

- Date : 2026-09-19
- Étape roadmap : 1.1, 1.2, 1.3, 1.4
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

Ce prompt est la **phase 1 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.1–0.3 cochées dans `docs/ROADMAP.md`. Si ce n'est pas le cas, arrête-toi et signale-le.

### Objectif

Mettre en place le contrat GraphQL fourni par le sujet et le monde initial `origworld.ts`.
Le monde est rempli **uniquement avec des noms génériques** (Item 1…6, Manager 1…6, …) : ce
sont des données de démonstration, le thème viendra plus tard. Les images sont des PNG unis
générés localement. Cette phase correspond aux étapes 1.1 à 1.4 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/SPEC-backend.md` §2 et §3 — ce que le sujet impose (schema-first, contenu du monde, `main.ts`)
3. `docs/reference/schema.graphql` (à copier) et `docs/reference/origworld.skeleton.ts` (structure à reprendre)
4. `docs/DECISIONS.md` — D1, D2 (`process.cwd()`), D6 (`lastupdate`)
5. `backend/src/app.module.ts`, `backend/src/main.ts`, `backend/src/resolver.ts`

### Comportement attendu

**1.1 Schéma.** Copier `docs/reference/schema.graphql` → `backend/src/schema.graphql`, avec une
seule modification : `lastupdate: Int!` → `lastupdate: Float!` (D6 tranché, voir Contraintes).
Le `ping` temporaire de la phase 0 disparaît (schéma et resolver). Nest exige au moins un
resolver pour `Query` : laisser provisoirement
`@Query() getWorld(@Args('user') user: string) { return null; }` (le schéma déclare
`getWorld: World` nullable) — la phase 2 l'implémente.

**1.2 Génération.** `npm run start:dev` régénère `backend/src/graphql.ts` avec `RatioType`,
`Palier`, `Product`, `World`, `IQuery`, `IMutation` (`outputAs: 'class'`, déjà configuré).

**1.3 `backend/src/origworld.ts`.** `export const origworld: World = { … }` (typé par
`./graphql.js`), avec exactement ces données :

| id | name | logo | cout | croissance | revenu | vitesse (ms) | quantite |
|---|---|---|---|---|---|---|---|
| 1 | Item 1 | icones/item1.png | 4 | 1.07 | 1 | 500 | 1 |
| 2 | Item 2 | icones/item2.png | 60 | 1.15 | 60 | 3000 | 0 |
| 3 | Item 3 | icones/item3.png | 720 | 1.14 | 540 | 6000 | 0 |
| 4 | Item 4 | icones/item4.png | 8640 | 1.13 | 4320 | 12000 | 0 |
| 5 | Item 5 | icones/item5.png | 103680 | 1.12 | 51840 | 48000 | 0 |
| 6 | Item 6 | icones/item6.png | 1244160 | 1.11 | 622080 | 120000 | 0 |

Tous : `timeleft: 0`, `managerUnlocked: false`. Monde : `name: 'World'`, `logo: 'icones/world.png'`,
`money: 0`, `score: 0`, `totalangels: 0`, `activeangels: 0`, `angelbonus: 2`, `lastupdate: 0`.

- `paliers` de l'Item N (3 par produit, `idcible: N`, `logo: 'icones/itemN.png'`, `unlocked: false`) :
  `Unlock N.1` seuil 25, ratio 2, `vitesse` · `Unlock N.2` seuil 50, ratio 2, `gain` ·
  `Unlock N.3` seuil 100, ratio 2, `vitesse`.
- `allunlocks` (`idcible: 0`, logo `icones/all.png`) : `All Unlock 1` seuil 25, ratio 2, `gain` ·
  `All Unlock 2` seuil 50, ratio 3, `gain` · `All Unlock 3` seuil 100, ratio 2, `vitesse`.
- `upgrades` (10) : `Upgrade 1`…`Upgrade 6` → `idcible` 1…6, ratio 3, `gain`, logo de l'item,
  seuils 1000, 15000, 180000, 2160000, 26000000, 310000000 ; `Upgrade 7`…`Upgrade 10` →
  `idcible: 0`, ratio 2, `gain`, logo `icones/all.png`, seuils 1e6, 1e8, 1e10, 1e12.
- `angelupgrades` (logo `icones/angel.png`) : `Angel Upgrade 1` seuil 10, `idcible: -1`, ratio 1,
  `ange` · `Angel Upgrade 2` seuil 100, `idcible: 0`, ratio 2, `gain` · `Angel Upgrade 3`
  seuil 1000, `idcible: -1`, ratio 2, `ange`.
- `managers` (6) : `Manager N`, logo `icones/managerN.png`, `idcible: N`, `ratio: 1`,
  `typeratio: gain`, seuils 1000, 15000, 100000, 500000, 1200000, 10000000.

Le `seuil` est une **quantité** pour les paliers/allunlocks et un **prix** (argent ou anges)
pour managers/upgrades/angelupgrades.

**1.4 Icônes et `main.ts`.** Écrire `backend/scripts/make-icons.mjs` (Node ≥ 22, sans
dépendance : `node:zlib` fournit `deflateSync` et `crc32`) qui génère 15 PNG 64×64 unis, chacun
d'une couleur différente, dans `backend/public/icones/` : `world`, `all`, `angel`, `item1`…`item6`,
`manager1`…`manager6`. Ajouter le script npm `"icons": "node scripts/make-icons.mjs"`.
`main.ts` : `NestFactory.create<NestExpressApplication>(AppModule, { instrument: ObserveInstrument })`,
`app.useStaticAssets(join(process.cwd(), 'public'))`, `app.enableCors()` (déjà là), port 3000.

### Cas limites

- `Float` GraphQL sérialise `1e12` sans problème ; `Int` ne va que jusqu'à 2^31−1 → c'est la
  raison de D6 et des seuils `Float!` dans le schéma.
- `origworld` ne doit jamais être muté : aucune fonction de cette phase ne doit le retourner
  directement (phase 2 utilisera `structuredClone`).

### Contraintes (et pourquoi)

- Le schéma vient du sujet : **une seule différence** autorisée (`lastupdate: Float!`), parce que
  `Date.now()` (~1.79e12) dépasse `Int32` et Apollo refuserait de sérialiser le champ. Ajouter
  dans `docs/DECISIONS.md` : D6 tranché (option 2), en précisant que la copie
  `frontend/src/app/graphql/schema.graphql` devra recevoir la même modification en phase 9.
- Ne pas modifier `backend/src/graphql.ts` (généré au démarrage).
- Imports relatifs avec suffixe `.js` (ESM, D1) ; `RatioType` importé depuis `./graphql.js`.
- Noms **exactement** comme dans les tableaux ci-dessus (espace, point) : les phases suivantes et
  les exemples de `ROADMAP.md` les réutilisent dans des requêtes.
- Ajouter D11 (icônes générées par script, aucune dépendance) et D13 (managers : `ratio: 1`,
  `typeratio: gain` purement décoratifs, `engagerManager` n'applique aucun bonus) dans `DECISIONS.md`.

### Hors périmètre

- Lecture/sauvegarde des mondes, `getWorld` fonctionnel : phase 2.
- Le frontend, y compris sa copie du schéma.
- Choisir un thème ou de « vrais » noms : volontairement générique.

### Étapes

1. Lire les fichiers ci-dessus ; écrire un plan en 5 lignes (schéma → start:dev → origworld →
   icônes → main.ts) et le montrer avant de coder.
2. 1.1 schéma + resolver minimal ; 1.2 lancer la preview `backend` et vérifier `graphql.ts`.
3. 1.3 `origworld.ts` ; `npm run build` doit typer le monde sans erreur.
4. 1.4 script d'icônes, `npm run icons`, `main.ts`.
5. Vérifier (section suivante) ; mettre à jour `DECISIONS.md` (D6, D11, D13).
6. Cocher 1.1 à 1.4 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint` sans erreur.
- [ ] `backend/src/graphql.ts` contient `export class World` avec `lastupdate: number` et
  `export enum RatioType`.
- [ ] `ls backend/public/icones` liste 15 fichiers `.png` ; `curl -sI http://localhost:3000/icones/item1.png`
  renvoie `200` et `Content-Type: image/png`.
- [ ] Introspection :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"{ __type(name:\"World\"){ fields { name type { name ofType { name } } } } }"}'
  ```
  contient `lastupdate` de type `Float` (NON_NULL → `ofType.name == "Float"`).
- [ ] `origworld.products.length === 6`, chaque produit a 3 paliers, `allunlocks.length === 3`,
  `upgrades.length === 10`, `angelupgrades.length === 3`, `managers.length === 6` — vérifiable
  après build, depuis `backend/` (ESM, donc `import()`) :
  ```bash
  node -e "import('./dist/origworld.js').then(m => { const w = m.origworld; console.log(w.products.length, w.products.map(p => p.paliers.length).join(','), w.allunlocks.length, w.upgrades.length, w.angelupgrades.length, w.managers.length); })"
  ```
  Sortie attendue : `6 3,3,3,3,3,3 3 10 3 6`.

### Rapport attendu

En fin de tâche : fichiers créés/modifiés, sortie réelle des commandes de vérification, ce qui
reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi générique, ce que ça produit |
| 2 | Instructions séquencées | 2 | 6 étapes, sous-étapes 1.1–1.4 |
| 3 | Exemples concrets | 2 | Tableaux de données exacts (lèvent toute ambiguïté de valeurs) |
| 4 | Structure lisible | 2 | Données en tableaux séparés |
| 5 | Rôle et périmètre | 2 | Hors périmètre : front, thème, phase 2 |
| 6 | Critères mesurables | 2 | build, curl 200 image/png, introspection Float, comptages |
| 7 | Pourquoi des contraintes | 2 | Int32, noms réutilisés, origworld non muté |
| 8 | Raisonnement guidé | 2 | Plan en 5 lignes demandé |
| 9 | Format de sortie | 1 | Livrables nommés, mais la palette du script d'icônes reste au choix (voulu) |
| 10 | Concision | 1 | Le plus long de la série ; les tableaux sont incompressibles |

Historique : v1 15/20 → v2 18/20 (v1 disait « équilibrer les coûts » sans valeurs : deux
implémentations auraient divergé ; ajout des tableaux, du `getWorld` provisoire et de
l'introspection `Float`).
