# Prompt — Barre du bas pleine largeur + bouton Acheter à droite de la carte

- Date : 2026-09-19
- Étape roadmap : 9.11 (nouvelle ligne à insérer, voir Étapes) — suppose 9.10 (D24, en-tête
  maison de la carte, `product-card-thick-bars-header-unlock.md`) déjà dans le code, sa doc
  étant finie par une autre session
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « fais en sorte que la bottom bar prend toute
  la largeur, et aussi sur les cases de produit fais en sorte que acheter soit à droite du carré »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette feature touche **deux composants présentationnels** (`TabBar`, `ProductCard`) et la
documentation — rien dans `backend/`, rien dans `game.service.ts`, `game-math.ts` ni `app.*`.

### Objectif

Deux retouches de mise en page, **aucune règle de jeu, aucune donnée, aucun comportement
nouveau** :

1. **Barre d'onglets du bas** (`TabBar`) : les 6 onglets (Produits, Managers, Upgrades, Anges,
   Unlocks, Paramètres) sont aujourd'hui tassés à gauche (`mat-stretch-tabs="false"`, ~500 px
   occupés sur une fenêtre de 1024 px, le reste de la barre est vide). Ils doivent **se partager
   toute la largeur à parts égales** (1/6 chacun), comme la barre d'onglets d'un jeu mobile.
2. **Carte produit** (`ProductCard`) : la ligne d'actions place Produire et Acheter côte à côte
   à gauche. **Acheter doit être collé au bord droit de la carte**, Produire / Arrêter /
   Reprendre restant à gauche, les deux gardant leur largeur naturelle.

