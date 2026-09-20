# Prompt — Logo + nom du monde, logos des paliers avec repli, colonne « produit » à la place d'`idcible`

- Date : 2026-09-19
- Étape roadmap : 9.17 (remplace la ligne « 9.17 … (à compléter) ») — suppose 9.9 (D23,
  `UnlockList`) et 9.16 (D31) terminées ; nouvelle décision **D32**
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « rajoute l'emplacement pour le logo du monde et
  le nom du monde, rajoute sur la page unlock l'emplacement pour le logo des paliers, pareil pour
  les managers (gère aussi l'absence du logo du manager : le logo de l'item si absence de logo de
  manager), sur la page upgrade remplace idcible par le nom de l'item, pareil pour manager, quand
  l'idcible est 0 mets tous les objets (trouve un meilleur nom) »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22.1 standalone + signals, `@apollo-orbit/angular`,
Angular Material 22.1, tests vitest). Réponds en français ; code et commentaires selon `CLAUDE.md`
et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP : cette feature touche **uniquement
`frontend/src/app/`** (templates, un nouveau composant présentationnel, fonctions pures, specs)
et la documentation. Rien dans `backend/`, aucun changement de schéma ni d'opération GraphQL.

### Objectif

Le monde et les paliers portent déjà un `logo` (chemin relatif servi par le backend :
`http://localhost:3000/` + `logo`, ex. `icones/manager1.png`) et `GetWorld` les remonte déjà
(`world.name`, `world.logo`, fragment `PalierFields`). Mais l'interface ne s'en sert que pour
l'icône 64 px de la carte produit. On veut :

1. **Toolbar** : à côté du titre fixe « ISIS Capitalist », le logo du monde puis `world.name`,
   quand un monde est chargé.
2. **Colonne logo** dans les quatre tables `PalierList` (Managers, Upgrades, Angel upgrades, All
   unlocks) et devant le nom du prochain palier dans la table « Par produit » de l'onglet Unlocks
   (`UnlockList`).
3. **Repli d'image** : un palier dont le `logo` est vide (`''`) ou dont l'image ne charge pas
   affiche à la place l'image du **produit ciblé** (`idcible > 0`), le logo du **monde** si
   `idcible = 0`, rien si `idcible = -1`.
4. **Colonne « produit »** à la place de la colonne `idcible` de `PalierList` : le **nom** du
   produit ciblé ; `0` → **« Global »** ; `-1` → **« Anges »** ; id sans produit → `#<id>`.

C'est l'étape **9.17** de `docs/ROADMAP.md`, décision **D32** dans `docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine, § « État actuel ») et `frontend/CLAUDE.md` (tableau des fichiers et
   § Conventions : composants présentationnels sans injection, Material module par module, pas de
   couleur en dur, images = `http://localhost:3000/` + `logo`).
2. `docs/GAME-RULES.md` § « Vocabulaire » (lignes sur `Palier.idcible` : `id` du produit, `0` =
   tous les produits, `-1` = spécial / anges) et § « Unlocks » (« Cible : `idcible == 0` → tous
   les produits ; `> 0` → le produit ; `-1` → le monde lui-même ») — c'est la sémantique que la
   colonne « produit » traduit en mots.
3. `docs/DECISIONS.md` — D13 (les `ratio` / `typeratio` des managers sont décoratifs : ne pas
   les retirer pour autant), D14 (le monde reçu est la seule source de vérité), D23 (`UnlockList`),
   D31 est la dernière entrée : la nouvelle sera **D32**. Format : une entrée `## D32 — …` avec
   Contexte / Décision / Conséquences comme les précédentes.
