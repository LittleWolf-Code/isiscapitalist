# Prompt — Carte produit : barres de progression à 24 px (chrono et texte à l'échelle)

- Date : 2026-09-20
- Étape roadmap : 9.18 (nouvelle ligne à insérer, voir Étapes) — suppose 9.17 terminée
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « sur la page produit sur les carte produit
  augmente la hauteur des deux bar de progression »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette feature ne touche que **`frontend/src/app/product-card.css`** et la documentation — rien
dans `backend/`, rien dans les autres composants, ni dans `product-card.ts` / `.html`.

### Objectif

Sur l'onglet Produits, chaque carte a deux `mat-progress-bar` de **16 px** (D25) : la barre
d'achat « quantite / seuil » dans l'en-tête et la barre de production avec le gain dedans, plus
un chrono encadré de 16 px collé à droite de cette dernière (D28). À 16 px, le texte de 14 px
qui vit dans les barres est serré et les barres restent discrètes pour un jeu. Trois changements
**d'affichage seulement**, aucune règle de jeu, donnée ni structure nouvelle :

1. Les **deux barres** de la carte passent de 16 à **24 px**.
2. Le **chrono** `.product-timer` passe aussi à **24 px** pour rester bord à bord avec la barre.
3. Le **texte** des barres (`.bar-label`) et du chrono monte d'un cran : **16 px** au lieu de 14.

C'est l'étape **9.18** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — ligne `product-card` du tableau des fichiers.
2. `docs/DECISIONS.md` — **D25** (barres 16 px par les deux tokens `--mat-progress-bar-*-height`
   scopés à `.product`, texte centré dans la barre en `mix-blend-mode: difference`), **D28**
   (chrono 16 px `box-sizing: border-box`, `min-width: 5ch`, une seule règle `.bar-label` pour
   les deux barres), **D29** (barre de production sans transition : ne pas y toucher), **D22**
   (aucune couleur en dur). La nouvelle entrée sera **D33**.
3. `frontend/src/app/product-card.css` — le seul fichier de code à modifier. Repérer les trois
   endroits où « 16 » est écrit : la règle `.product mat-progress-bar`, `.product-timer { height }`
   et les commentaires.
4. `frontend/src/material-theme.scss` (l. ~92-102) — le thème relève `label-large-size` à
   1.15 rem, **mais** le raccourci `--mat-sys-label-large` utilisé par `.bar-label` est un token
   à part, figé à 0.875 rem / 1.25 rem par Material (voir Contraintes). On n'y ajoute rien.
