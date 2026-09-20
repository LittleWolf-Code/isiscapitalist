# ISIS Capitalist — guide projet pour Claude Code

Jeu type *AdVenture Capitalist* (idle/clicker) réalisé dans le cadre d'un TP ISIS.
Monorepo avec deux applications indépendantes :

- `backend/`  — API GraphQL **NestJS 12** (schema-first, Apollo), stockage des mondes en fichiers JSON.
- `frontend/` — **Angular 22** (standalone, signals) + `@apollo-orbit/angular` + graphql-codegen.

Le sujet officiel du backend est dans `backend.pdf` ; sa transcription structurée est dans
`docs/SPEC-backend.md`. **Toujours lire `docs/` avant de coder** :

| Fichier | Contenu |
|---|---|
| `docs/SPEC-backend.md` | Sujet du TP backend (schéma GraphQL, étapes, contraintes) |
| `docs/GAME-RULES.md` | Règles métier du jeu (production, unlocks, upgrades, anges, reset, formules) |
| `docs/ARCHITECTURE.md` | Organisation des fichiers, flux de données, stockage |
| `docs/ROADMAP.md` | Plan de travail par étapes avec cases à cocher — **la source de vérité de l'avancement** |
| `docs/DECISIONS.md` | Décisions techniques prises (et pourquoi) |
| `docs/THEME.md` | Thème « Nuka Capitalist » : casting des mascottes, lexique Fallout, cases restantes |
| `docs/reference/` | Schéma GraphQL fourni + squelette `origworld` (à copier, pas à inventer) |

Chaque sous-projet a son propre `CLAUDE.md` avec les conventions spécifiques (`backend/CLAUDE.md`, `frontend/CLAUDE.md`).

## État actuel (19/09/2026)

- **Backend terminé** : phases 0 à 8 de `docs/ROADMAP.md` cochées (schéma, monde, 6 mutations,
  moteur temporel, unlocks, upgrades, reset, tests unitaires + e2e, README).
- **Frontend** : le sujet officiel (`frontend.pdf`) n'existe pas encore ; un **front générique de
  test** (une page) exerce toutes les opérations du schéma (phase 9.1 + 9.2). Depuis 9.3, il
  propose un mode d'achat « max » et grise les boutons d'achat faute d'argent (D17). Depuis 9.4,
  il est habillé avec **Angular Material 22.1** (toolbar, cards, progress bars, tables — D18),
  sans changement de comportement. Depuis 9.5, il a la navigation d'un jeu idle : barre latérale
  à onglets Managers / Upgrades / Anges (sous-onglets Reset et Bonus) / Unlocks, panneau à côté
  des produits, pastille « anges gagnables » sur l'onglet Anges (D19).
  Depuis 9.6, le bouton Produire d'une carte dont le manager est engagé devient Arrêter /
  Reprendre : nouvelle mutation `basculerManager` (D20, deuxième écart au schéma du sujet après D6).
  Depuis 9.8, il a l'esthétique d'un écran cathodique vert monochrome (D22) : thème M3 + police
  VT323 dans `material-theme.scss`, barre d'onglets en bas (Produits / Managers / Upgrades /
  Anges / Unlocks / Paramètres), un écran par onglet, réglages scanlines / halo / scintillement
  persistés, effets CSS dans `styles.css`. Depuis 9.9, la carte produit est allégée (revenu,
  gain, barre d'achat « quantite / seuil du prochain palier », barre de production, boutons) et
  l'onglet Unlocks montre le prochain palier de chaque produit (`UnlockList`, `nextUnlock`, D23).
  Depuis 9.10, les deux barres de la carte font 24 px et la barre d'achat est dans un en-tête
  maison, à droite de l'icône (64 px) sous le nom, avec « quantite / seuil » centré dedans (D25).
  Depuis 9.12, la barre d'onglets du bas occupe toute la largeur (6 onglets à parts égales,
  pagination Material en fenêtre étroite) et le bouton Acheter de la carte est collé au bord
  droit, Produire / Arrêter / Reprendre restant à gauche (D26).
  Depuis 9.13, la carte n'affiche plus le revenu : le gain d'une production est écrit dans la
  barre de production et un chrono encadré de 24 px (`mm:ss`, seconde supérieure,
  `formatDuration`) est collé à sa droite — temps restant, ou durée d'un cycle au repos (D28).
  Depuis 9.14, `formatNumber` continue en P / E / Z / Y puis en notation scientifique (« 1.23e27 »),
  les deux boutons de la carte restent toujours sur une ligne (`nowrap`), et la barre de
  production suit exactement le tick 100 ms (transition Material retirée) et reste pleine pour
  un produit dont `vitesse` < 400 ms (`productionProgress`, `FAST_CYCLE_MS`, D29).
  Depuis 9.15, la chip manager de la carte garde le texte `manager` en pause (D30).
  Depuis 9.16, le toggle x1 / x10 / x100 / max sélectionné est en vidéo inversée (vert plein,
  texte noir, `mat.button-toggle-overrides`), avec halo sous `crt-glow`, survol / focus teintés
  et anneau de focus clavier en `currentColor` (D31).
  Depuis 9.17, la toolbar montre le logo et le nom du monde, les quatre tables `PalierList` ont une
  colonne logo et une colonne « produit » (Item N / Global / Anges) à la place d'`idcible`, la table
  « Par produit » a l'icône du prochain palier, le tout via un composant `GameIcon` à liste de
  candidats avec repli (logo du palier → produit ciblé → monde ; `targetLabel`, `logoCandidates`, D32).
  Depuis 9.18, les deux barres de la carte et le chrono font 24 px (variable
  `--product-bar-height` dans `product-card.css`) et leur texte est en body-large 16 px (D33).
  Depuis D27, `totalangels` / `activeangels` sont en `Float!` dans les deux schémas (troisième écart
  au sujet) : la formule linéaire D20 dépasse l'Int 32 bits dès score ≈ 1,07e11.
  L'exercice « patients » a été entièrement retiré des deux sous-projets.
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
- `app.service.ts` importe actuellement `path/win32` — utiliser `path`.
- `origworld` ne doit jamais être muté : toujours en retourner une **copie profonde**
  (`structuredClone`) quand on le sert à un nouvel utilisateur ou lors d'un reset.
