# Prompt — Carte produit : barres épaisses + barre d'unlock dans l'en-tête

- Date : 2026-09-19
- Étape roadmap : 9.10 (nouvelle ligne à insérer, voir Étapes) — suppose 9.9 terminée
  (`product-card-declutter-unlock-page.md`)
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « sur la page produit fais les barres de
  progression plus grosses et mets la barre d'unlock à droite de l'icône de l'item en dessous du
  nom de l'item »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette feature ne touche que le composant `ProductCard` (4 fichiers) et la documentation — rien
dans `backend/`, rien dans les autres composants.

### Objectif

Sur l'onglet Produits, chaque carte a deux `mat-progress-bar` de 4 px (hauteur Material par
défaut) : la **barre d'achat** « quantite / seuil du prochain palier » (D23) et la **barre de
production**. Elles sont trop discrètes pour un jeu, et la barre d'achat est perdue au milieu de
la carte alors que dans AdVenture Capitalist le compteur d'exemplaires est collé à l'icône du
business. Deux changements d'affichage, **aucune règle de jeu ni donnée nouvelle** :

1. Les **deux barres** de la carte passent à **16 px** de hauteur.
2. La **barre d'achat** monte dans l'en-tête de la carte : à droite de l'icône, **sous le nom**
   du produit, avec le texte « 1 / 25 » **centré à l'intérieur** de la barre. L'icône passe à
   64 px pour couvrir les deux lignes (nom + barre).

C'est l'étape **9.10** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — ligne `product-card` du tableau des fichiers,
   conventions (composant présentationnel, couleurs par tokens `var(--mat-sys-…)` uniquement,
   le CSS de composant ne porte que la mise en page).
2. `docs/DECISIONS.md` — D22 (thème monochrome : aucune couleur en dur, `material-theme.scss`
   seul fichier de couleurs), D23 (barre d'achat : `nextUnlock`, `ownedProgress`, texte
   « quantite / seuil » ou quantité seule — **la logique ne change pas, seule sa place change**),
   D17 / D20 / D21 (boutons : ne pas y toucher). **D20 existe deux fois, ne pas renuméroter** :
   la nouvelle entrée sera D24.
3. `frontend/src/app/product-card.html` / `.css` / `.ts` / `.spec.ts` — état actuel : header
   Material (`mat-card-header` avec `img mat-card-avatar`, `mat-card-title`, chip manager
   `.manager` en `margin-left: auto`), puis dans `mat-card-content` les stats, le bloc
   `.product-owned` (barre + `span.muted`) et le bloc `.product-progress`. Dans le spec :
   `ownedBar()` sélectionne la barre par son `aria-label`, deux tests lisent
   `.product-owned .muted`.
4. `frontend/src/material-theme.scss` (l. ~105) — `mat.progress-bar-overrides` fixe déjà
   `track-color` / `active-indicator-color` ; on n'y ajoute **rien** (voir Contraintes).
5. `frontend/src/app/app.css` — `.product-grid` en colonnes `minmax(320px, 1fr)` : la carte la
   plus étroite fait 320 px, la colonne nom + barre disposera d'environ 210 px.
6. `frontend/src/styles.css` — `app-root.crt-glow { text-shadow: 0 0 0.35rem currentColor }` :
   le halo s'applique aussi au texte dans la barre, à vérifier avec le réglage activé.

### Comportement attendu

**Structure de la carte** (`product-card.html`). Le `mat-card-header` de Material ne projette
dans sa colonne de texte (`.mat-mdc-card-header-text`) **que** `mat-card-title` /
`mat-card-subtitle` ; tout autre enfant atterrit comme frère de cette colonne, dans une ligne
flex — une barre placée dans `mat-card-header` se retrouverait donc à droite du nom, pas
dessous. Remplacer `mat-card-header` par un en-tête maison ; les directives `matCardAvatar` et
`mat-card-title` fonctionnent hors de `mat-card-header` (sélecteurs libres) et gardent la
typographie du thème :