4. Sources : `frontend/src/app/palier-list.ts/.html/.css/.spec.ts`,
   `unlock-list.ts/.html/.css/.spec.ts`, `angels-panel.ts/.html` (héberge la `PalierList` des
   angel upgrades), `app.ts/.html/.css/.spec.ts`, `product-card.ts` (constante `ICON_BASE_URL`
   et `iconUrl`), `game-math.ts/.spec.ts`, `game.service.ts` (types `WorldData`, `ProductData`,
   `PalierData`), `graphql/queries.graphql` (vérifier que `logo` y est déjà : oui, ne rien
   ajouter).

### Comportement attendu

**Fonctions pures, dans `game-math.ts`** (testées dans `game-math.spec.ts`) :

- `targetLabel(palier, products): string` — `idcible === 0` → `'Global'` ; `=== -1` → `'Anges'` ;
  sinon le `name` du produit dont `id === idcible`, ou `` `#${idcible}` `` s'il n'existe pas.
- `logoCandidates(palier, products, worldLogo): readonly string[]` — chemins relatifs à essayer
  dans l'ordre, **sans chaîne vide** : `[palier.logo, repli]` où repli = `logo` du produit ciblé
  si `idcible > 0` et trouvé, `worldLogo` si `idcible === 0`, aucun sinon. Doublons retirés
  (les paliers d'`origworld` ont souvent le logo de leur produit).

**Nouveau composant présentationnel `GameIcon`** (`game-icon.ts/.html/.css/.spec.ts`,
sélecteur `app-game-icon`, inputs `candidates: readonly string[]` requis, `alt` défaut `''`) :

- Déplacer `ICON_BASE_URL` de `product-card.ts` vers `game-icon.ts` (export) et l'importer dans
  `product-card.ts` — `iconUrl()` de la carte ne change pas de valeur.
- Index du candidat courant en **`linkedSignal`** dépendant de `candidates()` (revient à 0 dès
  que la liste change : après chaque `getWorld`, D14, l'image est retentée). Sur l'événement
  `(error)` de l'`<img>`, passer au candidat suivant. Liste vide ou tous les candidats en échec →
  **aucun `<img>`** (`@if`), l'espace reste réservé par le CSS de l'hôte (`display: inline-block;
  width/height: 32px`).
- Ne pas remplacer l'icône de la carte produit par `GameIcon` : elle reste telle quelle (64 px,
  D25), hors périmètre.

**`PalierList`** : nouveaux inputs `products` (défaut `[]`) et `worldLogo` (défaut `''`) ;
colonnes `['logo', 'name', 'seuil', 'produit', 'ratio', 'typeratio', 'unlocked']` (+ `action`
si `actionLabel`). Colonne `logo` : en-tête vide, cellule = `<app-game-icon
[candidates]="logoCandidates(palier, products(), worldLogo())" />`. Colonne `produit` : en-tête
« produit », cellule = `targetLabel(palier, products())`. La colonne `idcible` disparaît
(l'id brut n'est plus affiché nulle part).

**`UnlockList`** : nouvel input `worldLogo` (défaut `''`) ; dans la cellule `palier`, l'icône
(`app-game-icon`, mêmes candidats) **avant** `next.name` ; rien quand tout est débloqué (le
message « tous les paliers débloqués » reste seul).

**`AngelsPanel`** : nouveaux inputs `products` et `worldLogo`, transmis tels quels à sa
`PalierList` (le panneau reste sans injection).

**`App`** : passer `[products]="world.products"` et `[worldLogo]="world.logo"` aux trois
`PalierList` de `app.html`, à `UnlockList` et à `AngelsPanel`. Dans la toolbar, **après**
`span.brand` et **avant** le champ user : `@if (game.world(); as world)` → `<span
class="world-name">` contenant `<app-game-icon [candidates]="[world.logo]" />` puis
`{{ world.name }}` (typographie `--mat-sys-title-medium`, icône 32 px alignée sur le texte,
`app.css`). Sans monde : rien (le « aucun monde chargé » existant suffit).

Exemple (données de `backend/src/origworld.ts`, monde `{ name: 'World', logo: 'icones/world.png' }`) :

| Palier | `idcible` / `logo` | Colonne « produit » | `logoCandidates` |
|---|---|---|---|
| Manager 1 | `1` / `icones/manager1.png` | `Item 1` | `['icones/manager1.png', 'icones/item1.png']` |
| Manager 1 sans logo | `1` / `''` | `Item 1` | `['icones/item1.png']` |
| Upgrade 1 | `1` / `icones/item1.png` | `Item 1` | `['icones/item1.png']` (doublon retiré) |
| All Unlock 1 | `0` / `icones/all.png` | `Global` | `['icones/all.png', 'icones/world.png']` |
| Angel Upgrade 1 | `-1` / `icones/angel.png` | `Anges` | `['icones/angel.png']` |
| Angel upgrade sans logo | `-1` / `''` | `Anges` | `[]` → pas d'`<img>` |
| Palier orphelin | `9` / `''` | `#9` | `[]` |

Toolbar avec user `lucas` : « ISIS CAPITALIST » puis `[icône world.png] World`, puis le champ
user, le multiplicateur et les cases de stats, dans cet ordre.

### Cas limites

- `logo` d'un manager = `''` → la cellule montre directement `icones/item<idcible>.png` (aucune
  requête vers `http://localhost:3000/` sans chemin).
