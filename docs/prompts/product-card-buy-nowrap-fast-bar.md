# Prompt — Carte produit : Acheter ne descend plus (grands nombres), barre de production sans transition et pleine pour les produits rapides

- Date : 2026-09-19
- Étape roadmap : 9.14 (nouvelle ligne, voir Étapes) — suppose 9.12 (D26) et 9.13 (D28) dans
  le code
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « quand la somme à acheter est trop grande ça
  fait descendre le bouton acheter, règle ce problème ; aussi un autre problème : quand la
  vitesse est trop petite la barre de progression ne commence pas au début mais au milieu,
  règle ça »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette tâche corrige **deux bugs d'affichage de la carte produit** (`ProductCard`) et touche
`game-math.ts`, leurs specs et la documentation — rien dans `backend/`, rien dans
`game.service.ts` ni `app.*`.

### Objectif

Deux défauts visibles dès qu'un monde est avancé (ex. user `lucas` : `money ≈ 5e17`, Item 1 à
`cout ≈ 3,85e17` et `vitesse = 125 ms`) :

1. **Le bouton Acheter descend sous Produire.** `formatNumber` s'arrête au suffixe `T` (10¹²) :
   au-delà, le montant s'allonge sans limite (« Acheter x100 — 4772000000.00 T ») et, comme
   `mat-card-actions` est en `flex-wrap: wrap` (D26), le bouton trop large passe à la ligne
   suivante. Correction : `formatNumber` continue avec `P`, `E`, `Z`, `Y` puis passe en notation
   scientifique, et les deux boutons restent **toujours sur une seule ligne** (Produire / Arrêter /
   Reprendre à gauche, Acheter à droite).
2. **La barre de production « démarre au milieu ».** Material anime le remplissage de
   `mat-progress-bar` par une transition CSS de **250 ms** ; le timer de `GameService` avance
   `timeleft` par pas de **100 ms** (D15). Avec `vitesse = 500 ms`, le retour de 80 % à 0 % en
   fin de cycle est étalé sur 250 ms : la barre ne revient jamais visiblement à 0. Avec
   `vitesse = 125 ms`, il n'y a même plus qu'un ou deux pas par cycle : sans transition la barre
   paraîtrait stroboscopique, voire reculer (0 → 80 → 60 → 40 %…), repliement entre le tick et
   la vitesse qu'aucun CSS ne corrige. Correction en deux temps, comme *AdVenture Capitalist* :
   la barre de production **perd sa transition** (elle suit exactement le tick), et un produit
   dont `vitesse < 400 ms` (moins de 4 pas par cycle) montre une **barre pleine en continu**.

