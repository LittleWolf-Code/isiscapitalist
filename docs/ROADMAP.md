# Roadmap — source de vérité de l'avancement

Cocher `[x]` une étape uniquement quand elle est **compilée, testée dans le playground et sauvegardée
dans `userworlds/`**. Une étape = une session de vibe coding raisonnable. Ne pas sauter d'étape.

## Phase 0 — Nettoyage (préparation)

- [x] 0.1 Supprimer l'exercice « patients » du backend : `src/patients.json`, types/queries
      `Patient`/`Symptome` dans `schema.graphql`, méthodes `readPatients`/`getPatient` du service,
      resolver `getPatients`/`getPatient`. Corriger l'import `path/win32` → `path`.
- [x] 0.2 Décider du sort d'`ObserveModule` (starter NestJS) — garder ou retirer (cf. DECISIONS D5).
- [x] 0.3 Créer `backend/userworlds/` (avec `.gitkeep`) et `backend/public/icones/`.

## Phase 1 — Schéma et monde

- [x] 1.1 Copier `docs/reference/schema.graphql` → `backend/src/schema.graphql`.
- [x] 1.2 `npm run start:dev` → vérifier que `src/graphql.ts` contient `World`, `Product`, `Palier`,
      `RatioType`, `IQuery`, `IMutation`. Playground OK sur http://localhost:3000/graphql.
- [x] 1.3 Écrire `src/origworld.ts` à partir du squelette : **6 produits**, **6 managers**,
      **≥ 3 paliers/produit**, **≥ 3 allunlocks**, **~10 upgrades**, **quelques angelupgrades**.
      Thème et noms à choisir (le squelette est écolo : sacs papier, bacs de recyclage…).
      Équilibrer : coûts croissants (×~10 entre produits), `croissance` 1.07 → 1.15, `vitesse`
      croissante (500 ms → plusieurs minutes), premier produit `quantite: 1`.
- [x] 1.4 Placer les images dans `backend/public/icones/`, modifier `main.ts`
      (`NestExpressApplication`, `useStaticAssets`, `enableCors`). Vérifier
      http://localhost:3000/icones/<image>.

## Phase 2 — Lecture / persistance

- [x] 2.1 `AppService.readUserWorld(user)` (retourne un **clone** d'`origworld` si pas de fichier)
      et `saveWorld(user, world)`.
- [x] 2.2 `resolver.ts` : `@Resolver('World')`, `getWorld(user)` → read → save → return.
      Déclarer dans `app.module.ts`. Vérifier création de `userworlds/<user>-world.json`.

## Phase 3 — Mutations de base

- [x] 3.1 `acheterQtProduit(user, id, quantite)` : produit introuvable → erreur ; coût géométrique ;
      `money -= total` ; `quantite += q` ; `cout = cout * croissance^q` ; save.
- [x] 3.2 `lancerProductionProduit(user, id)` : `timeleft = vitesse` ; save.
- [x] 3.3 `engagerManager(user, name)` : manager introuvable → erreur ; coût ; `managerUnlocked`
      + `unlocked` ; save.

## Phase 4 — Moteur temporel

- [x] 4.1 `AppService.updateWorld(world)` selon `GAME-RULES.md` (sans manager / avec manager,
      formule de gain avec anges, `lastupdate = now`).
- [x] 4.2 Appeler `updateWorld` en tête de **toutes** les opérations (getWorld inclus).
- [x] 4.3 Tests unitaires vitest de `updateWorld` (cas : pas de production, production finie,
      production partielle, manager avec n cycles, `lastupdate == 0`). Intégrer l'échantillon
      https://gitlab.com/-/snippets/2522185 s'il est récupéré (fait : `backend/test/production-samples.ts`
      + `.spec.ts`, 21 cas verts).

## Phase 5 — Unlocks et bonus

- [x] 5.1 `applyBonus(world, palier)` (gain / vitesse / ange, cibles 0 / id / -1).
- [x] 5.2 `checkProductUnlocks(world, product)` + `checkAllUnlocks(world)` appelés depuis
      `acheterQtProduit`.
- [x] 5.3 Tests vitest des unlocks (seuil atteint, pas de double déblocage, allunlock nécessite tous
      les produits).

## Phase 6 — Upgrades

