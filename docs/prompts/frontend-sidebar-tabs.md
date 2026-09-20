# Prompt — Barre latérale à onglets (Managers, Upgrades, Anges, Unlocks)

- Date : 2026-09-19
- Étape roadmap : 9.5 (nouvelle ligne à insérer, voir Étapes) — **suppose 9.4 terminée**
  (`frontend-material-refonte.md` : Angular Material installé, composants Material en place)
- Sous-projet : frontend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « rajoute sur la gauche un leftbar avec des
  onglets, un onglet pour les managers, un onglet pour les upgrades, un onglet pour les anges (avec
  des sous-onglets : 1 pour reset avec le nombre d'anges gagnables par un reset, et un autre pour
  les achats des bonus d'ange) »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, terminé) et `frontend/` (Angular 22.1
standalone + signals, `@apollo-orbit/angular` 3, Angular Material 22.1, tests vitest). Réponds en
français ; code et commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur
Angular du TP ; le backend, le schéma GraphQL et `origworld.ts` ne sont pas ton périmètre.

### Objectif

Depuis 9.4 la page est en Material mais garde la disposition du front de test : 6 produits à
gauche, 4 tables de paliers empilées à droite, bouton Reset dans le bandeau. On veut la navigation
d'un vrai jeu idle : une **barre latérale gauche** avec quatre onglets — **Managers**,
**Upgrades**, **Anges**, **Unlocks** — dont le contenu s'ouvre dans un **panneau** entre la barre
et les produits (les produits restent visibles). L'onglet **Anges** a deux sous-onglets :
**Reset** (nombre d'anges que rapporterait un reset maintenant, bouton Reset) et **Bonus** (achat
des angel upgrades). C'est l'étape **9.5** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` (tableau des fichiers tel que laissé par 9.4,
   conventions : composants présentationnels, `[disabled]` natif, import Material module par module).
2. `docs/GAME-RULES.md` §Reset — formule des anges gagnés, à recopier côté client.
3. `docs/DECISIONS.md` — D14/D15 (le monde affiché vient du dernier `getWorld`), D17 (angel
   upgrades payés en `activeangels`), D18 (Material).
4. `backend/src/world-engine.ts`, fonction `angelsEarned` : **c'est la formule exacte à
   reproduire** dans `game-math.ts` (même nom, même bornage à 0), comme `buyCost` et
   `productionGain` le sont déjà.
5. `frontend/src/app/` : `app.ts/.html/.css`, `game.service.ts`, `game-math.ts`,
   `palier-list.ts/.html`, `product-card.ts/.html` et les specs.
6. Doc Material : [Sidenav](https://material.angular.dev/components/sidenav/overview),
   [List (mat-nav-list)](https://material.angular.dev/components/list/overview),
   [Tabs](https://material.angular.dev/components/tabs/overview),
   [Badge](https://material.angular.dev/components/badge/overview).

### Comportement attendu

**Disposition** (desktop) — trois zones dans un `mat-sidenav-container` :

```
┌ toolbar (user, money, score, anges, angelbonus, multiplicateur) ─────────────────────┐
├──────┬──────────────────────────┬────────────────────────────────────────────────────┤
│ nav  │ panneau (onglet actif)   │ produits (6 mat-card)                              │
│ 72px │ 420 px                   │ reste de la largeur                                │
└──────┴──────────────────────────┴────────────────────────────────────────────────────┘
```

- **Barre** (`mat-sidenav`, `mode="side"`, `opened`, non fermable) : `mat-nav-list` de 4 items,
  chacun une `mat-icon` + libellé (`Managers`, `Upgrades`, `Anges`, `Unlocks`). L'item actif est
  marqué (`activated`). L'item **Anges** porte un `matBadge` = anges gagnables, masqué
  (`matBadgeHidden`) quand 0 — l'équivalent de la pastille « Investors » d'AdVenture Capitalist.
- **Panneau** : contenu de l'onglet actif. Managers / Upgrades / Unlocks = la `PalierList`
  correspondante, inchangée (Unlocks = ex-« All unlocks », lecture seule). Anges = nouveau
  composant `AngelsPanel` (voir plus bas). Cliquer sur l'onglet déjà actif **ferme** le panneau
  (`activeTab = null`) ; les produits prennent alors toute la largeur.
- **Onglet actif** : signal `activeTab: Tab | null` (`Tab = 'managers' | 'upgrades' | 'angels' |
  'unlocks'`) dans `GameService`, à côté de `multiplier` ; persisté dans localStorage sous
  `isiscapitalist.tab` (valeur `'none'` pour fermé) ; défaut **`'managers'`** ; toute valeur
  inconnue relue → `'managers'`.
- **Bandeau** : le bouton Reset **disparaît** du bandeau ; le reste ne change pas.
- **Sous 900 px** : la barre reste, le panneau passe **au-dessus** des produits (empilement
  vertical) plutôt qu'à côté.

**`AngelsPanel`** (présentationnel, `mat-tab-group` à 2 onglets) :

- Onglet **Reset** :
  - `Anges gagnables : N` (`N = angelsEarned(world)`), mis en évidence ;
  - `Anges actifs : a / total : t`, `Bonus par ange : b %`, `Score : s` (avec `formatNumber`) ;
  - bouton **Reset** (`mat-flat-button`, couleur erreur/warn), **jamais désactivé** (un reset à
    0 ange est permis, comme dans le jeu original) ; au clic, `confirm()` natif avec le texte
    exact `Réinitialiser le monde de « <user> » ? Vous gagnerez <N> ange(s).` puis émission de
    `reset` si confirmé. Le `confirm()` reste dans `App` (le panneau ne connaît pas `user`) : le
    panneau émet `resetRequested`, `App` confirme et appelle `game.reset()`.
- Onglet **Bonus** : la `PalierList` des angel upgrades (`costUnit 'anges'`,
  `balance = activeangels`), inchangée, dont l'output `action` est relayé vers
  `game.buyAngelUpgrade`.

**Exemple chiffré** (formule `angelsEarned = max(0, floor(150 × √(score / 1e15)) − totalangels)`) :

| score | totalangels | anges gagnables | badge Anges |
|---|---|---|---|
| 0 | 0 | 0 | masqué |
| 4.4e10 | 0 | 0 (150 × 0.00663 = 0.99) | masqué |
| 1e11 | 0 | 1 (150 × 0.01 = 1.5) | `1` |
| 1e13 | 0 | 15 | `15` |
| 4e13 | 15 | 15 (30 − 15) | `15` |
| 4e13 | 40 | 0 (borné) | masqué |

Après un reset à `score 1e13, totalangels 0` : le serveur renvoie `totalangels 15,
activeangels 15, money 0`, les produits repartent d'`origworld` ; le badge disparaît (15 − 15 = 0).

### Cas limites

- **Monde non chargé** (`world()` undefined) : ni panneau ni badge ; la barre reste affichée
  (les onglets ne font qu'écrire `activeTab`).
- **Reset annulé** dans `confirm()` : aucune mutation, rien ne change.
- **Anges gagnables en retard** : `score` vient du dernier `getWorld` (≤ 2 s, D15) ; le nombre
  affiché peut différer de celui que le serveur calculera au reset — ne pas « corriger » côté
  client, ne pas afficher de décimales (`floor` comme le serveur).
- **localStorage indisponible** (navigation privée) : même `try/catch` que pour `user` ; l'onglet
  ne survit pas au rechargement, sans erreur.
- **Angel Upgrade déjà acheté** : `PalierList` le désactive déjà (`unlocked`) ; rien à ajouter.
- **Le bouton Reset a quitté le bandeau** : `app.spec.ts` (« se crée sans monde chargé ») ne doit
  pas chercher un bouton Reset hors panneau.

### Contraintes (et pourquoi)

- **Aucune modification de `backend/` ni du schéma** : aucune query n'expose « anges
  gagnables », donc la formule est **dupliquée** dans `game-math.ts` (`angelsEarned`, fonction
  pure, mêmes noms que `world-engine.ts`) — pour l'affichage seulement, le serveur reste seul
  juge au reset (D14).
- **Pas de routeur** (`mat-nav-list` sans `routerLink`) : la page est unique, le poll `getWorld`
  et le timer vivent dans `GameService` ; un `Router` n'apporterait qu'une URL par onglet et
  compliquerait `app.spec.ts`. L'état d'onglet est une préférence d'affichage, au même titre que
  `multiplier` — d'où sa place dans `GameService`.
- `AngelsPanel` et la future `SideNav` sont **présentationnels** (`input()` / `output()`, aucune
  injection) : testables avec `TestBed` sans serveur, comme `ProductCard` / `PalierList`.
- `PalierList` et `ProductCard` **ne sont pas modifiés** : ils sont simplement déplacés dans le
  panneau ; si un changement paraît nécessaire, c'est le découpage qui est à revoir.
- Le badge lit `angelsEarned` calculé **une fois** dans `App` (`computed` sur `game.world()`) et
  passé en input à la barre et au panneau : une seule source pour les deux affichages.
- Persistance : clé `isiscapitalist.tab`, même `effect` + `try/catch` que `isiscapitalist.user`
  dans `GameService`, pour rester sur un seul mécanisme de préférences.

### Hors périmètre

- Pas de « prochain ange à score S », pas de conseil « reset conseillé quand N ≥ total ».
- Pas de `MatDialog` (le `confirm()` natif est conservé, décision utilisateur).
- Pas d'onglet Produits, pas de barre repliable/masquable, pas de raccourcis clavier.
- Pas de style au-delà du thème Material posé en 9.4 (pas de couleur par onglet, pas d'animation
  d'ouverture).
- Pas de modification de `ProductCard`, `PalierList`, `game-math.ts` hors ajout d'`angelsEarned`.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche > 3 fichiers : écrire un plan en 5-8 lignes
   (nouveaux composants et leurs inputs/outputs, signal `activeTab`, où vit le `confirm()`) et le
   montrer avant de coder.
2. `game-math.ts` : `angelsEarned(world: Pick<World, 'score' | 'totalangels'>): number`.
   `game-math.spec.ts` : les 6 lignes du tableau ci-dessus.
3. `game.service.ts` : `export type Tab = …`, `readonly activeTab = signal<Tab | null>(readStoredTab())`,
   `toggleTab(tab: Tab)` (actif → `null`, sinon → `tab`), effect de persistance ; constantes
   `TAB_STORAGE_KEY`, `DEFAULT_TAB`.
4. Nouveau `side-nav.ts/.html/.css` (`app-side-nav`) : inputs `active: Tab | null`,
   `angelsEarned: number` ; output `select: Tab` ; `mat-nav-list` + `matBadge`.
5. Nouveau `angels-panel.ts/.html/.css` (`app-angels-panel`) : inputs `world`-like
   (`score`, `totalangels`, `activeangels`, `angelbonus`, `angelsEarned`, `angelupgrades`) ;
   outputs `resetRequested: void`, `buyAngelUpgrade: string` ; `mat-tab-group` Reset / Bonus,
   réutilise `PalierList` dans Bonus.
6. `app.ts/.html/.css` : `mat-sidenav-container`, `computed` `angelsEarned`, `@switch` sur
   `game.activeTab()` pour le panneau, retrait du bouton Reset du bandeau, `onReset(n)` avec le
   texte de `confirm()`, mise en page 3 zones + règle < 900 px.
7. Tests : `side-nav.spec.ts` (4 items ; item actif marqué ; badge `15` visible avec
   `angelsEarned 15`, masqué avec 0 ; clic émet `select`), `angels-panel.spec.ts` (deux onglets
   via `MatTabGroupHarness` ; texte `Anges gagnables : 15` ; clic Reset émet `resetRequested` ;
   Bonus contient les angel upgrades), `app.spec.ts` (stub complété par `activeTab: signal('managers')`
   et `toggleTab`), `game-math.spec.ts` (étape 2). Test du service : `toggleTab('managers')` deux
   fois → `null` puis `'managers'` — si `game.service.ts` n'a pas de spec (Apollo), tester
   `toggleTab` comme fonction pure ou l'exclure et le dire.
8. Docs :
   - `docs/DECISIONS.md` : `## D19 — Frontend : navigation par onglets sans routeur, anges
     gagnables recalculés côté client` (format D14-D18) : contexte (page unique, aucune query
     « anges gagnables »), décision (signal `activeTab` persisté, `angelsEarned` dupliqué dans
     `game-math.ts`, `confirm()` natif conservé), conséquences (changer la formule = deux
     fichiers ; l'onglet n'a pas d'URL).
   - `frontend/CLAUDE.md` : tableau des fichiers (+ `side-nav.*`, `angels-panel.*`, lignes
     `game.service.ts` (`activeTab`, `toggleTab`) et `game-math.ts` (`angelsEarned`), `app.*`
     (disposition 3 zones, Reset dans le panneau Anges)) ; conventions (clé `isiscapitalist.tab`).
   - `docs/ROADMAP.md` : insérer `- [x] 9.5 Barre latérale à onglets Managers / Upgrades / Anges
     (Reset, Bonus) / Unlocks (D19)` après 9.4 et renuméroter « à compléter » en 9.6.
   - `CLAUDE.md` (racine), « État actuel » : une phrase sur 9.5.
9. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `npm run build` sans erreur dans `frontend/` (warnings et budgets listés dans le rapport).
- [ ] `npm test` vert : `game-math.spec.ts`, `side-nav.spec.ts`, `angels-panel.spec.ts`,
  `app.spec.ts`, `product-card.spec.ts`, `palier-list.spec.ts`.
- [ ] Backend lancé avec la configuration `backend` de `.claude/launch.json`, frontend avec
  `frontend` (jamais via Bash). Sur http://localhost:4200, utilisateur **neuf**
  (`test-tabs-<timestamp>`), localStorage vidé :
  - [ ] Au chargement : panneau **Managers** ouvert (table des 6 managers), 6 produits à droite,
    aucun bouton Reset dans le bandeau, badge Anges masqué.
  - [ ] Clic **Upgrades** → table des upgrades ; recharger la page → Upgrades toujours ouvert
    (`localStorage['isiscapitalist.tab'] === 'upgrades'`) ; re-clic **Upgrades** → panneau fermé,
    produits pleine largeur ; recharger → toujours fermé (`'none'`).
  - [ ] Clic **Anges** → sous-onglet Reset : `Anges gagnables : 0`, `Anges actifs : 0 / total : 0`,
    `Bonus par ange : 2 %`, `Score : 0.00`. Clic Reset → `confirm` `Réinitialiser le monde de
    « test-tabs-<timestamp> » ? Vous gagnerez 0 ange(s).` → Annuler → rien ne change.
  - [ ] Éditer `backend/userworlds/test-tabs-<timestamp>-world.json` (`"score": 1e13`), recharger :
    badge **15** sur Anges, `Anges gagnables : 15`. Clic Reset → confirmer → bandeau
    `anges 15 / 15`, `money 0.00`, `score 10.00 T`, badge masqué, `Anges gagnables : 0`.
  - [ ] Sous-onglet **Bonus** : Angel Upgrade 1 (`seuil 10`) actif, Angel Upgrade 2 (`seuil 100`)
    `disabled` ; clic Acheter sur Angel Upgrade 1 → bandeau `anges 5 / 15`, `angelbonus 3 %`,
    ligne `unlocked`, bouton `disabled`.
  - [ ] Clic **Unlocks** → table des all unlocks sans colonne action.
  - [ ] Aucune erreur dans la console navigateur.
  - [ ] Largeur 800 px : barre visible, panneau au-dessus des produits, pas de défilement
    horizontal.
- [ ] Deux captures d'écran (desktop avec l'onglet Anges/Reset ouvert et badge 15 ; 800 px)
  jointes au rapport.

### Rapport attendu

En fin de tâche : fichiers créés/modifiés, commandes lancées avec leurs résultats réels (build,
tests), les captures, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Tableau commun dans `frontend-material-refonte.md` (lignes « Navigation latérale »,
« Sous-onglets », « Écran anges », « Tests Material », « Persistance »). Points propres à ce
prompt :

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Pastille « anges à réclamer » | AdVenture Capitalist : point orange sur l'onglet Investors quand des anges sont réclamables | `matBadge` sur l'item Anges, masqué à 0 | reprendre |
| Reset à 0 ange | AdCap autorise le reset à tout moment (avertissement) | Reset jamais désactivé, `confirm()` indique le nombre | reprendre (décision utilisateur) |
| Formule des anges | AdCap : `150 × √(lifetime earnings / 1e15)` | Identique (D7), dupliquée côté client pour l'affichage | reprendre → D19 |
| Navigation par `Router` | Angular : `routerLink` + `routerLinkActive` sur `mat-nav-list` | Signal `activeTab` + localStorage, pas d'URL par onglet | diverge (page unique) → D19 |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | État après 9.4, ce que le joueur gagne (navigation d'un vrai idle), 9.5 nommée, dépendance à 9.4 explicite. |
| 2 | Instructions séquencées | 2 | 9 étapes : maths → service → 2 composants → app → tests → docs → vérif. |
| 3 | Exemples concrets | 2 | Tableau de 6 cas d'`angelsEarned` vérifiés (0.99, 1.5, 15, 30 − 15, borné), schéma ASCII de la disposition, texte exact du `confirm()`, état après reset (15/15, badge masqué). |
| 4 | Structure lisible | 2 | Schéma de disposition en bloc, comportement par zone en puces, contraintes une par ligne. |
| 5 | Rôle et périmètre | 2 | Backend/schéma exclus, `ProductCard`/`PalierList` intouchables, hors périmètre concret (prochain ange, MatDialog, onglet Produits, barre repliable). |
| 6 | Critères de succès mesurables | 2 | v1 = 1 (« le badge s'affiche ») ; v2 : `badge 15`, `anges 15 / 15`, `score 10.00 T`, `anges 5 / 15`, `angelbonus 3 %`, valeur localStorage `'upgrades'` / `'none'`. |
| 7 | Pourquoi des contraintes | 2 | Formule dupliquée (aucune query), pas de routeur (page unique, spec), `confirm()` dans `App` (le panneau ne connaît pas `user`), `angelsEarned` calculé une fois (une source pour deux affichages). |
| 8 | Raisonnement guidé | 2 | Plan avant code ; lire `world-engine.ts` pour copier la formule ; question ouverte sur le test du service posée avec l'issue attendue (« l'exclure et le dire »). |
| 9 | Format de sortie | 2 | Inputs/outputs des nouveaux composants nommés, contenu de D19, lignes de `frontend/CLAUDE.md`, ROADMAP exacte, captures demandées. |
| 10 | Concision / contradictions | 0 | v1 = 0 : la disposition < 900 px était décrite deux fois avec deux formulations (« empilement » / « au-dessus ») et le badge décrit dans Barre, Contraintes et AngelsPanel ; v2 : une seule description du badge (Barre) + la contrainte « calculé une fois » ; reste la redondance assumée exemple ↔ vérification et la longueur de l'étape 7 (tests). |

Historique : v1 16/20 → v2 18/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 6 : chaque point de vérification donne la valeur attendue (badge, bandeau, localStorage)
  et non un adjectif ; les valeurs sont calculées depuis `origworld.ts` (Angel Upgrade 1 : `seuil
  10`, `ratio 1`, `typeratio ange` → `activeangels 5`, `angelbonus 3`) ;
- critère 10 : suppression des doublons (badge, responsive) ; le `confirm()` est décrit une fois,
  dans `AngelsPanel`, et seulement référencé à l'étape 6.