- Image 404 (ex. `logo: 'icones/absent.png'`) → `(error)` → candidat suivant ; si c'est le
  dernier, plus d'`<img>`, jamais l'icône « image cassée » du navigateur.
- `products` vide (ex. `PalierList` montée seule dans un test) → `targetLabel` rend `#1` pour
  `idcible = 1`, pas d'exception.
- Aucun monde chargé (`game.world()` undefined) → toolbar inchangée par rapport à aujourd'hui.
- Reset (`resetWorld`) → nouveau monde reçu → `candidates` change → `linkedSignal` repart à 0.

### Contraintes (et pourquoi)

- **Ne pas modifier** `backend/`, `schema.graphql`, `queries.graphql`, `types.ts` /
  `operations.ts` (générés) — tout ce dont on a besoin est déjà requêté ; changer le schéma est
  une décision distincte que le sujet impose de justifier.
- `PalierList`, `UnlockList`, `AngelsPanel`, `GameIcon` restent **présentationnels** (inputs /
  outputs, aucune injection) : les specs les montent sans serveur ; c'est pour ça que `products`
  et `worldLogo` descendent d'`App` en inputs plutôt que d'être lus dans `GameService`.
- `linkedSignal` plutôt qu'un `effect` qui écrit un signal : c'est le motif Angular ≥ 19 pour un
  état local qui se réinitialise quand un input change, sans dépendance à l'ordre des effets.
- Couleurs uniquement via `var(--mat-sys-…)` ; `.css` de composant = mise en page seulement ;
  Material importé module par module ; pas de `mat-icon` (police VT323 seule, D22).
- `alt=""` sur les icônes de tables et de toolbar : le nom est déjà dans la cellule / à côté,
  une lecture d'écran ne doit pas l'entendre deux fois.
- Ne pas modifier `docs/DECISIONS.md` au-delà de l'ajout de D32 (les entrées précédentes sont des
  comptes rendus datés).

### Hors périmètre

- Renommer les produits / managers d'`origworld` ou ajouter des images dans
  `backend/public/icones/` (les logos y sont tous renseignés ; le repli se teste par les specs).
- Changer la carte produit (`ProductCard`) — seule la constante `ICON_BASE_URL` déménage.
- Remplacer les tables Material par des cartes, trier, filtrer, redimensionner les colonnes.
- Afficher `idcible` ailleurs (tooltip, etc.) : l'id brut disparaît, c'est voulu.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche plus de 3 fichiers : écrire un plan en 5-8
   lignes (fichiers touchés, signatures des deux fonctions et du composant) et le montrer avant
   de coder.
