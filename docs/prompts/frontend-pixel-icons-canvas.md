# Prompt — Icônes Pip-Boy rendues par le frontend (canvas), images couleur côté backend

- Date : 2026-09-20
- Étape roadmap : 9.19 (nouvelle ligne à insérer, voir Étapes) — suppose 9.18 terminée
- Sous-projet : **les deux** (backend : fichiers statiques + CORS seulement ; frontend : le rendu)
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « garde les images avec leur format et style
  classique mais fait que le frontend change la pixelisation et leur colorie »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`,
images servies statiquement depuis `backend/public/icones/`) et `frontend/` (Angular 22 standalone
+ signals, `@apollo-orbit/angular`, Angular Material 22.1 en thème « écran cathodique » vert
monochrome, tests vitest sous jsdom). Réponds en français ; code et commentaires selon `CLAUDE.md`,
`backend/CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur du TP : côté backend tu ne
touches qu'aux fichiers statiques, à leur script et à l'ordre de deux lignes de `main.ts` ; côté
frontend tu ajoutes un module de traitement d'image pur, tu l'utilises dans `GameIcon`, et tu
ajoutes un réglage. **Aucune règle de jeu, aucune opération GraphQL, aucun schéma ne change.**

### Objectif

Le thème « Nuka Capitalist » (`docs/THEME.md`) habille le jeu avec des mascottes Fallout. Pour
qu'elles aient l'air affichées sur l'écran vert d'un Pip-Boy, on a généré aujourd'hui, par un
script Python côté backend, des icônes **96 × 96** en **4 niveaux de vert** à partir d'images
couleur 512 × 512. Cette approche fige le rendu dans les fichiers : impossible de comparer avec
l'original, et chaque future image doit repasser par le script.

On inverse la logique : le **backend sert les images couleur d'origine** (les 512 × 512), et le
**frontend produit lui-même le rendu pixel + vert au moment de l'affichage**, par un canvas, avec
exactement les paramètres du script (grille 96, gamma 0,65, seuils 0 / 60 / 130 / 205, quatre
verts, alpha binarisé). Un toggle « Icônes Pip-Boy » dans Paramètres permet de revenir aux images
couleur lisses. Le rendu s'applique à **toutes** les images du jeu : logo du monde (toolbar),
avatar 64 px de la carte produit, icônes 32 px des tables (managers, upgrades, unlocks, anges).

C'est l'étape **9.19** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine), `backend/CLAUDE.md`, `frontend/CLAUDE.md` — lignes `game-icon`,
   `product-card`, `game.service`, `settings-panel`, `app` du tableau des fichiers, et la
   convention « Préférences d'affichage persistées dans localStorage ».
2. `docs/DECISIONS.md` — respecter **D22** (réglages CRT : signaux + localStorage + `effect`),
   **D25** (icône 64 px de la carte), **D32** (`GameIcon`, repli des candidats, `alt=""`).