- [x] 6.1 `acheterCashUpgrade(user, name)` (argent).
- [x] 6.2 `acheterAngelUpgrade(user, name)` (anges actifs).

## Phase 7 — Reset

- [x] 7.1 `resetWorld(user)` : anges gagnés, clone d'`origworld` avec `score`/`totalangels`/
      `activeangels`, save.
- [x] 7.2 Vérifier que la formule de gain applique bien `activeangels * angelbonus / 100`.
- [x] 7.3 Formule des anges recalibrée à 2 % du score (D20) : `world-engine.ts` + `game-math.ts`,
      e2e reset discriminant.

## Phase 8 — Qualité

- [x] 8.1 `npm run lint` et `npm run build` propres, `npm test` vert.
- [x] 8.2 Test e2e supertest : `getWorld` puis `acheterQtProduit` sur un user jetable
      (`backend/test/world.e2e-spec.ts`, 5 cas : création du fichier, achat, produit inconnu,
      manager trop cher, reset ; `npm run test:e2e` = 6 tests avec le starter).
- [x] 8.3 README du backend remplacé par une doc courte du projet (lancement, endpoints, exemples
      de requêtes).

## Phase 9 — Frontend (en attente du sujet)

- [x] 9.1 Copier le schéma dans `frontend/src/app/graphql/schema.graphql`, écrire les opérations,
      `npm run codegen`.
- [x] 9.2 Front générique de test (en attendant `frontend.pdf`) : page unique exerçant `getWorld`
      et les 6 mutations (`GameService`, `ProductCard`, `PalierList`, `game-math.ts`), tests vitest,
      voir `frontend/CLAUDE.md`.
- [x] 9.3 Multiplicateur « max » et boutons d'achat désactivés faute d'argent (D17).
- [x] 9.4 Angular Material et refonte visuelle (D18) : `mat-toolbar`, `mat-card` + `mat-progress-bar`
      + `mat-chip`, `mat-table`, un fichier de style par composant, mêmes comportements qu'en 9.3.
- [x] 9.5 Barre latérale à onglets Managers / Upgrades / Anges (Reset, Bonus) / Unlocks (D19) :
      `SideNav` (`mat-nav-list` + `matBadge` anges gagnables), `AngelsPanel` (`mat-tab-group`),
      `activeTab` persisté, `angelsEarned` dans `game-math.ts`, Reset retiré du bandeau.
- [x] 9.6 Pause de l'automatisation d'un manager : mutation `basculerManager` (D20), bouton
      Produire / Arrêter / Reprendre sur la carte (`managerOwned` dérivé de `world.managers`).
- [x] 9.7 Bouton de production grisé sans exemplaire (D21) : `canProduce` sur la carte,
      `[disabled]` natif sur Produire / Arrêter / Reprendre si `quantite = 0`, backend intact.
- [x] 9.8 Thème « écran cathodique » vert (D22) : palette M3 monochrome + VT323 dans
      `material-theme.scss`, `TabBar` en bas (`mat-tab-nav-bar`, 6 onglets, `selectTab`),
      écran Paramètres (`SettingsPanel`, 3 réglages CRT persistés), effets dans `styles.css`.
- [x] 9.9 Carte produit allégée + onglet Unlocks par produit (D23) : `nextUnlock` dans
      `game-math.ts`, carte réduite à revenu / gain / barre d'achat « quantite / seuil » /
      barre de production, nouveau `UnlockList` (prochain palier de chaque produit) au-dessus
      de la table « All unlocks » inchangée.
- [x] 9.10 Carte produit : barres 16 px, barre d'achat dans l'en-tête sous le nom (D25) :
      en-tête maison (icône 64 px, nom + chip, barre « quantite / seuil » avec le texte centré
      dedans), hauteur des deux barres par les variables `--mat-progress-bar-*-height` scopées
      à la carte, `UnlockList` inchangé (4 px).