2. `game-math.ts` : `targetLabel`, `logoCandidates` + tests (`game-math.spec.ts`) couvrant les
   7 lignes du tableau d'exemple.
3. `game-icon.ts/.html/.css/.spec.ts` : composant + `ICON_BASE_URL` déplacé ; spec : rendu du
   premier candidat avec le préfixe, `dispatchEvent(new Event('error'))` sur l'`<img>` → `src`
   du second, second en erreur → plus d'`<img>`, changement de `candidates` → retour au premier.
   **Point de contrôle** : `npx ng test --watch=false --include='**/game-*.spec.ts'` vert avant
   d'intégrer le composant (une erreur de `linkedSignal` ou de préfixe se corrige ici, pas dans
   quatre templates).
4. `PalierList` (inputs, colonnes, template, `.css` : cellule logo à largeur fixe, sans padding
   superflu) + `palier-list.spec.ts` (colonne « produit » : `Item 1`, `Global`, `Anges`, `#9` ;
   présence d'un `app-game-icon` par ligne ; les tests existants — boutons désactivés — passent
   toujours).
5. `UnlockList` (input `worldLogo`, icône dans la cellule `palier`) + spec ; `AngelsPanel`
   (inputs transmis) ; `App` (template, `app.css` pour `.world-name`) + `app.spec.ts` (stub
   `world` avec `name: 'World'`, `logo: 'icones/world.png'` → la toolbar contient `World` et un
   `app-game-icon` ; `world` undefined → ni l'un ni l'autre).
6. Vérifier (section suivante), y compris dans le navigateur.
7. Documentation : `frontend/CLAUDE.md` (lignes `palier-list`, `unlock-list`, `angels-panel`,
   `app`, `game-math`, `product-card` ; nouvelle ligne `game-icon`), `CLAUDE.md` racine
   (« Depuis 9.17, … » dans « État actuel »), `docs/ROADMAP.md` (remplacer la ligne 9.17 par
   la description cochée `[x]`, ajouter `- [ ] 9.18 … (à compléter quand frontend.pdf sera
   disponible)`), `docs/DECISIONS.md` (D32).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur (le warning de budget de bundle D18 est
      attendu) et `npx ng test --watch=false` : tous les tests verts, y compris les nouveaux
      (`game-icon.spec.ts`, cas ajoutés dans `game-math`, `palier-list`, `unlock-list`, `app`).
- [ ] Backend et frontend lancés via les configurations `backend` / `frontend` de
      `.claude/launch.json` (jamais Bash), user `lucas`, onglet **Managers** : la première
      colonne montre une `<img>` dont `src` = `http://localhost:3000/icones/manager1.png` sur
      la ligne « Manager 1 », la colonne « produit » affiche `Item 1` … `Item 6`, aucune cellule
      ne contient un entier seul à cet endroit ; en-tête « idcible » absent du DOM.
- [ ] Onglet **Unlocks** : table « All unlocks » → colonne « produit » = `Global` sur chaque
      ligne, icône `icones/all.png` ; table « Par produit » → une icône devant chaque « Unlock
      N.1 », aucune icône sur une ligne « tous les paliers débloqués ».
- [ ] Onglet **Anges › Bonus** : colonne « produit » = `Anges`, icône `icones/angel.png`.
- [ ] Toolbar : `document.querySelector('.world-name')?.textContent` contient `World` et
      `.world-name img` a pour `src` `http://localhost:3000/icones/world.png` ; champ user vide →
      pas de `.world-name`.
- [ ] Repli vérifié dans le navigateur (console, `javascript_tool`) : sur l'`<img>` de la ligne
      « Manager 1 », `img.dispatchEvent(new Event('error'))` → son `src` devient
      `http://localhost:3000/icones/item1.png` ; un second `error` → l'`<img>` disparaît de la
      cellule, la cellule garde sa largeur.