5. `frontend/src/app/product-card.spec.ts` — ne change pas ; aucun test ne lit une hauteur
   (jsdom ne calcule pas les variables CSS d'une feuille de style).

### Comportement attendu

Dans `product-card.css` uniquement :

- Introduire **une variable** sur la carte, source unique des trois hauteurs :
  ```css
  .product { --product-bar-height: 24px; }
  .product mat-progress-bar {
    --mat-progress-bar-track-height: var(--product-bar-height);
    --mat-progress-bar-active-indicator-height: var(--product-bar-height);
  }
  .product-timer { height: var(--product-bar-height); }
  ```
  Poser **les deux** tokens Material (la hauteur d'une `mat-progress-bar` est le `max` des
  deux : un seul donnerait une piste épaisse avec un indicateur fin). Le sélecteur reste scopé à
  `.product` : les barres d'`UnlockList` restent à 4 px.
- `.bar-label` et `.product-timer` : remplacer `font: var(--mat-sys-label-large)` par
  `font: var(--mat-sys-body-large)` (16 px). Garder `line-height: 1` **après** le raccourci
  (il réinitialise la hauteur de ligne), garder `mix-blend-mode: difference` sur `.bar-label`.
- Mettre à jour les commentaires qui citent « 16 px » et « label-large (14 px) ».
- Rien d'autre ne bouge : `.icon` reste à 64 px (nom `mat-card-title` 28 px de hauteur de
  ligne, ou chip manager 32 px sur la même ligne, + gap 4 px + barre 24 px = 56 à 60 px :
  l'icône couvre toujours les deux lignes ; à 32 px de barre ce ne serait plus vrai), `min-width:
  5ch` du chrono inchangé (« 00:00 » en VT323 16 px tient dans 5 ch), `.product-progress`,
  `.product-header`, actions intacts.

**Exemple attendu** (user neuf, Item 1 d'`origworld`, `quantite: 1`, prochain palier seuil 25,
`vitesse` 500 ms) :

| Élément | Avant (D25 / D28) | Après |
|---|---|---|
| `.product-owned mat-progress-bar` | 16 px, « 1 / 25 » en 14 px | **24 px**, « 1 / 25 » en **16 px** |
| `.product-gain mat-progress-bar` | 16 px, « 1.00 » en 14 px | **24 px**, « 1.00 » en **16 px** |
| `.product-timer` | 16 px (bordure comprise), « 00:01 » en 14 px | **24 px**, « 00:01 » en **16 px**, même `top` que la barre |
| `app-unlock-list mat-progress-bar` | 4 px | **4 px** (inchangé) |
| `.product .icon` | 64 px | 64 px |

### Cas limites

- Chrono en `h:mm:ss` (`timeleft` > 1 h édité dans le JSON) → la boîte s'élargit à 7 ch en
  16 px, hauteur 24 px, toujours sur la même ligne que la barre (pas de `flex-wrap`).
- Carte à 320 px (fenêtre étroite) avec x100 : « Acheter x100 — 469.72 M » et les deux barres
  tiennent sans débordement horizontal ; le texte 16 px de la barre d'achat reste centré même
  si la barre fait ~200 px.
- Réglage halo (`crt-glow`) activé → texte lisible dans la barre à 4 % (piste) comme à 100 %
  (rempli) : le `mix-blend-mode` fait le travail, pas de couleur nouvelle.
- `prefers-reduced-motion` : rien à faire, aucune animation ajoutée.

### Contraintes (et pourquoi)

- **`body-large` et non `label-large-size`** : le « cran au-dessus » de 14 px dans l'échelle des
  raccourcis `--mat-sys-*` est `body-large` / `title-medium` (16 px). Utiliser
  `font-size: var(--mat-sys-label-large-size)` donnerait 18.4 px (taille relevée du thème),
  soit deux crans, et un `font-size` en px serait une taille en dur dans un composant, contraire
  à la convention « tailles relevées dans le thème seul ».
- **Une variable `--product-bar-height`** plutôt que trois « 24px » : D28 a déjà dû unifier deux
  règles identiques qui divergeaient ; le chrono doit rester à la hauteur exacte de la barre.
- **Pas de `mat.progress-bar-overrides` dans `material-theme.scss`** : il toucherait toutes les
  barres (onglet Unlocks compris).
- **`product-card.ts`, `.html`, `.spec.ts` intouchés** : si l'un d'eux doit changer, c'est
  qu'on est sorti du périmètre — s'arrêter et le dire.
- Aucune couleur en dur (D22) ; ne pas retirer `.product-gain ::ng-deep … { transition: none }`
  (D29).

### Hors périmètre

- Les barres d'`UnlockList` et toute autre `mat-progress-bar` de l'app.
- La taille de l'icône, des boutons, du nom du produit, du chip manager.
- Un changement de police ou de token dans `material-theme.scss`.
- Le backend, `game-math.ts`, `game.service.ts`, `app.*`.

### Étapes

1. Lire les fichiers ci-dessus (un seul fichier de code : pas de plan à écrire).
2. Modifier `product-card.css` : variable `--product-bar-height`, les deux tokens Material, la
   hauteur du chrono, le token de police de `.bar-label` et `.product-timer`, les commentaires.
3. Vérifier (section suivante). **Point de contrôle** : si une mesure s'écarte des valeurs
   attendues (chrono décalé, heading > 64 px, débordement à 360 px) ou si le texte 16 px paraît
   perdu dans la barre sur la capture, corriger ou signaler **avant** l'étape 4 — la doc doit
   décrire ce qui a été livré, pas ce qui était prévu.
4. Documentation : dans `docs/ROADMAP.md`, insérer `- [x] 9.18 Carte produit : barres et chrono
   à 24 px, texte des barres en body-large 16 px (D33) : variable --product-bar-height dans
   product-card.css` et renuméroter le placeholder « … (à compléter quand `frontend.pdf` sera
   disponible) » en 9.19 ; ajouter **D33** dans `docs/DECISIONS.md` (contexte / décision /
   conséquences avec les valeurs mesurées) ; remplacer « 16 px » par « 24 px » et « label-large
   (14 px) » par « body-large (16 px) » dans la ligne `product-card` de `frontend/CLAUDE.md` et
   dans les phrases « Depuis 9.10 » / « Depuis 9.13 » de l'état actuel du `CLAUDE.md` racine, avec
   une phrase « Depuis 9.18, … ».

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning nouveau (le warning de budget
      897 kB, D18, est connu).
- [ ] `cd frontend && npm test` vert, sans modification de spec.
- [ ] Serveurs lancés via les configurations `backend` et `frontend` de `.claude/launch.json`
      (jamais Bash), user jetable (ex. `verif-918`), onglet Produits, dans la console :
  - `getComputedStyle(document.querySelector('.product-owned mat-progress-bar')).height`
    → `"24px"` ; idem `.product-gain mat-progress-bar` → `"24px"`.
  - `getComputedStyle(document.querySelector('.product-timer')).height` → `"24px"` ;
    `Math.abs(timer.getBoundingClientRect().top − bar.getBoundingClientRect().top)` → `0`
    (chrono et barre de production sur le même `top`).
  - `getComputedStyle(document.querySelector('.product-owned .bar-label')).fontSize` →
    `"16px"` ; idem `.product-gain .bar-label` et `.product-timer`.
  - `getComputedStyle(document.querySelector('.product .icon')).height` → `"64px"` et
    `document.querySelector('.product-heading').getBoundingClientRect().height` ≤ 64.
  - Onglet Unlocks : `getComputedStyle(document.querySelector('app-unlock-list mat-progress-bar')).height`
    → `"4px"`.
- [ ] Fenêtre à 360 px (`resize_window`), x100 : pour chaque `.product`,
      `scrollWidth === clientWidth` (aucun débordement).
- [ ] Capture d'écran de l'onglet Produits, halo activé, avec « 1 / 25 » à 4 % et le gain dans
      la barre de production pendant une production (clic Produire) : les deux textes lisibles.
- [ ] `docs/ROADMAP.md` (9.18 cochée, 9.19 = placeholder), `docs/DECISIONS.md` (D33),
      `frontend/CLAUDE.md`, `CLAUDE.md` mis à jour.

### Rapport attendu

En fin de tâche : diff de `product-card.css` en résumé, commandes lancées avec leurs résultats
réels (build, tests, valeurs `getComputedStyle`, capture), ce qui reste incertain (par exemple si
le texte 16 px paraît perdu dans 24 px : le dire, ne pas changer de token sans le noter). Ne pas
committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : `frontend/node_modules/@angular/material/core/tokens/m3/_md-sys-typescale.scss`
(raccourci `label-large` figé à 0.875 rem, indépendant de `label-large-size`),
[material-components-android ProgressIndicator.md](https://github.com/material-components/material-components-android/blob/master/docs/components/ProgressIndicator.md)
(variante épaisse M3 Expressive : `trackThickness` 8 dp),
[M3 progress indicators specs](https://m3.material.io/components/progress-indicators/specs) ;
AdVenture Capitalist de mémoire (pas de source ouverte).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Épaisseur d'une barre | M3 : 4 dp, variante « épaisse » Expressive à 8 dp | 24 px sur la carte seule (jeu : la barre est l'élément principal, comme dans AdCap où elle fait ~1/3 de la ligne) | diverge volontairement, déjà acté en D25 ; D33 note le passage 16 → 24 |
| Où poser la hauteur | Angular Material : tokens `--mat-progress-bar-track-height` / `-active-indicator-height`, hauteur = `max` des deux | Les deux tokens sur `.product mat-progress-bar` (D25) | reprendre ; ajouter une variable `--product-bar-height` partagée avec le chrono |
| Texte dans une barre | M3 ne le prévoit pas ; jeux : texte ≈ 2/3 de la hauteur de la barre | 14 px dans 16 px (7/8, serré) → 16 px dans 24 px (2/3) | reprendre le ratio 2/3 |
| Échelle typographique | M3 : label-large 14 → body-large / title-medium 16 → title-large 22 ; raccourcis `--mat-sys-*` indépendants des `*-size` relevés | `label-large` → `body-large` ; **piège** : `label-large-size` du thème vaut 18.4 px | reprendre l'échelle des raccourcis, piège expliqué dans Contraintes |
| Éléments alignés à une barre | Pas de standard M3 ; pratique CSS : custom property comme source unique | Chrono à `height: 16px` en dur à côté des tokens 16 px (D28) | décision à noter : variable partagée (D33) |
| Tests | jsdom ne calcule pas les variables CSS | Spec inchangé, mesures en navigateur | conserver |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi (texte serré, barres discrètes), quoi (3 changements chiffrés), étape 9.18. |
| 2 | Instructions séquencées | 2 | 4 étapes cochables, textes exacts pour roadmap / CLAUDE.md. |
| 3 | Exemples concrets | 2 | Bloc CSS cible, tableau avant / après par sélecteur, valeurs `getComputedStyle`. |
| 4 | Structure lisible | 2 | Sections du gabarit ; le CSS en bloc distinct. |
| 5 | Rôle et périmètre | 2 | Un seul fichier de code nommé ; `.ts` / `.html` / `.spec` explicitement intouchés, UnlockList hors périmètre. |
| 6 | Critères mesurables | 2 | `"24px"`, `"16px"`, `"4px"`, delta `top` = 0, `scrollWidth === clientWidth`, heading ≤ 64. |
| 7 | Pourquoi des contraintes | 2 | Piège `label-large-size` (18.4 px), deux tokens (`max`), variable partagée (D28), pas d'override global. |
| 8 | Raisonnement guidé | 2 | Lecture préalable (dont le piège du token), vérification navigateur, puis point de contrôle explicite avant la doc si une mesure ou la capture s'écarte de l'attendu. |
| 9 | Format de sortie | 2 | Fichier, D33, roadmap 9.18 / 9.19, rapport. |
| 10 | Concision | 1 | Les valeurs 24 / 16 px sont répétées dans Objectif, Comportement, tableau et Vérification ; redondance acceptée pour lever toute ambiguïté sur trois nombres, mais le prompt est long pour un changement de 6 lignes de CSS. |

Historique : v1 17/20 → v2 18/20.

Améliorations retenues (v1 → v2) :
- Critère 8 (1 → 2) : ajout d'un point de contrôle entre la vérification et la documentation
  (corriger ou signaler avant d'écrire D33), et non seulement dans le rapport final.
- Critère 3 (2, précisé) : le calcul de la hauteur de l'en-tête ignorait le chip manager
  (32 px) ; corrigé en « 56 à 60 px », avec la raison pour laquelle 32 px de barre aurait
  cassé l'icône 64 px.
- Critère 10 gardé à 1 : les répétitions 24 / 16 px entre Objectif, tableau et Vérification
  sont volontaires (ce sont les seules valeurs du prompt) ; tenter de les retirer coûterait
  plus en ambiguïté qu'en longueur.