3. `docs/THEME.md` § Images — le pipeline actuel et ses paramètres ; tu le réécriras.
4. Sources : `backend/src/main.ts` (ordre `useStaticAssets` / `enableCors`),
   `backend/scripts/pipboy-icons.py` (l'algorithme à porter en TypeScript, **lis-le en entier** :
   c'est la référence du rendu), `backend/scripts/make-icons.mjs`, `backend/README.md`,
   `frontend/src/app/game-icon.ts` / `.html` / `.css` / `.spec.ts`,
   `frontend/src/app/product-card.ts` / `.html` / `.spec.ts`, `frontend/src/app/game.service.ts`
   (`readStoredFlag`, `storeFlag`, les trois signaux CRT), `frontend/src/app/settings-panel.*`,
   `frontend/src/app/app.ts` / `.html` / `.spec.ts`, `frontend/src/app/palier-list.*`,
   `unlock-list.*`, `angels-panel.*` (chaîne d'inputs `products` / `worldLogo` de D32 : le
   nouvel input suivra le même chemin).

### Comportement attendu

**Backend**

- `backend/public/icones/` contient les **images couleur** : les 10 PNG 512 × 512 de
  `backend/scripts/icon-sources/` prennent la place des 10 PNG verts 96 × 96 de même nom
  (`world.png`, `manager-cappy.png`, `manager-confrerie.png`, `manager-mister-orderly.png`,
  `manager-nuka-girl.png`, `manager-vault-boy-gunslinger.png`, `manager-vault-boy-pipboy.png`,
  `upgrade-bottle.png`, `upgrade-sugar-bombs.png`, `upgrade-vault-girl.png`). Les 14 icônes unies
  de démonstration (`item1..6`, `manager1..6`, `all`, `angel`) restent telles quelles.
- `backend/scripts/icon-sources/` et `backend/scripts/pipboy-icons.py` sont supprimés (la
  conversion vit désormais dans le frontend) ; la ligne correspondante de `backend/README.md`
  aussi. `make-icons.mjs` garde son exclusion de `world` (commentaire à reformuler : « vraie icône
  du thème, voir docs/THEME.md »).
- Toute réponse de `/icones/*` porte `Access-Control-Allow-Origin: *`. Aujourd'hui
  `app.enableCors()` est appelé **après** `app.useStaticAssets(...)` dans `main.ts` : avec
  l'adaptateur Express, `express.static` est enregistré au moment de l'appel, donc les images
  sortent avant le middleware CORS. Inverser les deux appels (et vérifier, voir Vérification).

**Frontend — traitement d'image (`frontend/src/app/pixel-art.ts`, nouveau, fonctions pures)**

Constantes exportées, valeurs identiques au script Python : `PIXEL_GRID = 96`,
`PIPBOY_GAMMA = 0.65`, `PIPBOY_THRESHOLDS = [0, 60, 130, 205]`,
`PIPBOY_GREENS = [[0, 45, 22], [0, 110, 55], [26, 255, 128], [196, 255, 203]]` (sombre, moyen,
primary `#1aff80` du thème, pâle), `ALPHA_CUTOFF = 96`, `AUTOCONTRAST_CUTOFF = 0.02`.

- `quantizeToPipboy(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray`
  — prend les pixels RGBA d'une image déjà réduite à la grille, renvoie un nouveau tableau RGBA :
  1. alpha : `a > ALPHA_CUTOFF` → 255, sinon 0 (pixel transparent, RGB à 0) ;
  2. luminance Rec. 601 sur les pixels **opaques** : `L = 0.299 R + 0.587 G + 0.114 B` ;
  3. autocontraste : écarte 2 % des pixels opaques à chaque extrémité de l'histogramme de `L`,
     puis étire linéairement `[lo, hi]` sur `[0, 255]` (si `hi ≤ lo`, ne rien étirer). Le script
     Pillow comptait aussi les pixels transparents ; ne prendre que les opaques est voulu (les
     zones transparentes ne doivent pas tirer le contraste vers le noir) ;
  4. gamma : `v = 255 · (L / 255) ^ PIPBOY_GAMMA` ;
  5. niveau = nombre de seuils `≤ v` moins 1 (donc `[0,60) → 0`, `[60,130) → 1`,
     `[130,205) → 2`, `≥ 205 → 3`), couleur = `PIPBOY_GREENS[niveau]`.
- `pipboyDataUrl(url: string): Promise<string>` — charge `url` dans un `new Image()` avec
  `crossOrigin = 'anonymous'`, la dessine dans un canvas `PIXEL_GRID × PIXEL_GRID`
  (`imageSmoothingEnabled = true`, `imageSmoothingQuality = 'high'` : la **réduction** doit être
  lissée comme le LANCZOS du script, c'est l'**agrandissement** à l'écran qui doit être net),
  applique `quantizeToPipboy`, `putImageData`, et résout `canvas.toDataURL('image/png')`.
  Deux issues en cas d'échec : si l'image **se charge** mais ne peut pas être traitée
  (`getContext('2d')` nul sous jsdom ou navigateur sans canvas, `SecurityError` sur `getImageData`
  = canvas tainted, CORS refusé), résoudre **`url` inchangée** (repli couleur) ; si l'image **ne se
  charge pas** (événement `error`, 404), **rejeter**, pour que `GameIcon` passe au candidat suivant
  comme avant. Résultats **mémoïsés par `url`** dans une `Map<string, Promise<string>>` de module
  (les parents recréent leurs listes 10 fois par seconde, D15/D32 ; sans cache chaque tick
  relancerait un chargement et un calcul) ; exporter `clearPipboyCache()` pour les tests.

Exemple chiffré (histogramme supposé déjà étalé sur 0–255, autocontraste = identité) :
pixel bleu de la combinaison Vault Boy `(0, 103, 177, 255)` → `L = 60,5 + 20,2 = 80,6` →
`v = 255 · (0,316)^0,65 ≈ 121` → niveau 1 → `(0, 110, 55, 255)`. Pixel jaune `(255, 220, 100, 255)`
→ `L ≈ 216,7` → `v ≈ 229` → niveau 3 → `(196, 255, 203, 255)`. Pixel `(255, 255, 255, 40)` →
alpha 40 ≤ 96 → `(0, 0, 0, 0)`.

**Frontend — affichage**

- `GameIcon` (`game-icon.ts`) gagne un input `pixelIcons` (booléen, défaut `true`). L'élément
  affiché reste **un seul `<img>`** (pas de `<canvas>` dans le DOM, `alt` et repli inchangés) :
  - `pixelIcons() === false` → `src` = URL d'origine (`ICON_BASE_URL + candidat`), comme
    aujourd'hui ;
  - `pixelIcons() === true` → `src` = data URL renvoyée par `pipboyDataUrl(urlCandidat)`. Comme
    c'est asynchrone, garder un signal `displaySrc` mis à jour dans un `effect` qui lit `src()` et
    `pixelIcons()`, appelle `pipboyDataUrl`, et ignore le résultat si `src()` a changé entre-temps
    (garde par comparaison de l'URL demandée). Tant que la promesse n'est pas résolue, ne rien
    afficher (pas d'`<img>` couleur qui clignoterait avant le vert) ; l'hôte garde sa place fixe.
    Si `pipboyDataUrl` rejette, appeler `onError()` (candidat suivant), exactement comme l'événement
    `(error)` de l'`<img>`.
  - classe `pixel` sur l'`<img>` quand `pixelIcons()` est vrai → `image-rendering: pixelated`
    dans `game-icon.css`. Une data URL 96 × 96 affichée en 32 ou 64 px reste nette ; en 128 px
    ou plus on verrait les pixels, c'est le but.
- `ProductCard` : l'`<img matCardAvatar class="icon">` de l'en-tête est remplacé par
  `<app-game-icon matCardAvatar class="icon" [candidates]="[product().logo]" [alt]="product().name"
  [pixelIcons]="pixelIcons()" />` avec un input `pixelIcons` (défaut `true`) ; `iconUrl` et
  l'import `ICON_BASE_URL` disparaissent de `product-card.ts`. La taille 64 px est déjà imposée
  par `.icon` dans `product-card.css` (l'hôte de `GameIcon` accepte width / height).
- `PalierList`, `UnlockList`, `AngelsPanel` : input `pixelIcons` (défaut `true`) relayé à leurs
  `app-game-icon` / `PalierList`, comme `worldLogo` (D32).
- `App` : `[pixelIcons]="game.pixelIcons()"` sur la toolbar (`app-game-icon` du logo du monde),
  les `ProductCard`, les trois `PalierList`, `UnlockList` et `AngelsPanel`.

**Frontend — réglage**

- `GameService` : `PIXEL_ICONS_STORAGE_KEY = 'isiscapitalist.pixelicons'`,
  `DEFAULT_PIXEL_ICONS = true`, signal `pixelIcons = signal(readStoredFlag(...))`, `effect` de
  persistance — copie conforme des trois réglages CRT (D22).
- `SettingsPanel` : 4e `model<boolean>() pixelIcons`, 4e `mat-slide-toggle` « Icônes Pip-Boy »
  après « Scintillement » ; `App` le lie en two-way `[(pixelIcons)]="game.pixelIcons"`.

### Cas limites

- Image inexistante (404) avec `pixelIcons` on → `pipboyDataUrl` rejette → candidat suivant →
  liste épuisée → aucun `<img>` (D32 inchangé).
- Backend sans en-tête CORS (ancien `main.ts`) → canvas tainted → `pipboyDataUrl` résout l'URL
  d'origine → l'image **couleur** s'affiche, lisse. Le jeu reste jouable ; c'est le symptôme à
  reconnaître si le rendu n'est pas vert.
- jsdom (tests) : `getContext` renvoie `null` → même repli couleur ; les specs de composants
  n'ont donc **pas** besoin de mocker le canvas, seule `quantizeToPipboy` est testée sur des
  tableaux synthétiques.
- Bascule du toggle pendant la partie : les `GameIcon` réagissent au nouvel input (effect), sans
  rechargement de page ; les data URL restent en cache pour la rebascule.
- Même `logo` sur plusieurs paliers (les 3 paliers d'un produit partagent souvent l'image du
  produit) : une seule requête réseau et un seul calcul grâce au cache par URL.
- `localStorage` indisponible (navigation privée) : `readStoredFlag` / `storeFlag` gèrent déjà le
  try/catch ; défaut on.

### Contraintes (et pourquoi)

- Porter l'algorithme **à l'identique** (constantes, ordre des étapes, arrondis) — le rendu a été
  validé visuellement sur ces valeurs (`docs/THEME.md`) ; un autre gamma ou d'autres seuils
  changeraient l'aspect des 10 icônes déjà approuvées.
- Les quatre verts sont des **constantes TypeScript**, exception assumée à la règle « couleurs
  dans `material-theme.scss` seul » : un canvas ne lit pas les tokens CSS sans `getComputedStyle`,
  et lire le thème n'était pas demandé. Documenter l'exception dans D34 (piste future : dériver
  les verts de `--mat-sys-primary` pour un thème ambre).
- `GameIcon` reste **présentationnel** (aucune injection, D32) : le réglage descend par inputs
  depuis `App`, comme `products` / `worldLogo`. C'est plus de plomberie, mais les specs existantes
  montent ces composants sans service.
- `pixel-art.ts` ne doit contenir **aucune** référence à Angular (pas de `signal`, pas d'`inject`) :
  fonctions pures + DOM standard, testables seules.
- Le cache est par **URL d'origine**, pas par candidat ni par composant : c'est ce qui rend le
  coût indépendant du nombre de `GameIcon` à l'écran (jusqu'à ~30 dans l'onglet Unlocks).
- Ne pas modifier `backend/src/graphql.ts` (généré au démarrage), ni `origworld.ts` (les
  nouveaux fichiers ne sont pas encore référencés, sauf `world.png` qui l'est déjà), ni le schéma.

### Hors périmètre

- Renommer / re-thémer les produits, managers et paliers dans `origworld.ts` — c'est une étape à
  part (`docs/THEME.md` § À faire).
- Lire les couleurs du thème, proposer un choix de grille (96 / 64 / 48) ou un thème ambre.
- Pixeliser les barres, textes ou autres éléments Material : seules les images du jeu changent.
- Toucher aux effets `crt-*` de `styles.css` ou aux trois réglages existants.
- Optimiser au-delà du cache par URL (pas de Web Worker, pas d'`OffscreenCanvas`).

### Étapes

1. Lire les fichiers ci-dessus. La feature touche plus de 3 fichiers : écrire un plan en 5 lignes
   (ordre des composants à modifier, nom des inputs) et le montrer avant de coder.
2. Backend : inverser `enableCors()` / `useStaticAssets()` dans `main.ts` ; copier les 10 PNG de
   `scripts/icon-sources/` vers `public/icones/` (les verts 96 px sont écrasés — **garde-en une
   copie hors du projet**, par exemple dans ton dossier temporaire, pour l'étape 4). Vérifier
   l'en-tête CORS (Vérification, point 2) avant de passer au frontend : sans lui, rien de ce qui
   suit ne sera visible.
3. Frontend : `pixel-art.ts` + `pixel-art.spec.ts` (tests de `quantizeToPipboy` sur des tableaux
   de 2 × 2 pixels reprenant l'exemple chiffré, et de `pipboyDataUrl` sous jsdom → résout l'URL
   d'origine, cache : deux appels = une seule promesse).
4. **Point de contrôle** avant d'aller plus loin : dans le navigateur (console de la page du
   frontend, backend actif), appeler `pipboyDataUrl('http://localhost:3000/icones/world.png')`
   et comparer visuellement la data URL obtenue avec la copie du `world.png` vert de l'étape 2
   (même silhouette, mêmes quatre verts, pas de halo gris sur les bords). Un écart signifie que
   l'algorithme n'est pas porté à l'identique (ordre autocontraste / gamma, alpha, lissage) :
   corriger `pixel-art.ts` **avant** de toucher aux composants, sinon l'écart se retrouvera
   partout. Puis `GameIcon` (`pixelIcons`, `displaySrc`, effect, classe `pixel`, CSS) + spec :
   `pixelIcons` faux → `src` d'origine ; vrai sous jsdom → après résolution, `src` d'origine aussi
   (repli), et l'`<img>` porte la classe `pixel` ; l'échec de `pipboyDataUrl` → candidat suivant.
5. Les composants et le réglage, dans l'ordre de « Comportement attendu — affichage » puis
   « réglage ». Specs à adapter : `.product-header > .icon` (`product-card.spec.ts`) doit toujours
   trouver l'élément ; `settings-panel.spec.ts` compte 4 toggles ; `app.spec.ts` ajoute
   `pixelIcons` au stub ; `game.service.spec.ts` vérifie la clé `isiscapitalist.pixelicons`.
   Supprimer ensuite `scripts/icon-sources/`, `scripts/pipboy-icons.py` et la copie temporaire
   des verts ; mettre à jour `backend/README.md` et le commentaire de `make-icons.mjs`.
6. Documentation : `docs/THEME.md` § Images (le pipeline est désormais côté frontend, sources
   couleur dans `public/icones/`, paramètres dans `pixel-art.ts`) ; `frontend/CLAUDE.md` (lignes
   `game-icon`, `product-card`, `game.service`, `settings-panel`, `app` + nouvelle ligne
   `pixel-art.ts` ; convention localStorage) ; `backend/CLAUDE.md` si l'arborescence y est
   décrite ; `CLAUDE.md` racine (§ État actuel, une phrase « Depuis 9.19… »).
7. Vérifier (section suivante).
8. `docs/ROADMAP.md` : insérer `- [x] 9.19 …` avant la ligne « 9.19 … (à compléter quand
   `frontend.pdf` sera disponible) », qui devient 9.20 ; ajouter **D34** dans `docs/DECISIONS.md`
   (rendu côté client vs fichiers générés, ordre CORS, constantes de couleur hors thème, cache par
   URL, repli couleur si canvas indisponible).

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` sans erreur.
- [ ] Backend lancé (`npm run start:dev` ou la configuration `backend` de `.claude/launch.json`) :
  ```bash
  curl -sI http://localhost:3000/icones/world.png
  ```
  contient `Access-Control-Allow-Origin: *` et `Content-Type: image/png` ; l'image fait 512 × 512
  (par exemple `python -c "from PIL import Image; print(Image.open('backend/public/icones/world.png').size)"`
  ou n'importe quel visualiseur).
- [ ] `ls backend/scripts` ne liste plus `icon-sources` ni `pipboy-icons.py`.
- [ ] `cd frontend && npm run build` sans erreur ; `npx ng test --watch=false` vert, avec au moins
  les nouveaux tests : `quantizeToPipboy` (exemple chiffré : bleu → `[0,110,55,255]`, jaune →
  `[196,255,203,255]`, alpha 40 → `[0,0,0,0]`), `pipboyDataUrl` (repli jsdom, cache),
  `GameIcon` (`pixelIcons` faux / vrai / échec), `SettingsPanel` (4 toggles),
  `GameService` (clé `isiscapitalist.pixelicons`).
- [ ] Dans le navigateur (configuration `frontend` de `.claude/launch.json`), backend actif, user
  quelconque : la toolbar montre Vault Boy **en pixels verts** ; l'onglet Produits montre les
  icônes 64 px en vert (les 6 `itemN.png` unis deviennent des carrés vert uniforme : normal) ;
  l'onglet Paramètres a un 4e toggle « Icônes Pip-Boy » ; le désactiver rend immédiatement les
  images **couleur et lisses**, le réactiver les repasse en vert sans nouvelle requête réseau
  (onglet Réseau : une requête par fichier d'image, pas une par tick).
- [ ] Après rechargement de la page, l'état du toggle est conservé (`localStorage`).
- [ ] Capture d'écran de l'onglet Produits en mode Pip-Boy et en mode couleur, jointe au rapport.

### Rapport attendu

En fin de tâche : fichiers créés / modifiés / supprimés (backend et frontend), commandes de
vérification avec leurs résultats réels (sortie de `curl -sI`, nombre de tests), captures, et ce
qui reste incertain (par exemple un écart visuel entre le rendu canvas et les anciens PNG verts).
Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sans recherche web (points MDN / Angular bien établis) ; `docs/THEME.md` et les conventions du
projet priment.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Pixel art à l'écran | `image-rendering: pixelated` + réduction lissée, agrandissement net (jeux rétro, sprites Cookie Clicker) | identique (96 px → 32 / 64 px) | reprendre |
| Pixels d'une image cross-origin | `crossorigin="anonymous"` + `Access-Control-Allow-Origin`, sinon canvas tainted (`SecurityError`) | `enableCors()` après `useStaticAssets` → pas d'en-tête sur `/icones/` | corriger l'ordre, vérifier par `curl -I`, D34 |
| Traitement d'image dans Angular | logique pure hors composant, composant présentationnel | `pixel-art.ts` pur + `GameIcon` | reprendre (même découpage que `game-math.ts`) |
| Recalcul à chaque tick | memoïsation par URL | `Map<url, Promise<dataURL>>` de module | reprendre |
| Dégradation | progressive enhancement : image d'origine si canvas indisponible / tainted | idem, et c'est le chemin des tests jsdom | reprendre |
| Couleurs | projet : « couleurs dans `material-theme.scss` seul » | 4 verts en constantes TS | décision à noter (D34) |
| Accessibilité | image décorative `alt=""`, un seul `<img>` | inchangé (data URL dans le même `<img>`) | reprendre |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi on inverse le pipeline (rendu figé, comparaison impossible), pour qui, étape 9.19. |
| 2 | Instructions séquencées | 2 | 8 étapes, backend d'abord avec vérification CORS bloquante avant le frontend. |
| 3 | Exemples concrets | 2 | Exemple chiffré vérifié (bleu → niveau 1, jaune → niveau 3, alpha 40 → transparent), repris dans les tests attendus. |
| 4 | Structure lisible | 2 | Sections backend / traitement / affichage / réglage ; constantes en bloc. |
| 5 | Rôle et périmètre | 2 | Deux sous-projets cadrés ; hors périmètre explicite (origworld, thème ambre, Web Worker). |
| 6 | Critères mesurables | 2 | `curl -sI`, taille 512, tests nommés avec valeurs, requêtes réseau, persistance, captures. |
| 7 | Pourquoi des contraintes | 2 | Ordre CORS expliqué (express.static enregistré à l'appel), lissage à la réduction vs net à l'agrandissement, cache par URL, constantes hors thème. |
| 8 | Raisonnement guidé | 2 | Plan avant code, lecture du script de référence, et point de contrôle (étape 4) comparant le rendu canvas aux PNG verts validés avant de toucher aux composants. |
| 9 | Format de sortie | 2 | Fichiers à créer / supprimer nommés, docs à mettre à jour (THEME, CLAUDE × 3, ROADMAP, D34), rapport avec captures. |
| 10 | Concision | 1 | Long (deux sous-projets, six composants à relier) ; l'étape 5 renvoie maintenant à « Comportement attendu » au lieu de le répéter, mais le prompt reste dense. |

Historique : v1 16/20 → v2 18/20 → v3 19/20.
Améliorations retenues : v1 laissait `pipboyDataUrl` résoudre l'URL d'origine sur 404 (le repli
D32 vers le candidat suivant aurait cessé de fonctionner) → distinction rejet / résolution ;
autocontraste précisé sur les pixels opaques seulement avec la raison ; critère 6 : ajout du
contrôle « une requête par fichier, pas une par tick » et de la taille 512 ; critère 8 (v3) :
point de contrôle visuel canvas vs PNG verts avant suppression, les verts étant conservés hors
projet jusque-là ; critère 10 (v3) : l'étape 5 ne répète plus la chaîne d'inputs.