```html
<mat-card class="product" appearance="outlined">
  <div class="product-header">
    <img matCardAvatar class="icon" [src]="iconUrl()" [alt]="product().name" />
    <div class="product-heading">
      <div class="product-title-row">
        <mat-card-title>{{ product().name }}</mat-card-title>
        @if (managerOwned()) { <mat-chip-set class="manager" …> … </mat-chip-set> }
      </div>
      <!-- Barre d'achat (D23), inchangée dans sa logique : déplacée sous le nom. -->
      <div class="product-owned">
        <mat-progress-bar mode="determinate" [value]="ownedProgress()"
                          aria-label="Progression vers le prochain palier" />
        <span class="owned-label">
          @if (nextPalier(); as next) { {{ product().quantite }} / {{ next.seuil }} }
          @else { {{ product().quantite }} }
        </span>
      </div>
    </div>
  </div>
  <mat-card-content>
    <div class="product-stats">…revenu / gain inchangés…</div>
    <div class="product-progress"><mat-progress-bar … aria-label="Production en cours" /></div>
  </mat-card-content>
  <mat-card-actions>…deux boutons inchangés…</mat-card-actions>
</mat-card>
```

Le chip garde son libellé et sa condition (D20) ; l'`aria-label` des deux barres ne change pas
(les tests s'en servent). `span.muted` devient `span.owned-label` (il n'est plus « discret »).

**Mise en page** (`product-card.css`, uniquement de la mise en page, tokens du thème pour les
couleurs) :