- [ ] Largeur 360 px (`resize_window`) : `scrollWidth` de `app-root` ≤ 360, la toolbar passe
      sur plusieurs lignes sans déborder.
- [ ] `grep -rn "idcible" frontend/src/app/*.html` ne renvoie plus rien.

### Rapport attendu

En fin de tâche : fichiers créés / modifiés, commandes lancées avec leurs résultats réels
(nombre de tests, taille du bundle), captures ou valeurs relevées dans le navigateur pour les
critères ci-dessus, ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sur connaissances du modèle (pas de recherche web : habillage d'interface, aucune formule).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Icône de la cible dans les listes | AdVenture Capitalist : icône du business à gauche de chaque manager / upgrade, « All businesses » + icône dédiée pour les upgrades globaux | Colonne logo en tête de `PalierList`, « Global » pour `idcible = 0` | reprendre |
| Monde en en-tête | AdCap affiche le monde courant (Earth, Moon…) dans le bandeau | Toolbar, après le titre | reprendre |
| Image de repli | Pas de mécanisme natif Angular ; motif usuel = composant / directive qui écoute `(error)` et change `src` ; Cookie Clicker évite le problème (sprite unique) | `GameIcon` avec liste ordonnée de candidats (logo → produit → monde) | reprendre, décision à noter (D32) |
| État local réinitialisé par un input | Angular ≥ 19 : `linkedSignal` plutôt qu'un `effect` écrivant un signal | Index du candidat en `linkedSignal` | reprendre |
| Icône décorative à côté d'un texte | WAI : `alt=""` | `alt=""` partout | reprendre |
| Test d'une image cassée sous jsdom | jsdom ne charge pas les images : `dispatchEvent(new Event('error'))` | Idem dans `game-icon.spec.ts` | reprendre |
| Logique d'affichage hors composants | Fonctions pures testées à part | `targetLabel` + `logoCandidates` dans `game-math.ts` | identique |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Ce qui existe (logos requêtés mais inutilisés), les 4 attentes, l'étape et la décision. |
| 2 | Instructions séquencées | 2 | 7 étapes cochables, chacune avec ses fichiers et ses tests. |
| 3 | Exemples concrets | 2 | Tableau de 7 cas issus d'`origworld` (dont les 3 replis et le doublon retiré) + ordre de la toolbar. |
| 4 | Structure lisible | 2 | Sections du gabarit ; les signatures sont dans « Comportement attendu », les raisons dans « Contraintes ». |
| 5 | Rôle et périmètre | 2 | Frontend seul, `ProductCard` explicitement gardée, hors périmètre listé. |
| 6 | Critères mesurables | 2 | `src` exacts, sélecteurs DOM, grep, largeur 360 px, `dispatchEvent` dans le navigateur. |
| 7 | Pourquoi des contraintes | 2 | Inputs plutôt qu'injection, `linkedSignal`, `alt=""`, pas de changement de schéma : chacun motivé. |
| 8 | Raisonnement guidé | 2 | Plan avant de coder, puis point de contrôle (tests de `game-math` / `game-icon`) avant d'intégrer le composant dans quatre templates. |
| 9 | Format de sortie | 2 | Fichiers nommés, documentation listée ligne par ligne, format de D32, rapport. |
| 10 | Concision | 1 | Le tableau d'exemple et la section « Cas limites » se recoupent partiellement (repli `''`, liste vide). |

Historique : v1 16/20 → v2 18/20 → v3 19/20.
Améliorations retenues : v1 décrivait le repli en prose (critère 3 à 1) et laissait `AngelsPanel`
implicite (critère 2 à 1) ; v2 ajoute le tableau des 7 cas et l'étape `AngelsPanel` / `App`
séparée ; v3 ajoute le point de contrôle après l'étape 3 (critère 8). Le critère 10 restant
tient à un choix (garder les cas limites lisibles sans renvoyer au tableau) plutôt qu'à une
information manquante.