- [x] 9.11 Engager un manager exige un exemplaire du produit (D24) : `engagerManager` refuse
      (`throw`, vérifié avant l'argent) si `product.quantite === 0` ; `blockedManagerNames` dans
      `game-math.ts`, input `blockedNames` de `PalierList`, `[blockedNames]` sur la seule liste
      Managers ; `updateWorld` et le schéma intouchés.
- [x] 9.12 Barre du bas pleine largeur (onglets à parts égales) + Acheter au bord droit de la
      carte (D26) : stretch Material rétabli + `flex-basis: 0` sur `.tab`, `.buy { margin-left:
      auto }` dans `mat-card-actions` en `flex-wrap` ; pagination Material conservée en étroit.
- [x] 9.13 Carte produit : gain dans la barre de production, chrono mm:ss à sa droite, ligne
      revenu retirée (D28) : `formatDuration` dans `game-math.ts` (seconde supérieure, `h:mm:ss`
      au-delà d'une heure), `remainingLabel` (timeleft en cours, sinon vitesse), `.bar-label`
      partagé par les deux barres, `.product-timer` encadré 16 px en `ch`.
- [x] 9.14 Carte produit : `formatNumber` jusqu'à Y puis scientifique, actions en nowrap, barre
      de production sans transition et pleine sous 400 ms (D29) : `UNITS` étendu P / E / Z / Y
      puis `toExponential(2)` sans `+` dès 10²⁷ ; `FAST_CYCLE_MS = 400` et `productionProgress`
      dans `game-math.ts` (`progress()` de la carte délègue) ; `mat-card-actions` en
      `flex-wrap: nowrap`, boutons `flex: 0 0 auto; white-space: nowrap`, Acheter à
      `--mat-button-filled-horizontal-padding: 12px` ; `.product-gain ::ng-deep
      .mdc-linear-progress__bar { transition: none }` (barre d'achat et `UnlockList` intactes).
- [x] 9.15 Chip « manager » à texte constant (D30) : le ternaire « manager » / « manager (en
      pause) » disparaît de `product-card.html`, la pause ne se lit que sur le bouton Reprendre.
- [x] 9.16 Multiplicateur : toggle sélectionné en vidéo inversée + halo sous `crt-glow`, survol /
      focus teintés (D31) : `mat.button-toggle-overrides` dans `material-theme.scss`
      (`selected-state-background-color: var(--mat-sys-primary)`, `selected-state-text-color:
      var(--mat-sys-on-primary)`, `state-layer-color: var(--mat-sys-primary)`, opacités survol
      0.12 / focus 0.24 ; token global `secondary-container` intact) ; dans `styles.css`
      `.multiplier.mat-button-toggle-group { overflow: visible }`, halo `app-root.crt-glow
      .multiplier .mat-button-toggle-checked` (même valeur que `.pip-frame`) et anneau de focus
      `.mat-button-toggle-button:focus-visible` en `currentColor` ; test `app.spec.ts` (x10 seul
      coché, clic x100 → `multiplier() === 100`).
- [x] 9.17 Logo + nom du monde, icônes des paliers avec repli, colonne « produit » (D32) :
      `targetLabel` / `logoCandidates` dans `game-math.ts` ; composant `GameIcon`
      (`app-game-icon`, `candidates` / `alt`, index en `linkedSignal` sur une clé de contenu,
      `(error)` → candidat suivant, aucun `<img>` si épuisé, hôte 32 px, `ICON_BASE_URL`
      déménagé ici) ; `PalierList` : inputs `products` / `worldLogo`, colonnes `logo` + `produit`
      (Item N / Global / Anges / `#id`) à la place d'`idcible` ; `UnlockList` : `worldLogo`, icône
      devant le prochain palier ; `AngelsPanel` relaie `products` / `worldLogo` ; `App` :
      `span.world-name` (icône + `world.name`) dans la toolbar et bindings vers les 5 listes.
      138 tests verts (10 fichiers), `grep idcible *.html` vide.
- [x] 9.18 Carte produit : barres et chrono à 24 px, texte des barres en body-large 16 px (D33) :
      variable `--product-bar-height` dans `product-card.css` (source unique des deux tokens
      `--mat-progress-bar-*-height` et de la hauteur du chrono), `.bar-label` / `.product-timer`
      en `--mat-sys-body-large`. CSS seul, 138 tests verts sans changement de spec ; `UnlockList`
      reste à 4 px.
- [x] 9.19 Paramètres : réglages CRT réalistes — vignette, grille, grain, bande, bruit, teinte,
      curseurs, reset (D34) : `display-settings.ts` (`DisplaySettings`, `DEFAULT_DISPLAY`,
      `normalizeDisplay`, `readStoredDisplay` avec migration des trois clés D22), clé unique
      `isiscapitalist.display` (JSON) et signal `display` dans `GameService`, `SettingsPanel` à
      trois sections (Écran / Lumière / Animations, 8 toggles, 3 `mat-slider`, teinte en
      `mat-button-toggle-group`, bouton Réinitialiser), host bindings d'`App` (8 classes `crt-*`,
      `data-tint`, variables `--crt-scanlines` / `--crt-glow` / `--crt-vignette`),
      `div.crt-overlay` et couches dans `styles.css`. 160 tests verts (12 fichiers).
- [x] 9.20 Sujet frontend reçu (`frontendangularsignal.pdf`) : cahier des charges
      (`docs/CAHIER-DES-CHARGES.md`) et recette de l'existant (`docs/RECETTE.md`).

## Phase 10 — Conformité au cahier des charges

Le sujet prime (D36) : tout ce que `docs/RECETTE.md` classe « Partiel » ou « Non conforme » est
aligné sur `docs/CAHIER-DES-CHARGES.md` ; les ajouts hors sujet ne sont gardés que s'ils ne
contredisent aucune exigence (thème cathodique, écran Paramètres).

- [x] 10.1 Backend : anges `150 × √(score / 10¹⁵)` (RG-09, remplace D20), schéma du sujet
      (`totalangels` / `activeangels: Int!`, `basculerManager` retiré ; `lastupdate: Float!`
      gardé, A1), règles ajoutées retirées (D24, refus de production à 0 exemplaire de D12),
      accélération proportionnelle d'une production en cours (RG-07), `advanceProduction`
      partagée avec le client, nom de joueur confiné dans `userworlds/` (D-01).
- [x] 10.2 Frontend, logique : client autonome (F-11, F-12) — signal `server`, `world` en
      `linkedSignal`, plus de poll, boucle `calcScore` 100 ms + `productionDone`, actions
      appliquées localement puis envoyées (achat + unlocks, production, manager, upgrades, angel
      upgrades), snack-bar `snackmessage`, pseudo `form()` + `commitName` + `Captain<n>` +
      `refreshWorld`.
- [x] 10.3 Frontend, interface : en-tête (logo + nom, argent, multiplicateur cyclique, pseudo +
      Refresh), bandeau gauche de boutons badgés, fenêtres superposées fermables (Unlocks, Cash
      Upgrades, Angel Upgrades, Managers, Investors, Paramètres), carte produit du sujet (image +
      quantité superposée cliquable, barre + gain, achat + temps restant), pipes `bigvalue` /
      `second`.
- [x] 10.4 Monde final « Nuka Capitalist » (F-33) : casting validé de `THEME.md`, images produits
      extraites de `Nuka Capitalist.pdf`, noms proposés pour les cases restantes, équilibrage
      simulé.
- [x] 10.5 Nouvelle recette (`docs/RECETTE.md`) et documentation à jour.
- [x] 10.6 Disposition au choix dans Paramètres (D37) : celle du sujet par défaut, ou la barre
      d'onglets en bas de la phase 9 (barre du haut à cases de stats, multiplicateur en 4 boutons,
      `TabBar` rétablie, un écran par onglet) ; contenus partagés en `ng-template`.
- [x] 10.7 Images de la version du 05/10 de `Nuka Capitalist.pdf` (D38) : 10 images détourées
      (managers Armes et Nuke, 6 paliers, upgrades 1 et 2), upgrade 2 sur les Armes.

## Exemples de requêtes playground (à réutiliser pour tester)

```graphql
query { getWorld(user: "lucas") { name money score lastupdate products { id name cout quantite timeleft managerUnlocked } } }

mutation { acheterQtProduit(user: "lucas", id: 1, quantite: 1) { id quantite cout } }

mutation { lancerProductionProduit(user: "lucas", id: 1) { id timeleft } }

mutation { engagerManager(user: "lucas", name: "Cappy") { name unlocked } }

mutation { acheterCashUpgrade(user: "lucas", name: "Affiche Nuka-Cola") { name unlocked } }

mutation { acheterAngelUpgrade(user: "lucas", name: "Fortune Finder") { name unlocked } }

mutation { resetWorld(user: "lucas") { score totalangels activeangels money } }
```
