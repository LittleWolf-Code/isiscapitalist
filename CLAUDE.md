# ISIS Capitalist — guide projet pour Claude Code

Jeu type *AdVenture Capitalist* (idle/clicker) réalisé dans le cadre d'un TP ISIS.
Monorepo avec deux applications indépendantes :

- `backend/`  — API GraphQL **NestJS 12** (schema-first, Apollo), stockage des mondes en fichiers JSON.
- `frontend/` — **Angular 22** (standalone, signals) + `@apollo-orbit/angular` + graphql-codegen.

Les sujets officiels sont `backend.pdf` et `frontendangularsignal.pdf` (hors dépôt, sur le
Bureau) ; leurs exigences numérotées sont dans `docs/CAHIER-DES-CHARGES.md`, qui **prime** sur
toute décision antérieure (D36). **Toujours lire `docs/` avant de coder** :

| Fichier | Contenu |
|---|---|
| `docs/CAHIER-DES-CHARGES.md` | Exigences numérotées tirées des deux sujets (`backend.pdf` + `frontendangularsignal.pdf`) |
| `docs/RECETTE.md` | Dernière recette de l'application contre le cahier des charges (05/10/2026, après la phase 10) |
| `docs/SPEC-backend.md` | Sujet du TP backend (schéma GraphQL, étapes, contraintes) |
| `docs/GAME-RULES.md` | Règles métier du jeu (production, unlocks, upgrades, anges, reset, formules) |
| `docs/ARCHITECTURE.md` | Organisation des fichiers, flux de données, stockage |
| `docs/ROADMAP.md` | Plan de travail par étapes avec cases à cocher — **la source de vérité de l'avancement** |
| `docs/DECISIONS.md` | Décisions techniques prises (et pourquoi) |
| `docs/THEME.md` | Thème « Nuka Capitalist » : casting des mascottes, lexique Fallout, cases restantes |
| `docs/reference/` | Schéma GraphQL fourni + squelette `origworld` (à copier, pas à inventer) |

Chaque sous-projet a son propre `CLAUDE.md` avec les conventions spécifiques (`backend/CLAUDE.md`, `frontend/CLAUDE.md`).

## État actuel (05/10/2026)

- **Phases 0 à 10 de `docs/ROADMAP.md` cochées.** La phase 10 a mis l'application en conformité
  avec le cahier des charges (D36) ; la dernière recette est `docs/RECETTE.md`.
- **Backend** : schéma du sujet (seul écart `lastupdate: Float!`, D6), 6 mutations, moteur en
  fonctions pures (`world-engine.ts`, D10), anges `150 × √(score / 10¹⁵)`, pseudo encodé avant de
  devenir un nom de fichier, monde « Nuka Capitalist » (`docs/THEME.md`), simulation
  d'équilibrage `backend/scripts/simulate-balance.mjs`.
- **Frontend** : client autonome du sujet (boucle `calcScore` 100 ms, actions appliquées
  localement puis transmises, rechargement sur refus), mise en page du sujet (en-tête, bandeau
  gauche badgé, fenêtres superposées, carte produit à image cliquable), snack-bar, pseudo en
  formulaire signal, pipes `bigvalue` / `second` ; thème « écran cathodique » (D22 / D34) et
  icônes Pip-Boy (D35) conservés. Détail : `frontend/CLAUDE.md`.
- Les décisions D14, D15, D19, D20, D23 à D31 décrivent la phase 9 et sont **remplacées** (D36) ;
  les relire seulement pour l'historique.
- `node_modules/` **par sous-projet** (`backend/`, `frontend/`), pas de `package.json` racine (D16).
- Prérequis : Node ≥ 22.22.3 (exigé par le CLI Angular 22).

## Commandes

```bash
# backend (port 3000, playground GraphQL sur http://localhost:3000/graphql)
cd backend && npm run start:dev
cd backend && npm run build && npm run lint && npm test

# frontend (port 4200)
cd frontend && npm start
cd frontend && npm run codegen   # régénère types.ts / operations.ts depuis src/app/graphql/*.graphql
```

Pour lancer les serveurs dans Claude Code, utiliser les configurations `backend` / `frontend` de
`.claude/launch.json` (preview), jamais Bash.

## Règles de travail

1. **Schema-first** : `backend/src/schema.graphql` est la référence, fournie par le sujet
   (`docs/reference/schema.graphql`). Ne pas modifier le schéma sans le noter dans `docs/DECISIONS.md`.
   `backend/src/graphql.ts` est **généré** au démarrage — ne jamais l'éditer à la main.
2. **Une étape de la roadmap à la fois.** Après chaque étape : compiler, tester dans le playground,
   cocher la case dans `docs/ROADMAP.md`.
3. Le code métier commun va dans `AppService` ; les resolvers ne contiennent que ce qui leur est propre.
4. Toute query/mutation termine par `saveWorld(user, world)` (y compris `getWorld`).
5. Avant tout calcul de gain ou toute mutation, appliquer d'abord l'évolution du monde depuis
   `lastupdate` (cf. `docs/GAME-RULES.md`).
6. Respecter les noms exacts du schéma (`cout`, `croissance`, `revenu`, `vitesse`, `quantite`,
   `timeleft`, `seuil`, `idcible`, `typeratio`, …) : ils sont partagés avec le frontend.
7. Langue : code et identifiants en anglais/français **tels que définis par le sujet** ; commentaires
   et documentation en français. Réponses à l'utilisateur en français.
8. Ne pas ajouter de base de données, d'ORM, ni de dépendances non prévues par le sujet sans demander.
9. Ne pas committer sans qu'on le demande.

## Pièges connus (voir `docs/DECISIONS.md` pour le détail)

- Le backend est en **ESM** (`"type": "module"`) : les imports relatifs doivent finir par `.js`
  (`./app.service.js`). Les extraits du PDF n'ont pas ce suffixe — l'ajouter.
- `__dirname` n'existe pas en ESM : pour `useStaticAssets`, utiliser `join(process.cwd(), 'public')`.
- `origworld` ne doit jamais être muté : toujours en retourner une **copie profonde**
  (`structuredClone`) quand on le sert à un nouvel utilisateur ou lors d'un reset.