C'est l'étape **9.11** de `docs/ROADMAP.md`, décision **D25** dans `docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — lignes `tab-bar` et `product-card` du
   tableau des fichiers ; conventions : composants présentationnels, un `.css` par composant
   qui ne porte **que la mise en page**, couleurs uniquement via `var(--mat-sys-…)` (D22).
2. `docs/DECISIONS.md` — D22 (barre en bas, `mat-tab-nav-bar`, cadre de l'onglet actif dans
   `styles.css`), D17 / D20 / D21 (les deux boutons de la carte : libellés, `[disabled]` — **ne
   pas y toucher**), D23 / D24 (en-tête et barres de la carte — ne pas y toucher). **D20 existe
   deux fois, ne pas renuméroter.** D24 est peut-être encore absent (écrit par une session
   parallèle) : écrire D25 quand même, ne pas écrire D24.
3. `frontend/src/app/tab-bar.html` / `.css` / `.spec.ts` — état actuel : `nav mat-tab-nav-bar
   class="bar" mat-stretch-tabs="false"`, `.tab { min-width: 72px }` (pour que les 6 tiennent
   à 800 px sans pagination), pastille `matBadge` recentrée au-dessus du libellé Anges par
   `::ng-deep`.
4. `frontend/src/app/product-card.html` / `.css` / `.spec.ts` — état actuel : `mat-card-actions`
   avec deux boutons (`matButton` production, `matButton="filled"` Acheter), seule règle CSS
   `mat-card-actions { gap: 0.5rem; }`. Dans le spec, les boutons sont trouvés par
   `querySelectorAll('mat-card-actions button')` (le premier = production) et par leur texte.
5. `frontend/src/app/app.css` — `.product-grid` en `minmax(320px, 1fr)` : à 1024 px de large,
   3 cartes de ~322 px ; la ligne d'actions dispose d'environ 300 px utiles (padding 8 px de
   `mat-card-actions`, bordure de la carte).
6. `frontend/src/styles.css` — règle globale `.mat-mdc-tab-link.mdc-tab--active { box-shadow:
   inset … }` : le cadre de l'onglet actif suivra la nouvelle largeur sans modification.

### Comportement attendu

**Barre du bas** (`tab-bar.html` + `tab-bar.css`).

- Retirer `mat-stretch-tabs="false"` du `nav` : la valeur par défaut de Material est `true`,
  elle pose la classe `mat-mdc-tab-nav-bar-stretch-tabs` qui donne `flex-grow: 1` à chaque
  `.mat-mdc-tab-link`.
- Ce seul `flex-grow` ne fait **pas** des parts égales : la base de chaque onglet reste sa
  largeur naturelle (aujourd'hui 83 / 83 / 83 / 72 / 77 / 96 px), donc Paramètres resterait
  24 px plus large qu'Anges. Ajouter `flex-basis: 0` à `.tab` dans `tab-bar.css` (commentaire :
  « parts égales : base nulle + flex-grow de Material »). Cette règle l'emporte sur le
  `.mdc-tab { flex: 1 0 auto }` de Material grâce à l'attribut d'encapsulation émulée
  (`.tab[_ngcontent-…]`), exactement comme le `min-width: 72px` déjà en place. Garder ce
  `min-width: 72px` : en dessous de ~450 px de large, Material affiche sa pagination `<` `>` —
  comportement voulu, pas de code spécifique.
- Rien d'autre ne change : libellés, `data-tab`, pastille Anges (centrée au-dessus du libellé
  par `left: 50%`, elle suit l'onglet élargi), cadre de l'onglet actif, `onClick`.

**Carte produit** (`product-card.html` + `product-card.css`).

- Donner `class="buy"` au bouton Acheter (accroche CSS ; aucun autre changement de template).
- `mat-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }` et `.buy { margin-left:
  auto; }`. Pourquoi `margin-left: auto` plutôt que `justify-content: space-between` : quand la
  carte est trop étroite et qu'Acheter passe seul à la ligne suivante, `space-between` le
  ramènerait **à gauche** (seul élément de sa ligne) alors que la marge automatique le garde
  **à droite** dans les deux cas. `mat-card-actions` est déjà `display: flex; align-items:
  center; padding: 8px` côté Material (`align="end"` n'existe que pour tout aligner à droite,
  inutile ici).
- Les deux boutons gardent leur largeur naturelle, leurs libellés, `[disabled]`, `(click)`.

**Exemple chiffré** (fenêtre 1024 px de large, user neuf, onglet Produits) :

| Élément | Avant | Après |
|---|---|---|
| Largeur des 6 `a.tab` | 83.5 / 83.5 / 83.5 / 72 / 77 / 96 px, groupe à gauche | ~170.7 px chacun (1024 / 6, ±1 px), somme = largeur de `.mat-mdc-tab-links` |
| Carte Item 1, ligne d'actions | `[Produire] [Acheter x1 — 4.28]` collés à gauche | `[Produire]` bord gauche … `[Acheter x1 — 4.28]` bord droit (bord droit du bouton = bord droit de `mat-card-actions` − 8 px) |
| Multiplicateur x100, carte ~322 px | `[Produire] [Acheter x100 — 103.68 k]` | même chose, Acheter à droite ; s'il ne tient pas, il passe **seul** sur une 2ᵉ ligne, toujours au bord droit |

### Cas limites

- Fenêtre < ~450 px : 6 × 72 px ne tiennent plus → pagination Material (flèches), onglets à
  72 px minimum, pas d'étirement négatif ; aucune règle à ajouter.
- Onglet Anges avec pastille (`angelsEarned > 0`) : la pastille reste centrée au-dessus de
  « Anges », pas décalée par l'élargissement.
- Carte avec manager en pause (`Reprendre`, bouton plus large) + multiplicateur `max` (libellé
  « Acheter x37 — 1.2 M ») à 320 px : si la somme dépasse la ligne, Acheter passe à la ligne
  suivante, aligné à droite ; Produire / Reprendre ne bouge pas.
- Acheter désactivé (`canBuy() = false`, D17) : même position, seul l'état change.
- `prefers-reduced-motion` : rien à faire, aucune animation ajoutée.

### Contraintes (et pourquoi)

- **`flex-basis: 0` dans `tab-bar.css`, pas dans `styles.css`** : la règle est de la mise en
  page propre à `TabBar`, et `styles.css` ne porte que la peau (D22).
- **Aucune couleur, aucun token de couleur** touché : les deux changements sont de la
  disposition pure ; si on modifie `material-theme.scss`, on est sorti du périmètre.
- **`tab-bar.ts` et `product-card.ts` ne changent pas** : la feature est template + CSS. Un
  changement de `.ts` est le signal qu'on a mal compris la demande.
- **Ne pas remplacer `min-width: 72px`** ni ajouter de media query : la pagination Material
  est le repli accepté pour les petites largeurs.
- Adapter les tests, ne pas les supprimer, et en ajouter un par composant : `tab-bar.spec.ts`
  vérifie que le `nav` porte la classe `mat-mdc-tab-nav-bar-stretch-tabs` (la classe est liée
  à l'input `stretchTabs`, jsdom la rend) ; `product-card.spec.ts` vérifie que le bouton
  contenant « Acheter » porte la classe `buy` et reste le **second** bouton de
  `mat-card-actions` (les tests existants comptent sur l'ordre). Les largeurs et alignements
  ne se testent pas en jsdom : ils se vérifient dans le navigateur (section Vérification).
- Ne pas modifier `frontend/src/app/graphql/types.ts` / `operations.ts` (générés).

### Hors périmètre

- La barre du haut (`mat-toolbar`), les stats, le multiplicateur.
- L'en-tête de la carte, les barres 16 px, la barre d'achat (D24) : rien ne bouge au-dessus de
  `mat-card-actions`.
- Les libellés, l'ordre et l'état désactivé des boutons (D17 / D20 / D21).
- Les onglets eux-mêmes (nombre, ordre, libellés, `Tab`), la pastille, le cadre actif.
- `PalierList`, `UnlockList`, `AngelsPanel`, `SettingsPanel`, le backend.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche 4 fichiers de code + 2 specs + 4 fichiers de
   doc : écrire un plan en 5 lignes (attribut retiré, 2 règles CSS, 2 tests) et le montrer avant
   de coder.
2. `tab-bar.html` : retirer `mat-stretch-tabs="false"`. `tab-bar.css` : `flex-basis: 0` sur
   `.tab`, mettre à jour le commentaire des marges réduites (il mentionne la tenue à 800 px).
3. `product-card.html` : `class="buy"` sur Acheter. `product-card.css` : règle
   `mat-card-actions` (wrap + gap) et `.buy { margin-left: auto }`, avec le commentaire
   expliquant le choix de la marge automatique.
4. Specs : un test ajouté dans chaque spec (voir Contraintes) ; lancer `npm test`.
5. Vérifier (section suivante) à 1024 px, puis en fenêtre étroite (`resize_window`).
6. Documentation :
   - `docs/ROADMAP.md` : la ligne 9.10 est réservée à la session parallèle. Insérer
     `- [x] 9.11 Barre du bas pleine largeur (onglets à parts égales) + Acheter au bord droit de
     la carte (D25)` juste avant la ligne « … (à compléter quand `frontend.pdf` sera
     disponible) » et renuméroter celle-ci en 9.12. Si aucune ligne 9.10 cochée n'existe encore,
     insérer avant la 9.11 une ligne `- [ ] 9.10 Carte produit : barres 16 px, barre d'achat dans
     l'en-tête (D24) — en cours` sans la cocher.
   - `docs/DECISIONS.md` : ajouter **D25** en fin de fichier (contexte / décision /
     conséquences : `flex-basis: 0` en plus du stretch Material, `margin-left: auto` plutôt que
     `space-between`, pagination conservée en étroit). Ne pas écrire D24.
   - `frontend/CLAUDE.md` : lignes `tab-bar` (stretch, parts égales) et `product-card` (Acheter
     `.buy` au bord droit, retour à la ligne) du tableau ; `CLAUDE.md` racine : une phrase
     « Depuis 9.11, … » dans l'état actuel.

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning nouveau.
- [ ] `cd frontend && npm test` vert, `tab-bar.spec.ts` et `product-card.spec.ts` compris
      (2 tests ajoutés).
