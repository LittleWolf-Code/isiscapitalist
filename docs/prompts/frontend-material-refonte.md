# Prompt — Angular Material et refonte visuelle du front

- Date : 2026-09-19
- Étape roadmap : 9.4 (nouvelle ligne à insérer, voir Étapes)
- Sous-projet : frontend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « rajoute sur la gauche un leftbar avec des
  onglets… » — découpée en deux prompts : celui-ci (Material + refonte) puis
  `frontend-sidebar-tabs.md` (barre latérale, étape 9.5), qui suppose celui-ci terminé.

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, terminé) et `frontend/` (Angular 22.1
standalone + signals, `@apollo-orbit/angular` 3, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur Angular du TP ; le
backend, le schéma GraphQL et `origworld.ts` ne sont pas ton périmètre.

### Objectif

Le front actuel est un « front générique de test » sans design (CSS de 25 lignes, boutons et
tables natifs). On veut en faire un vrai jeu : installer **Angular Material** et refondre
visuellement la page **sans changer son comportement** (mêmes signaux, mêmes mutations, mêmes
règles de désactivation D17, mêmes composants présentationnels). C'est l'étape **9.4** de
`docs/ROADMAP.md` ; l'étape 9.5 (barre latérale à onglets) viendra ensuite et s'appuiera sur
les composants Material posés ici (voir Contraintes).

### À lire avant d'écrire

1. `CLAUDE.md` (racine, règle 8 : « pas de dépendance non prévue sans demander » — ici la
   dépendance est décidée par l'utilisateur, il reste à la documenter) et `frontend/CLAUDE.md`
   (tableau des fichiers, conventions : composants présentationnels, `[disabled]` natif).
2. `docs/DECISIONS.md` — D14 (refetch = source de vérité), D15 (timer local n'anime que
   `timeleft`), D17 (boutons désactivés, mode max) : rien de tout cela ne change.
3. `frontend/src/app/` : `app.ts/.html/.css`, `product-card.ts/.html`, `palier-list.ts/.html`,
   `game.service.ts` (à ne pas modifier), et les specs `app.spec.ts`, `product-card.spec.ts`,
   `palier-list.spec.ts` (elles restent vertes, adaptées si besoin aux nouveaux sélecteurs).
4. `frontend/angular.json` (`styles: ["src/styles.css"]`, budgets), `src/index.html`,
   `src/app/app.config.ts`.
5. Doc Material : https://material.angular.dev/guide/getting-started et
   https://material.angular.dev/guide/theming — depuis Material 20, `ng add` n'installe plus de
   thème prebuilt mais génère un thème `mat.theme()` en **SCSS** ; vérifier ce que le schematic
   fait réellement d'un projet en CSS pur (renommage `styles.css` → `styles.scss` ?) et t'y adapter.

### Comportement attendu

Même page, mêmes zones, habillées Material :

| Zone | Aujourd'hui | Après |
|---|---|---|
| Bandeau | `<header class="topbar">` : champ user, money/score/anges, radios x1/x10/x100/max, Reset | `mat-toolbar` : `mat-form-field` + `matInput` pour le user, les 4 valeurs en texte, `mat-button-toggle-group` (x1 / x10 / x100 / max, `[value]` piloté par `game.multiplier()`), bouton Reset `mat-stroked-button` |
| Bandeau d'erreur | `<div class="alert" role="alert">` cliquable | Même élément, stylé avec les tokens du thème (`var(--mat-sys-error-container)` / `var(--mat-sys-on-error-container)`), toujours `role="alert"` et cliquable pour effacer |
| Produit | `<div class="product">` + `<progress>` + 2 `<button>` | `mat-card` (l'`<img>` actuelle en `mat-card-avatar`, nom en titre, `id` en sous-titre), stats en texte, `mat-progress-bar mode="determinate"` (`[value]` = progression en %), `mat-chip` « manager » à la place du `.badge`, `mat-card-actions` avec `Produire` (`mat-button`) et `Acheter x{{q}} — {{coût}}` (`mat-flat-button`, `[disabled]="!canBuy()"`) |
| Paliers | `<table>` native | `mat-table` (colonnes name / seuil / idcible / ratio / typeratio / unlocked / action), bouton d'action `mat-button` avec le même `[disabled]="isDisabled(palier)"` ; ligne débloquée toujours marquée (`class.unlocked`) |
| Mise en page | flex `main` 2 colonnes | Identique (produits à gauche, listes à droite), largeur max 1400 px centrée ; les colonnes passent l'une sous l'autre sous 900 px |

Le texte des boutons ne change pas (`Produire`, `Acheter x10 — 55.27`, `Engager`, `Acheter`,
`Reset`) : les specs existantes et la vérification de 9.3 s'appuient dessus.

### Cas limites

- **Icônes Material Symbols** : la police vient de Google Fonts (`index.html` modifié par
  `ng add`) ; hors ligne les `mat-icon` sont vides. Acceptable pour un TP, mais aucune information
  ne doit passer **uniquement** par une icône (toujours un libellé texte à côté).
- **`mat-button-toggle-group` et la valeur `'max'`** : `Multiplier = 1 | 10 | 100 | 'max'` mélange
  nombres et chaîne ; `(change)` renvoie `$event.value` tel que fourni au `[value]` du toggle, donc
  pas de conversion — vérifier avec un `console.log` temporaire que `game.multiplier()` reçoit bien
  `10` (number) et non `'10'`, puis retirer le log.
- **Progress bar** : `mat-progress-bar` attend un pourcentage 0-100, `<progress>` recevait des ms.
  `progress()` devient `100 × (vitesse − timeleft) / vitesse` (borné 0-100, et 0 si `vitesse`
  vaut 0).
- **`app.spec.ts`** stubbe `GameService` : il doit continuer à passer sans serveur ; les composants
  Material n'ont pas besoin de provider d'animations (animations CSS depuis Material 19) — ne pas
  ajouter `@angular/animations` ni `provideAnimations` sauf si `ng add` l'exige, et le noter.
- **Erreur au chargement** (backend arrêté) : le bandeau d'erreur s'affiche même sans monde,
  comme aujourd'hui.

### Contraintes (et pourquoi)

- **Aucune modification de `backend/`, du schéma, de `game.service.ts`, de `game-math.ts`** : la
  refonte est purement visuelle ; si tu crois devoir toucher à la logique, c'est que la structure
  Material choisie est mauvaise.
- `ProductCard` et `PalierList` restent **présentationnels** (`input()` / `output()`, aucune
  injection) : c'est ce qui permet de les tester avec `TestBed` sans serveur, et 9.5 les réutilisera
  dans des panneaux.
- Désactivation toujours par `[disabled]` natif sur les boutons Material (D17) — les tests lisent
  l'attribut `disabled`.
- **Un fichier de style par composant** (`product-card.css`, `palier-list.css`, `app.css`) et
  `App` repasse en encapsulation par défaut (retirer `ViewEncapsulation.None`) : l'encapsulation
  désactivée était une facilité du front de test ; avec Material, un style global fuiterait dans
  les composants de la lib.
- Ajouter la dépendance via `ng add @angular/material` (pas `npm install` à la main) : c'est le
  schematic qui pose le thème, la police Roboto, les Material Symbols et les styles globaux
  (`html, body { height: 100% }`, `margin: 0`).
- Ne pas installer `@angular/cdk` séparément ni une autre version que celle tirée par `ng add`
  (Material 22.1.x pour Angular 22.1.x — une désynchronisation majeure casse le build).
- Importer **module par module** dans chaque composant (`MatCardModule`, `MatButtonModule`…),
  pas de barrel « MaterialModule » : standalone + tree-shaking.

### Hors périmètre

- Pas de barre latérale, pas d'onglets, pas de déplacement du bouton Reset ni de la liste
  « All unlocks » : c'est 9.5.
- Pas de `MatSnackBar` pour les erreurs, pas de `MatDialog` pour le reset (`confirm()` natif reste).
- Pas de thème sombre, pas de sélecteur de thème, pas de personnalisation de palette au-delà de ce
  que `ng add` génère.
- Pas de nouveau champ affiché, pas de formule modifiée, pas de changement de `formatNumber`.
- Pas de routing.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche > 3 fichiers : écrire un plan en 5-8 lignes
   (composants Material par zone, fichiers de style créés, ce que `ng add` a modifié) et le
   montrer avant de coder.
2. Dans `frontend/` : `ng add @angular/material` (accepter les valeurs proposées ; si un choix
   de palette est demandé, prendre la première). Lister exactement les fichiers modifiés par le
   schematic (`git status`) et relire `angular.json`, `index.html`, `styles.*`.
3. `app.ts/.html/.css` : toolbar, form-field user, button-toggle multiplicateur, bouton Reset,
   bandeau d'erreur, mise en page ; retirer `ViewEncapsulation.None`.
4. `product-card.ts/.html` + nouveau `product-card.css` : `mat-card`, `mat-progress-bar`
   (adapter `progress()` en %), `mat-chip`, boutons Material ; `styleUrl` ajouté.
5. `palier-list.ts/.html` + nouveau `palier-list.css` : `mat-table` avec `displayedColumns`
   dépendant de `actionLabel()` (colonne action absente pour *All unlocks*).
6. Tests : adapter les sélecteurs des specs existantes (`button` reste valide sur les boutons
   Material ; pour les cellules, chercher par texte plutôt que par `td`) ; ajouter dans
   `product-card.spec.ts` un cas `progress()` : `vitesse 1000, timeleft 250 → 75`.
7. Docs :
   - `docs/DECISIONS.md` : entrée `## D18 — Frontend : Angular Material comme bibliothèque de
     composants` (format D14-D17) : contexte (front de test sans design, sujet frontend toujours
     absent, choix de l'utilisateur malgré la règle 8), décision (dépendance ajoutée via `ng add`,
     version exacte, ce que le schematic a modifié : thème SCSS ou CSS, polices), conséquences
     (police et icônes chargées depuis Google Fonts ; un fichier de style par composant ;
     encapsulation par défaut).
   - `frontend/CLAUDE.md` : section Stack (+ Angular Material 22.1.x, thème dans `styles.*`),
     tableau des fichiers (`product-card.css`, `palier-list.css`, `app.css` : rôle), conventions
     (retirer « sans design » ; ajouter « import Material module par module ; `[disabled]`
     natif »).
   - `docs/ROADMAP.md` : insérer `- [x] 9.4 Angular Material et refonte visuelle (D18)` après 9.3
     et renuméroter la ligne « à compléter » en 9.5.
   - `CLAUDE.md` (racine), « État actuel » : remplacer « sans design » par une phrase sur 9.4.
8. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `npm run build` sans erreur dans `frontend/` (warnings listés dans le rapport, en
  particulier tout dépassement de budget `anyComponentStyle` / `initial` d'`angular.json` : le
  relever, ne pas augmenter les budgets sans le dire).
- [ ] `npm test` vert : `game-math.spec.ts`, `product-card.spec.ts`, `palier-list.spec.ts`,
  `app.spec.ts`.
- [ ] Backend lancé avec la configuration `backend` de `.claude/launch.json`, frontend avec
  `frontend` (jamais via Bash). Sur http://localhost:4200, utilisateur **neuf**
  (`test-mat-<timestamp>`) :
  - [ ] `mat-toolbar`, 6 `mat-card`, 4 `mat-table` présents (lire le DOM, pas seulement la capture).
  - [ ] `money 0` : les 6 boutons Acheter ont l'attribut `disabled`, les 6 Produire non ; tous les
    boutons Engager / Acheter des paliers `disabled`.
  - [ ] Clic sur Produire (Item 1) : la `mat-progress-bar` progresse de 0 à 100 % puis, au poll
    suivant, `money 1.00`.
  - [ ] Basculer le toggle sur `max` puis `x10` : `game.multiplier()` vaut `'max'` puis `10`
    (number) — le libellé du bouton Acheter d'Item 1 passe à `Acheter x0 — 0.00` puis
    `Acheter x10 — 55.27`.
  - [ ] Éditer `backend/userworlds/test-mat-<timestamp>-world.json` (`"money": 1000`), recharger :
    Manager 1 (`seuil 1000`) actif, Manager 2 `disabled`, Angel Upgrade 1 `disabled`
    (`activeangels 0`) ; clic Engager Manager 1 → ligne marquée `unlocked`, chip « manager » sur
    Item 1, bouton `disabled`.
  - [ ] Aucune erreur dans la console navigateur.
  - [ ] Largeur 800 px : les listes passent sous les produits, pas de défilement horizontal.
- [ ] Deux captures d'écran (desktop, 800 px) jointes au rapport.

### Rapport attendu

En fin de tâche : fichiers créés/modifiés (dont ceux touchés par `ng add`), version exacte de
`@angular/material` installée, commandes lancées avec leurs résultats réels (build, tests), les
captures, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Tableau commun aux deux prompts (même analyse) ; les lignes « sidebar » servent surtout à
`frontend-sidebar-tabs.md`.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Installation Material | `ng add @angular/material` : dépendances, Roboto + Material Symbols dans `index.html`, styles globaux ; depuis Material 20 le schematic génère un thème `mat.theme()` en SCSS (plus de choix de thème prebuilt) | Projet en CSS pur (`styles.css`) : le résultat du schematic sur un projet CSS n'est pas documenté | reprendre `ng add`, constater et noter dans **D18** (règle 8 : dépendance non prévue par le sujet) |
| Animations | Depuis Material 19, animations en CSS ; `@angular/animations` facultatif | Ne rien ajouter sauf exigence du schematic | reprendre |
| Style par composant | Angular : `styleUrl` par composant, encapsulation émulée | `app.css` global avec `ViewEncapsulation.None` (facilité du front de test) | diverge aujourd'hui → aligner (un CSS par composant) |
| Navigation latérale | `mat-sidenav-container` > `mat-sidenav` (mode side) + `mat-nav-list`, items `routerLink` ; contenu dans `mat-sidenav-content` | Page unique sans routeur (poll `getWorld` global, un seul `App`) : onglet actif = signal + localStorage, pas de `routerLink` | diverge (pas de routing) → **D19** |
| Sous-onglets | `mat-tab-group` | Onglet Anges : Reset / Bonus | reprendre |
| Écran anges (AdVenture Capitalist) | Onglet « Investors » : anges à réclamer, bonus % par ange, bouton « Claim » avec confirmation ; angel upgrades dans un onglet séparé ; pastille sur l'onglet quand des anges sont réclamables | Sous-onglet Reset : anges gagnables (formule backend recalculée côté client, aucune query ne l'expose), actifs/total, score, Reset `confirm()` ; sous-onglet Bonus ; badge `matBadge` sur l'onglet Anges | reprendre (badge inclus, formule dupliquée → D19) |
| Tests Material | Component harnesses (`MatTabGroupHarness`, `MatButtonToggleGroupHarness`) via `TestbedHarnessEnvironment` | Specs TestBed existantes lisent le DOM (`button`, `disabled`) | reprendre le DOM pour l'existant ; harness pour les onglets (9.5) |
| Persistance des préférences UI | localStorage, clé par préférence | Même mécanisme que `isiscapitalist.user` | reprendre (`isiscapitalist.tab`) |

Sources : [Getting started — Angular Material](https://material.angular.dev/guide/getting-started),
[Theming — Angular Material](https://material.angular.dev/guide/theming),
[Angel Investors — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Angel_Investors),
[Angel/Hard Reset — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Angel/Hard_Reset),
[Tabs API — Angular Material](https://material.angular.dev/components/tabs/api).

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Front de test → vrai jeu, « sans changer le comportement », 9.4 nommée, lien avec 9.5 expliqué. |
| 2 | Instructions séquencées | 2 | 8 étapes : `ng add` → app → card → list → tests → docs → vérif, chacune cochable. |
| 3 | Exemples concrets | 2 | v1 = 1 (tableau zone par zone mais aucune valeur) ; v2 : `progress()` `1000/250 → 75`, libellés `Acheter x0 — 0.00` / `x10 — 55.27`, `money 1.00` après une production. |
| 4 | Structure lisible | 2 | Tableau avant/après par zone ; contraintes une par ligne ; sections du gabarit. |
| 5 | Rôle et périmètre | 2 | Dev Angular ; `game.service.ts` / `game-math.ts` / backend exclus ; hors périmètre liste ce que 9.5 fera (barre, Reset déplacé) et ce qu'on ne fait pas (snackbar, dialog, thème sombre, routing). |
| 6 | Critères de succès mesurables | 2 | Attribut `disabled` sur des boutons nommés, `game.multiplier()` typé number, chip après Engager, largeur 800 px sans défilement, captures. |
| 7 | Pourquoi des contraintes | 2 | Encapsulation (fuite de style dans la lib), `ng add` vs `npm install` (schematic), version CDK, module par module (tree-shaking), présentationnel (TestBed + 9.5). |
| 8 | Raisonnement guidé | 2 | Plan avant code ; `git status` après `ng add` pour constater ce que le schematic a fait ; `console.log` temporaire pour le type du toggle. |
| 9 | Format de sortie | 2 | Fichiers créés nommés, contenu de D18, lignes de `frontend/CLAUDE.md` et ROADMAP, rapport avec version exacte. |
| 10 | Concision / contradictions | 0 → 1 | v1 : « les colonnes passent l'une sous l'autre sous 900 px » (comportement) vs vérification « largeur 800 px » — cohérent mais deux nombres ; une phrase répétée sur les présentationnels (contraintes + objectif). v2 : la mention dans l'objectif renvoie à la contrainte au lieu de la répéter. Reste la redondance assumée tableau ↔ vérification. |

Historique : v1 16/20 → v2 18/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 3 : valeurs chiffrées ajoutées (`progress()` 75, libellés attendus du bouton Acheter,
  `money 1.00`) au lieu de descriptions qualitatives ;
- critère 10 : suppression d'une répétition sur les composants présentationnels ; alignement de
  la vérification responsive sur le seuil annoncé (800 px < 900 px, un seul seuil de rupture).