Aucune règle de jeu, aucune donnée, aucune requête GraphQL ne change. C'est l'étape **9.14** de
`docs/ROADMAP.md`, décision **D29** dans `docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — lignes `product-card` et `game-math` du
   tableau des fichiers ; conventions : composants présentationnels, un `.css` par composant qui
   ne porte **que la mise en page**, couleurs uniquement via `var(--mat-sys-…)` (D22).
2. `docs/DECISIONS.md` — **D26** (Acheter au bord droit par `.buy { margin-left: auto }` dans
   `mat-card-actions` en `flex-wrap` : c'est le `flex-wrap` que tu retires, le `margin-left: auto`
   reste), **D28** (barre de production avec le gain dedans, chrono `remainingLabel` à sa droite :
   ne pas toucher), **D15** (le timer 100 ms de `GameService` n'anime que `timeleft` : c'est la
   cause du seuil 400 ms, ne pas modifier le tick), D17 / D20 / D21 (boutons : libellés, ordre et
   `[disabled]` inchangés). **D20 existe deux fois, ne pas renuméroter.**
3. `frontend/src/app/game-math.ts` — `formatNumber` (`UNITS`, boucle par tranche de 1000,
   `toFixed(2)`, point décimal fixe) et `formatDuration` (modèle de style : fonction pure,
   commentaire en français expliquant le *pourquoi*).
4. `frontend/src/app/product-card.ts` — `progress` (computed, formule
   `100 × (vitesse − timeleft) / vitesse`, 0 si `vitesse ≤ 0`, bornée 0-100) et `remainingLabel`.
5. `frontend/src/app/product-card.css` — règles `.product mat-progress-bar` (tokens 16 px),
   `.product-gain`, `mat-card-actions` et `.buy`.
6. `frontend/src/app/tab-bar.css` — précédent de `::ng-deep` borné (`:host ::ng-deep …`) pour
   atteindre un élément créé par Material hors encapsulation émulée, avec son commentaire.
7. `frontend/src/app/game-math.spec.ts` (bloc `formatNumber`) et `product-card.spec.ts` (tests
   `progress()`, `buyButton`, ordre des boutons de `mat-card-actions`).

### Comportement attendu

**A. `formatNumber` (game-math.ts)** — suffixes SI par tranche de 1000 jusqu'à `Y` (10²⁴), puis
notation scientifique à 2 décimales **sans le `+`** dès 10²⁷ ; signe, `toFixed(2)`, point
décimal fixe et espace avant le suffixe inchangés. Valeurs de référence (à mettre en tests) :

| Entrée | Sortie | Note |
|---|---|---|
| `999.5` | `999.50` | inchangé |
| `1234` | `1.23 k` | inchangé (test existant) |
| `2.5e12` | `2.50 T` | inchangé (test existant) |
| `1e15` | `1.00 P` | nouveau suffixe |
| `3.854e17` | `385.40 P` | `cout` d'Item 1 chez `lucas` |
| `1.5e18` | `1.50 E` | |
| `2e21` | `2.00 Z` | |
| `7.25e24` | `7.25 Y` | |
| `9.9999e26` | `999.99 Y` | dernier cas en suffixe |
| `1e27` | `1.00e27` | `toExponential(2)` donne `1.00e+27` : retirer le `+` |
| `1.234e30` | `1.23e30` | |
| `-3.2e17` | `-320.00 P` | signe conservé |
| `Infinity` | `Infinity` | garde-fou existant inchangé |

`formatNumber` est partagée (bandeau money / score, `PalierList`, `AngelsPanel`, carte) : les
grands soldes deviennent courts partout, c'est voulu. Le libellé du bouton reste
`Acheter x{{ quantity() }} — {{ fmt(cost()) }}` ; chez `lucas`, Item 1 : x1 → « Acheter x1 —
385.40 P », x10 → « Acheter x10 — 5.33 E », x100 → « Acheter x100 — 4.77 Z ». La quantité `xN`
n'est pas formatée : la croissance géométrique (`croissance ≥ 1.07`) borne le mode « max » à
quelques centaines d'exemplaires.

**B. Actions de la carte (product-card.css)** — `mat-card-actions` passe en `flex-wrap: nowrap`
(le `gap: 0.5rem`, `display: flex` et `.buy { margin-left: auto }` restent) ; les deux boutons
sont en `flex: 0 0 auto; white-space: nowrap` pour ne jamais rétrécir ni replier leur libellé
sur deux lignes. Si, à 360 px de large (viewport de référence de D26, carte ≈ 328 px), « Reprendre »
+ « Acheter x100 — 4.77 Z » débordent encore de la carte, réduire le retrait horizontal du bouton
Acheter par le token Material `--mat-button-filled-horizontal-padding` (24 px par défaut ; 12 px
suffit, ne pas descendre en dessous) plutôt que de toucher au libellé ou à la police. Mettre à
jour le commentaire au-dessus de `mat-card-actions` (il justifie aujourd'hui `margin-left: auto`
par le cas « Acheter seul sur sa ligne », qui n'existe plus : la marge sert désormais uniquement
à pousser Acheter à droite).

**C. Barre de production (game-math.ts + product-card.ts + product-card.css)**

1. Nouvelle fonction pure `productionProgress(product: Pick<Product, 'vitesse' | 'timeleft'>): number`
   dans `game-math.ts` (pourcentage 0-100 attendu par `mat-progress-bar`), avec la constante
   exportée `FAST_CYCLE_MS = 400` (commentaire : 4 × le tick de 100 ms de `GameService`, D15 ;
   en dessous la barre n'aurait pas assez de pas pour être lisible, on la montre pleine comme
   AdVenture Capitalist). Règles, dans cet ordre :
   - `vitesse <= 0` → `0` (garde-fou existant, testé) ;
   - `vitesse < FAST_CYCLE_MS` → `100` ;
   - sinon `100 × (vitesse − timeleft) / vitesse`, borné à 0-100.

   | `vitesse` | `timeleft` | Résultat | Note |
   |---|---|---|---|
   | 1000 | 250 | 75 | test existant de la carte |
   | 0 | 0 | 0 | garde-fou |
   | 500 | 0 | 100 | au repos : plein, comportement actuel conservé |
   | 500 | 500 | 0 | cycle qui démarre : la barre part bien de 0 |
   | 400 | 200 | 50 | seuil strict : 400 ms = 4 pas, barre normale |
   | 399 | 200 | 100 | trop rapide : plein |
   | 125 | 25 | 100 | Item 1 chez `lucas` |

   `ProductCard.progress` appelle `productionProgress(this.product())` (le computed reste, le calcul
   part dans la fonction pure — même schéma que `nextUnlock` / `nextPalier`). `remainingLabel`
   ne change pas : à 125 ms le chrono affiche `00:01` (seconde supérieure, D28).
2. Dans `product-card.css`, supprimer la transition Material de la **seule** barre de production :
   ```css
   .product-gain ::ng-deep .mdc-linear-progress__bar { transition: none; }
   ```
   `mat-progress-bar` est en `ViewEncapsulation.None` : ses `div.mdc-linear-progress__bar` ne
   portent pas l'attribut d'encapsulation de la carte, d'où le `::ng-deep` borné à `.product-gain`
   (même technique que la pastille de `tab-bar.css`). La règle Material est
   `.mdc-linear-progress__bar { transition: transform 250ms … }` (une classe) : le sélecteur
   compilé `.product-gain[_ngcontent-…] .mdc-linear-progress__bar` (deux classes + un attribut)
   l'emporte sans `!important`. La barre d'achat (`.product-owned`) et les barres
   d'`UnlockList` **gardent** leur animation. Commenter la règle : pourquoi (tick 100 ms vs
   transition 250 ms, retour en arrière étalé en fin de cycle) et pourquoi pas
   `MATERIAL_ANIMATIONS` `{ animationsDisabled: true }` en `providers` du composant (couperait
   aussi les ripples des boutons et l'animation de la barre d'achat).

### Cas limites

- `vitesse` exactement 400 → barre normale (seuil strict `<`).
- Produit rapide **sans** manager, au repos (`timeleft = 0`) → 100 (comme aujourd'hui pour tout
  produit au repos) ; après Produire, la barre reste à 100 pendant la course et le chrono reste
  à `00:01` (temps restant ≤ 1 s arrondi au-dessus, puis durée d'un cycle au repos, D28) : rien
  ne bouge visuellement, c'est accepté.
- `formatNumber(999.999e3)` donne `1000.00 k` (arrondi de `toFixed`) : défaut préexistant,
  **ne pas corriger** ici.
- `NaN` / `-Infinity` : `String(value)` comme aujourd'hui.
- Carte plus étroite que ~330 px (viewport < 360 px) : un léger débordement des actions est
  accepté (la grille impose déjà 320 px minimum par carte, D26 acceptait la pagination sous
  450 px) ; ne pas ajouter de media / container query.

### Contraintes (et pourquoi)

- **Ne pas toucher au tick de `GameService`** (`TICK_INTERVAL_MS`, D15) : l'option « tick plus
  rapide » a été écartée ; le seuil 400 ms est la réponse au repliement, pas un tick plus fin.
- **`formatNumber` reste une fonction pure sans locale** : les valeurs attendues des tests et de
  la roadmap sont écrites avec un point décimal.
- **Aucune couleur, aucun token de couleur** : `material-theme.scss` intouché (D22).
- **Ordre et libellés des boutons inchangés** : les specs D20 / D21 comptent sur « Acheter =
  second bouton de `mat-card-actions` » et sur le texte normalisé `Acheter x10 — 55.27`.
- **`aria-label` des barres inchangés** (« Production en cours », « Progression vers le prochain
  palier ») : les specs les ciblent.
- Ne pas modifier `backend/`, `game.service.ts`, `app.*`, `unlock-list.*`, `palier-list.*`.

### Hors périmètre

- Afficher un revenu par seconde pour les produits rapides (AdCap le fait ; ici le gain d'une
  production reste écrit dans la barre, D28).
- Changer le format de la quantité `xN`, le libellé « Acheter », la police ou la taille des
  boutons.
- Corriger l'arrondi `1000.00 k`.
- Ajouter des suffixes `R` / `Q` (10²⁷ / 10³⁰) : la notation scientifique prend le relais.

### Étapes

1. Lire les fichiers ci-dessus. Avant de coder, écrire un plan en 5 lignes (fichiers touchés,
   nouvelle fonction, règles CSS, tests) et le montrer.
2. `game-math.ts` : étendre `UNITS` et la bascule scientifique dans `formatNumber` ; ajouter
   `FAST_CYCLE_MS` et `productionProgress`. Tests dans `game-math.spec.ts` : les deux tableaux
   ci-dessus (un `it` par ligne ou `it.each`).
3. `product-card.ts` : `progress` délègue à `productionProgress` ; mettre à jour le commentaire.
   Tests dans `product-card.spec.ts` : le test 75 % existant passe toujours ; ajouter
   `vitesse 125, timeleft 25 → aria-valuenow "100"` et `vitesse 500, timeleft 500 → "0"`.
4. `product-card.css` : `nowrap` + `flex: 0 0 auto; white-space: nowrap` sur les boutons, règle
   `::ng-deep` sur `.product-gain`, commentaires révisés. Pas de test jsdom pour la mise en page
   ni la transition (D26 : « largeurs et alignements ne se testent pas en jsdom ») : vérification
   dans le navigateur.
5. Vérifier (section suivante).
6. Documentation : dans `docs/ROADMAP.md`, remplacer la ligne « `- [ ] 9.14 … (à compléter …)` »
   par une ligne cochée « 9.14 Carte produit : `formatNumber` jusqu'à Y puis scientifique,
   actions en nowrap, barre de production sans transition et pleine sous 400 ms (D29) : … »
   (résumé des fichiers, même style que 9.13), puis rajouter la ligne d'attente « 9.15 … (à
   compléter quand `frontend.pdf` sera disponible) » non cochée ; ajouter
   **D29** dans `docs/DECISIONS.md` (Contexte / Décision / Conséquences comme D26–D28 : les deux
   causes, le choix SI + scientifique plutôt que million/billion, le seuil 400 ms = 4 ticks, le
   `::ng-deep` plutôt que `MATERIAL_ANIMATIONS`, et le fait que D26 « Acheter passe seul à la
   ligne » n'est plus vrai) ; mettre à jour la ligne `product-card` et la ligne `game-math` du
   tableau de `frontend/CLAUDE.md`, et la phrase « Depuis 9.13… » de `CLAUDE.md` racine (ajouter
   « Depuis 9.14, … »).

### Vérification — critères de succès

- [ ] `cd frontend && npm test` : tout vert, dont les nouveaux tests `formatNumber` (13 lignes du
  tableau A) et `productionProgress` (7 lignes du tableau C).
- [ ] `cd frontend && npm run build` sans erreur (le warning de budget de bundle D18 est connu).
- [ ] Backend lancé (`backend` de `.claude/launch.json`), frontend lancé (`frontend`), user
  **`lucas`**, onglet Produits, multiplicateur **x100**, viewport 1024 px :
  - le bouton Acheter d'Item 1 affiche `Acheter x100 — 4.77 Z` (ou une autre valeur courte : le
    monde évolue) et est sur la **même ligne** que Arrêter / Reprendre :
    ```js
    const [prod, buy] = document.querySelectorAll('mat-card-actions button');
    Math.abs(prod.getBoundingClientRect().top - buy.getBoundingClientRect().top) < 1
    ```
  - le bandeau money affiche une valeur en `P` (ex. `512.25 P`), plus de `… T` à 10 chiffres.
- [ ] Viewport 360 px (`resize_window`), toujours x100 : même test « même ligne » sur Item 1 et
  Item 6, et `document.documentElement.scrollWidth === window.innerWidth` (aucun débordement
  horizontal de la page).
- [ ] Barre de production d'Item 1 (`vitesse = 125`, manager actif) :
  ```js
  const bar = document.querySelector('.product-gain mat-progress-bar');
  getComputedStyle(bar.querySelector('.mdc-linear-progress__bar')).transitionDuration // '0s'
  bar.getAttribute('aria-valuenow') // '100', stable sur 10 lectures à 100 ms
  ```
  et le chrono à sa droite affiche `00:01`.
- [ ] Barre d'un produit à `vitesse ≥ 400` : user **neuf** (Item 1, `vitesse = 500`, `money = 0`
  → attendre le premier crédit ou éditer `money` dans le JSON, backend arrêté), Acheter x1 puis
  Produire : la première lecture d'`aria-valuenow` après le `getWorld` qui suit la mutation
  (`timeleft` reçu ≈ 500) est `< 20`, puis 10 lectures à 100 ms **croissent** jusqu'à `100` sans
  jamais décroître (au repos la barre reste à 100, D28).
  Chez `lucas`, Item 2 à 6 ont `quantite = 0` (Produire désactivé, D21) et Item 6 tourne en 30 s :
  ne pas s'en servir pour ce critère.
- [ ] Retour à 0 **avec manager** : dans `backend/userworlds/<user-de-test>-world.json` (backend
  arrêté), poser `vitesse: 500`, `managerUnlocked: true`, `timeleft: 500` sur Item 1 et
  `unlocked: true` sur Manager 1, relancer ; 20 lectures d'`aria-valuenow` à 100 ms contiennent
  au moins deux valeurs `< 20` séparées par des valeurs `≥ 60` (chaque cycle repart du début).
- [ ] La barre d'achat (`.product-owned .mdc-linear-progress__bar`) a toujours
  `transitionDuration === '0.25s'` (son animation n'a pas été retirée).
- [ ] `docs/ROADMAP.md` 9.14 cochée, 9.15 ajoutée ; D29 dans `docs/DECISIONS.md` ;
  `frontend/CLAUDE.md` et `CLAUDE.md` à jour.

### Rapport attendu

En fin de tâche : ce qui a été fait (fichiers), comment ça a été vérifié (commandes et
résultats réels, valeurs lues dans le navigateur), ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : recherche web (formats de grands nombres des jeux idle — *Cookie Clicker* écrit les
noms longs « 1.0 quindecillion », la plupart des clones utilisent K/M/B/T puis aa/ab ou la
notation scientifique ; *AdVenture Capitalist* : noms longs abrégés et barre pleine pour les
business trop rapides) et lecture du source de `@angular/material/progress-bar` 22.1
(`transition: transform 250ms` sur `.mdc-linear-progress__bar`, classe `_mat-animation-noopable`
posée par le token `MATERIAL_ANIMATIONS`, `ViewEncapsulation.None`).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Grands nombres | AdCap / Cookie Clicker : noms courts anglais (million, billion… puis aa, ab) ; clones et libs (`swarm-numberformat`) : lettres puis scientifique | Diverge : suffixes SI (k, M, G, T déjà en place, tests écrits ainsi) prolongés P/E/Z/Y puis `1.23e27` | Décision à noter (D29) : cohérent avec l'existant, court, sans limite |
| Longueur du bouton d'achat | AdCap : bouton à largeur fixe, montant seul dessous ; le texte ne déborde jamais | Bouton Material à largeur de contenu ; `nowrap` + nombres ≤ 8 caractères | Reprendre le principe « jamais de retour à la ligne », garder le libellé |
| Barre pour business rapide | AdCap : barre pleine et revenu/s quand le cycle est plus court qu'une frame | Barre pleine sous 4 ticks (400 ms), gain par production conservé (D28) | Reprendre le seuil, ignorer le revenu/s (hors périmètre) |
| Animation de barre | Material : transition 250 ms pensée pour des sauts ponctuels, pas un chrono | Tick 100 ms : transition supprimée sur la barre de production seule | Reprendre l'approche `_mat-animation-noopable` (transition ~0) mais par CSS scopé, pas par le token (ripples) |
| Atteindre le DOM interne Material | Angular : `::ng-deep` déprécié mais toléré, à borner ; tokens CSS quand ils existent | Aucun token pour la transition ; précédent `:host ::ng-deep` dans `tab-bar.css` | Reprendre le précédent, commenté |
| Logique dans un composant présentationnel | Angular : `computed` fin, calcul pur testable à part | `progress` déjà computed ; seuil = fonction pure `productionProgress` | Reprendre (même schéma que `nextUnlock`) |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Les deux causes (suffixe T, transition 250 ms vs tick 100 ms) et le repliement à 125 ms sont expliqués avec le monde `lucas` ; étape 9.14, D29. |
| 2 | Instructions séquencées | 2 | 6 étapes cochables, textes exacts pour roadmap 9.14 / 9.15 et contenu attendu de D29. |
| 3 | Exemples concrets | 2 | 13 valeurs `formatNumber` et 7 valeurs `productionProgress` vérifiées par script (`4.772e21` → `4.77 Z`, `1e27` → `1.00e27`), libellés réels du bouton chez `lucas`. |
| 4 | Structure lisible | 2 | Sections du gabarit, A / B / C par fichier, tableaux pour les valeurs. |
| 5 | Rôle et périmètre | 2 | Frontend seul, fichiers interdits nommés, hors périmètre listé (revenu/s, `R`/`Q`, arrondi `1000.00 k`, tick). |
| 6 | Critères mesurables | 2 | Expressions JS (`top` < 1 px, `transitionDuration` `'0s'` / `'0.25s'`, `aria-valuenow` lu 10 fois, `scrollWidth`), tests nommés, deux viewports. |
| 7 | Pourquoi des contraintes | 2 | Seuil 400 = 4 ticks, `::ng-deep` vs `MATERIAL_ANIMATIONS` (ripples), `flex: 0 0 auto` (repli interne du libellé), `+` retiré de `toExponential`, spécificité du sélecteur. |
| 8 | Raisonnement guidé | 1 | Plan demandé avant de coder et lecture de `tab-bar.css` comme précédent ; mais la tenue à 360 px dépend du rendu réel (repli sur le token de padding prévu, pas prédit). |
| 9 | Format de sortie | 2 | Fichiers, fonction et constante nommées, D29 avec ses points, roadmap, deux `CLAUDE.md`, rapport. |
| 10 | Concision | 1 | Le tableau C et « Cas limites » se recoupent sur le repos / le seuil 400 ; conservé car les cas limites ajoutent le comportement sans manager. |

Historique : v1 15/20 → v2 18/20.

Améliorations retenues (v1 → v2), après relecture contre le monde `lucas` réel :
- Critère 3 (1 → 2) — **exemple faux corrigé** : v1 affirmait que le chrono d'un produit rapide
  sans manager passait « 00:01 → 00:00 quand le serveur crédite » ; or `remainingLabel` affiche
  `vitesse` au repos (D28), donc `00:01` en permanence à 125 ms. Un implémenteur aurait cherché
  un `00:00` qui n'arrive jamais.
- Critère 6 (1 → 2) — **critère impossible remplacé** : v1 demandait d'observer la montée de la
  barre sur Item 2 de `lucas`, dont `quantite = 0` (Produire désactivé, D21) ; remplacé par un
  user neuf (Item 1, 500 ms) et, pour le retour à 0 avec manager, un JSON édité
  (`vitesse: 500`, `managerUnlocked: true`) avec un critère de lecture (deux valeurs `< 20`
  séparées par des `≥ 60`), plus le contrôle `transitionDuration === '0.25s'` de la barre
  d'achat qui détecte un `::ng-deep` trop large.
- Critère 7 (1 → 2) — **justification fausse corrigée** : v1 donnait une spécificité « 0,2,1 »
  au sélecteur `::ng-deep` ; le sélecteur compilé porte deux classes et un attribut (0,3,0). La
  raison de `flex: 0 0 auto; white-space: nowrap` (un bouton qui rétrécit replie son libellé
  sur deux lignes, le montant « descendrait » quand même) a été ajoutée.