- Hauteur des barres : la hauteur d'une `mat-progress-bar` vaut
  `max(--mat-progress-bar-track-height, --mat-progress-bar-active-indicator-height)`, 4 px par
  défaut. Poser **les deux** variables à `16px` sur `.product mat-progress-bar` (une seule
  donnerait une piste épaisse avec un indicateur fin, ou l'inverse). Ces variables sont les
  tokens système de Material, pas une couleur : elles ont leur place dans le CSS du composant,
  et le réglage reste ainsi limité à la carte (les barres de `UnlockList` restent à 4 px).
- `.icon` : `width: 64px; height: 64px; margin: 0` (la classe Material `.mat-mdc-card-avatar`
  impose 40 px et `margin-bottom: 16px`, à neutraliser) ; conserver le `filter` vert (D22) et
  `object-fit: contain`.
- `.product-header` : flex ligne, `align-items: center`, `gap: 0.75rem`, `padding: 16px 16px 0`
  (même retrait que `mat-card-header`, pour que la carte ne bouge pas par ailleurs).
- `.product-heading` : `flex: 1 1 auto; min-width: 0` (sinon un nom long empêche la barre de
  rétrécir), colonne, `gap: 0.25rem`.
- `.product-title-row` : flex ligne, `flex-wrap: wrap`, `align-items: center`, `gap: 0.5rem` ;
  `.manager { margin-left: auto }` inchangé. Sur carte étroite, le chip passe **sous le nom**,
  jamais le nom tronqué.
- Texte dans la barre : `.product-owned { position: relative; isolation: isolate }` ;
  `.owned-label { position: absolute; inset: 0; display: grid; place-items: center;
  line-height: 1; pointer-events: none; font: var(--mat-sys-label-medium) }`. Lisibilité sur
  la partie remplie (vert `--mat-sys-primary`) **et** sur la piste (sombre) : essayer d'abord
  `color: var(--mat-sys-primary); mix-blend-mode: difference` — vert sur vert donne du noir,
  vert sur sombre reste vert, on ne sort pas du monochrome. Si ce n'est pas lisible dans le
  navigateur (voir Vérification), repli : `color: var(--mat-sys-on-primary)` avec un halo
  `text-shadow` en `var(--mat-sys-primary)`. Dire dans le rapport laquelle a été retenue.
- `.product-progress` : garder la règle flex existante (barre `flex: 1 1 auto`) ; la barre de
  production reste sans texte.

**Exemple chiffré** (user neuf, Item 1 d'`origworld` : `quantite: 1`, prochain palier
`Unlock 1.1` seuil 25) :

| État | En-tête de la carte Item 1 | Contenu |
|---|---|---|
| Chargement | icône 64 px ; à droite : « Item 1 » puis, dessous, barre 16 px remplie à 4 % avec « 1 / 25 » centré dedans | revenu / gain, barre de production 16 px vide, boutons Produire / Acheter x1 — 4.00 |
| `"money": 500` dans le JSON puis Acheter x10, x10, x1 (`quantite 22`) | barre à 88 %, « 22 / 25 » | inchangé |
| Manager 1 engagé (onglet Managers) | ligne du nom : « Item 1 » + chip « manager » à droite ; barre dessous | bouton Arrêter ; barre de production qui se remplit en boucle (D15) |
| `quantite: 120` (JSON édité) | barre à 100 %, « 120 » seul centré | inchangé |

### Cas limites

- `quantite > seuil` avec palier encore verrouillé (monde vieux de ≤ 2 s, D15) → 100 %,
  « 30 / 25 » centré, pas d'erreur (comportement D23 conservé, test existant à garder).
- Tout débloqué (`nextUnlock` → `null`) → « 22 » seul, barre à 100 % (test existant, sélecteur
  à adapter).
- Nom long ou carte à 320 px avec chip « manager (en pause) » → le chip passe sous le nom, la
  barre garde toute la largeur de la colonne.
- Réglage « halo » (`crt-glow`) activé → le texte dans la barre reste lisible (le `text-shadow`
  global s'ajoute, il ne doit pas transformer le texte en tache).
- `prefers-reduced-motion` : rien à faire, aucune animation ajoutée.

### Contraintes (et pourquoi)

- **Pas de `mat.progress-bar-overrides` supplémentaire dans `material-theme.scss`** : il
  s'appliquerait à toutes les barres de l'app (onglet Unlocks compris), alors que seule la carte
  doit grossir. Les variables `--mat-progress-bar-*-height` dans `product-card.css` font le
  même travail, scopé.
- **Aucune couleur en dur** (D22) : `color`, `text-shadow`, tout passe par `var(--mat-sys-…)`.
- `ownedProgress`, `nextPalier`, `progress`, `canBuy`, `canProduce`, `productionLabel` et les
  trois outputs de `product-card.ts` **ne changent pas** : la feature est purement template +
  CSS ; si `.ts` est modifié, c'est un signal qu'on est sorti du périmètre.
- Adapter les tests, ne pas les supprimer : `ownedBar()` continue de marcher (même
  `aria-label`), remplacer `.product-owned .muted` par `.product-owned .owned-label`, et
  ajouter un test de structure (la barre d'achat est dans `.product-header .product-heading`,
  plus dans `mat-card-content`). Les hauteurs ne se testent pas en jsdom (pas de calcul de
  variables CSS depuis une feuille de style) : elles se vérifient dans le navigateur.
- Ne pas modifier `frontend/src/app/graphql/types.ts` / `operations.ts` (générés).

### Hors périmètre

- Les barres de `UnlockList` (onglet Unlocks) et toute autre `mat-progress-bar` : elles restent
  à 4 px.
- La barre de production : elle grossit, mais pas de texte dedans, pas de déplacement.
- Les boutons de la carte, `game-math.ts`, `game.service.ts`, `app.*`, le thème, le backend.
- Tout changement d'icône (pas de recadrage, pas de `border-radius` nouveau : garder ce que
  `matCardAvatar` applique, le cercle est déjà celui du thème).

### Étapes

1. Lire les fichiers ci-dessus. La feature touche 4 fichiers + 3 fichiers de doc : écrire un
   plan en 5 lignes (structure HTML, règles CSS, tests à adapter) et le montrer avant de coder.
2. Réécrire `product-card.html` selon la structure ci-dessus.
3. Réécrire `product-card.css` : hauteur des barres, `.icon`, en-tête maison, texte centré ;
   supprimer les règles orphelines (`mat-card-header`, `.product-owned .muted`).
4. Adapter `product-card.spec.ts` (sélecteurs, test de structure).
5. Vérifier (section suivante), y compris la lisibilité du texte dans la barre à 4 %, 88 % et
   100 %, halo activé et désactivé.
6. Documentation : dans `docs/ROADMAP.md`, insérer une ligne `- [x] 9.10 Carte produit :
   barres 16 px, barre d'achat dans l'en-tête sous le nom (D24)` et renuméroter la ligne
   « … (à compléter quand `frontend.pdf` sera disponible) » en 9.11 ; ajouter **D24** dans
   `docs/DECISIONS.md` (contexte / décision / conséquences, dont le choix de l'en-tête maison
   au lieu de `mat-card-header`, et la variante de lisibilité retenue) ; mettre à jour la ligne
   `product-card` de `frontend/CLAUDE.md` et le paragraphe « Frontend » de l'état actuel du
   `CLAUDE.md` racine (une phrase « Depuis 9.10, … »).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning nouveau.
- [ ] `cd frontend && npm test` vert, `product-card.spec.ts` compris (tests adaptés + test de
      structure).
- [ ] Serveurs lancés via les configurations `backend` et `frontend` de `.claude/launch.json`
      (jamais Bash), user jetable (ex. `verif-910`), onglet Produits :
  - `getComputedStyle(document.querySelector('.product-owned mat-progress-bar')).height`
    → `"16px"` ; idem pour `.product-progress mat-progress-bar`.
  - `document.querySelector('.product .icon').getBoundingClientRect().width` → `64`.
  - Le centre de `.owned-label` (via `getBoundingClientRect`) est à ±2 px du centre de la barre
    `.product-owned mat-progress-bar`, horizontalement et verticalement.
  - `document.querySelector('mat-card-content .product-owned')` → `null` (la barre a quitté le
    contenu) ; `document.querySelector('.product-header .product-heading .product-owned')` →
    non nul.
  - Onglet Unlocks : `getComputedStyle(document.querySelector('app-unlock-list mat-progress-bar')).height`
    → `"4px"` (périmètre respecté).
- [ ] Capture d'écran de l'onglet Produits à 4 % (chargement) puis à 88 % (après
      `"money": 500` + Acheter x10, x10, x1 sur Item 1), halo activé : texte « 1 / 25 » puis
      « 22 / 25 » lisible dans la barre dans les deux cas.
- [ ] Fenêtre réduite pour obtenir des cartes de 320 px (`resize_window`), Manager 1 engagé : le
      chip « manager » passe sous « Item 1 » si la ligne est trop courte, la barre reste pleine
      largeur, aucun débordement horizontal.
- [ ] `docs/ROADMAP.md` (9.10 cochée, 9.11 = placeholder), `docs/DECISIONS.md` (D24),
      `frontend/CLAUDE.md`, `CLAUDE.md` mis à jour.

### Rapport attendu

En fin de tâche : fichiers modifiés, commandes lancées avec leurs résultats réels (build, tests,
valeurs `getComputedStyle`, captures), variante de lisibilité retenue (`mix-blend-mode` ou
halo) et pourquoi, ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : code installé (`frontend/node_modules/@angular/material/progress-bar/_m3-progress-bar.scss`,
`fesm2022/card.mjs`, `fesm2022/progress-bar.mjs`), [styling de mat-progress-bar](https://next.material.angular.dev/components/progress-bar/styling),
[PR angular/components #27008](https://github.com/angular/components/pull/27008) (token de hauteur),
[M3 progress indicators](https://m3.material.io/components/progress-indicators/overview) ;
AdVenture Capitalist de mémoire (pas de source ouverte).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Emplacement du compteur d'exemplaires | AdVenture Capitalist : compteur « n / prochain palier » sous l'icône ronde du business, texte dans la barre | Barre sous le **nom**, à droite de l'icône (demande utilisateur), texte dedans | reprendre le texte-dans-la-barre ; position = demande, notée D24 |
| Épaisseur des barres | M3 : 4 px par défaut, tokens `track-height` / `active-indicator-height` (= `max` des deux) | 16 px sur la carte seule via les deux variables CSS | reprendre — poser les **deux** variables |
| Où poser les tokens | Angular Material : `mat.progress-bar-overrides` (global ou dans un sélecteur SCSS) ou variables CSS système | Composants en `.css` (pas SCSS) ; règle projet « couleurs dans le thème seul » | diverge du mixin : variables CSS dans `product-card.css`, scopées, pas une couleur → conforme D22 |
| Contenu d'un `mat-card-header` | Seuls `mat-card-title` / `subtitle` vont dans la colonne de texte | Une barre sous le titre est impossible sans détourner `mat-card-subtitle` | diverge : en-tête maison, directives `matCardAvatar` / `mat-card-title` conservées → décision à noter (D24) |
| Lisibilité d'un texte sur barre bicolore | Jeux : texte blanc avec contour ; M3 ne prévoit pas de label dans la barre | Monochrome vert : pas de blanc, pas de contour noir en dur | `mix-blend-mode: difference` en primary (reste dans le gamut), repli halo ; à vérifier en navigateur |
| Accessibilité | Barre avec `aria-label` + valeur, texte visible redondant OK | Déjà en place (D23) | conserver l'`aria-label`, tests inchangés |
| Tests Angular | TestBed sur composant présentationnel ; jsdom ne calcule pas les variables CSS | Spec existant | adapter les sélecteurs, hauteurs vérifiées en navigateur |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi (barres discrètes, compteur AdCap collé à l'icône), quoi (2 changements), étape 9.10. |
| 2 | Instructions séquencées | 2 | 6 étapes cochables, doc incluse avec les textes exacts à insérer. |
| 3 | Exemples concrets | 2 | Squelette HTML, tableau chiffré 4 % / 88 % / 100 %, valeurs `getComputedStyle` attendues. |
| 4 | Structure lisible | 2 | Sections du gabarit ; le squelette HTML en bloc. |
| 5 | Rôle et périmètre | 2 | Hors périmètre explicite (UnlockList, barre de production sans texte, `.ts` intouché). |
| 6 | Critères mesurables | 2 | Commandes + valeurs exactes (`"16px"`, `"4px"`, `64`, ±2 px, `null`). |
| 7 | Pourquoi des contraintes | 2 | `mat-card-header` (projection), deux variables (max), pas d'override global (scope), `min-width: 0`. |
| 8 | Raisonnement guidé | 1 | Plan demandé et lisibilité à vérifier avant de conclure, mais le choix blend/halo est laissé à l'exécution sans critère chiffré de « lisible ». |
| 9 | Format de sortie | 2 | Fichiers, D24, roadmap 9.10/9.11, rapport avec variante retenue. |
| 10 | Concision | 1 | Le squelette HTML et la liste CSS répètent en partie le tableau d'exemple ; acceptable pour lever l'ambiguïté du header, mais long. |

Historique : v1 16/20 → v2 18/20.

Améliorations retenues (v1 → v2) :
- Critère 7 (1 → 2) : ajout de la raison technique du header maison (`mat-card-header` ne
  projette que title/subtitle) et de la double variable de hauteur (`max`) — sans cela un
  implémenteur bien intentionné aurait mis la barre dans `mat-card-header` et constaté qu'elle
  se place à droite.
- Critère 6 (1 → 2) : les vérifications navigateur passent d'adjectifs (« bien visible ») à des
  valeurs `getComputedStyle` / `getBoundingClientRect`, plus le contrôle que `UnlockList` reste
  à 4 px.
- Critère 8 : gardé à 1 après réflexion — un seuil de contraste chiffré serait faux (le blend
  change la couleur selon la position), la capture en fait foi.