- [ ] Serveurs lancés via les configurations `backend` et `frontend` de `.claude/launch.json`
      (jamais Bash ; s'ils tournent déjà sur 3000 / 4200, naviguer simplement vers
      `http://localhost:4200`), user jetable (ex. `verif-911`), fenêtre à 1024 px de large :
  - `document.querySelector('nav.bar').classList.contains('mat-mdc-tab-nav-bar-stretch-tabs')`
    → `true`.
  - `[...document.querySelectorAll('a.tab')].map(a => a.getBoundingClientRect().width)` → 6
    valeurs égales à ±1 px, dont la somme vaut la largeur de `.mat-mdc-tab-links` à ±2 px.
  - Onglet Produits, carte Item 1 : avec `a = document.querySelector('mat-card-actions')`,
    `b = a.querySelector('.buy')`, `p = a.querySelector('button')` :
    `Math.abs(b.getBoundingClientRect().right - (a.getBoundingClientRect().right - 8)) <= 1`
    et `Math.abs(p.getBoundingClientRect().left - (a.getBoundingClientRect().left + 8)) <= 1`
    (Acheter au bord droit, Produire au bord gauche), `Math.abs(p.getBoundingClientRect().top -
    b.getBoundingClientRect().top) <= 1` (même ligne).
- [ ] `resize_window` à 360 px de large, multiplicateur x100 (libellé le plus long) : si Acheter
      ne tient plus sur la ligne de Produire, `b.top > p.top` et le critère « bord droit − 8 px »
      tient toujours ; aucun débordement horizontal (`document.documentElement.scrollWidth ===
      innerWidth`). La barre du bas montre les flèches de pagination ; aucun onglet sous 72 px.
- [ ] Onglet Anges après `"score": 1000000` dans le JSON du user (pastille visible) : le centre
      horizontal de `.mat-badge-content` est à ±2 px du centre de `.tab-label` d'Anges.
- [ ] Capture d'écran de l'onglet Produits à 1024 px (barre pleine largeur + Acheter à droite)
      et à 360 px (retour à la ligne + pagination).
- [ ] `docs/ROADMAP.md` (9.11 cochée, 9.12 = placeholder), `docs/DECISIONS.md` (D25),
      `frontend/CLAUDE.md`, `CLAUDE.md` mis à jour.

### Rapport attendu

En fin de tâche : fichiers modifiés, commandes lancées avec leurs résultats réels (build, tests,
valeurs mesurées dans le navigateur, captures), ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : code installé (`frontend/node_modules/@angular/material/fesm2022/tabs.mjs` :
`stretchTabs = true` par défaut, classe `mat-mdc-tab-nav-bar-stretch-tabs` → `.mat-mdc-tab-link
{ flex-grow: 1 }` ; `fesm2022/card.mjs` : `mat-mdc-card-actions { display: flex; padding: 8px }`,
seule variante `align-end`), observation de l'app à 1024 px (6 onglets sur ~500 px) ;
AdVenture Capitalist et jeux idle mobiles de mémoire (pas de source ouverte). Pas de recherche
web : les questions étaient tranchées par le code installé.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Barre d'onglets d'un jeu / app mobile | Onglets étirés sur toute la largeur (M3 navigation bar, AdCap) | Tassés à gauche (`mat-stretch-tabs="false"`, posé en 9.8 pour éviter la pagination à 800 px) | reprendre le stretch Material → D25 |
| « Parts égales » | Material stretch = `flex-grow: 1` sur base naturelle (largeurs inégales) | Demande = 1/6 chacun | diverge : `flex-basis: 0` en plus, dans le CSS du composant |
| Petites largeurs | Material : pagination automatique du `mat-tab-nav-bar` | Idem, `min-width: 72px` conservé | reprendre, rien à coder |
| Bouton d'achat dans un jeu idle | AdCap : bouton Buy à droite de la ligne du business, séparé du reste | Produire et Acheter collés à gauche | reprendre : Acheter au bord droit |
| Alignement `mat-card-actions` | Material : `align="start"` / `align="end"` seulement | Besoin de gauche **et** droite | diverge du mixin : `margin-left: auto` sur `.buy` (tient au retour à la ligne, contrairement à `space-between`) |
| Tests Angular | TestBed, jsdom sans layout | Specs existants | tests de classes (`stretch-tabs`, `buy`), géométrie vérifiée en navigateur |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Avant / après décrits avec les mesures actuelles (~500 px sur 1024), étape 9.11, D25. |
| 2 | Instructions séquencées | 2 | 6 étapes cochables ; doc avec textes exacts à insérer, y compris le cas 9.10 absent. |
| 3 | Exemples concrets | 2 | Tableau avant / après chiffré (largeurs d'onglets, position du bouton, cas x100). |
| 4 | Structure lisible | 2 | Sections du gabarit, un bloc par composant. |
| 5 | Rôle et périmètre | 2 | Deux composants nommés, `.ts` intouchés, hors périmètre listé (toolbar, en-tête D24, boutons). |
| 6 | Critères mesurables | 2 | Expressions JS avec tolérances (±1 px, −8 px), classe attendue, `scrollWidth`. |
| 7 | Pourquoi des contraintes | 2 | `flex-basis: 0` (base naturelle inégale), `margin-left: auto` vs `space-between` (retour à la ligne), `min-width` gardé (pagination). |
| 8 | Raisonnement guidé | 1 | Plan demandé avant de coder ; mais le seuil exact de retour à la ligne à 360 px n'est pas prédit, l'implémenteur doit le constater (« si Acheter ne tient plus »). |
| 9 | Format de sortie | 2 | Fichiers, D25, roadmap 9.11 / 9.12 avec la règle pour 9.10, rapport. |
| 10 | Concision | 1 | Le bloc « Comportement attendu » répète en partie « Contraintes » (`flex-basis`, `margin-left`) ; conservé car chacun répond à une question différente (quoi / pourquoi ne pas faire autrement). |

Historique : v1 16/20 → v2 18/20.

Améliorations retenues (v1 → v2) :
- Critère 6 (1 → 2) : les vérifications « Acheter est à droite » et « onglets de même largeur »
  sont passées d'adjectifs à des expressions `getBoundingClientRect` avec tolérance, plus le
  contrôle de non-débordement horizontal en étroit.
- Critère 7 (1 → 2) : ajout de la raison du `flex-basis: 0` (le stretch Material seul laisse
  Paramètres 24 px plus large qu'Anges) et du `margin-left: auto` (le `space-between` ramène
  Acheter à gauche quand il est seul sur sa ligne) — sans cela un implémenteur aurait
  légitimement retenu le stretch seul ou `space-between`.
- Critère 2 : règle déterministe pour la roadmap quand la ligne 9.10 de la session parallèle
  n'est pas encore écrite (v1 disait « après 9.10 », ambigu si 9.10 est absente).
