# Prompt — Carte produit allégée + page Unlocks « prochain palier par produit »

- Date : 2026-09-19
- Étape roadmap : 9.9 (nouvelle ligne à insérer, voir Étapes) — suppose 9.8 terminée
  (`frontend-pipboy-theme.md`)
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « sur la page produit réduit les informations
  vues par le joueur, enlève l'id, vitesse, croissance, unlock (rajoute une page unlock où tu vois
  pour chaque item l'unlock suivante), enlève le coût car on l'a déjà sur le bouton acheter »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`,
Angular Material 22.1 en thème « écran cathodique » vert, tests vitest). Réponds en français ;
code et commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du
TP : cette feature touche la carte produit, l'écran Unlocks, `game-math.ts` et la documentation —
rien dans `backend/`.

### Objectif

La carte produit (`ProductCard`) est encore un écran de debug : elle affiche `id`, `quantite`,
`revenu`, `gain/production`, `vitesse`, `cout`, `croissance`, « timeleft N ms » et la liste
complète des trois paliers. Un joueur n'a pas besoin de la moitié de ces champs (le coût est déjà
sur le bouton « Acheter x1 — 4.00 »). Deux changements, sans aucune nouvelle règle de jeu :

1. **Alléger la carte** : ne garder que `revenu`, `gain/production`, la barre de production, et
   remplacer la stat `quantite` par une **barre d'achat** « quantité / seuil du prochain palier
   verrouillé » (comme le compteur sous chaque business d'AdVenture Capitalist).
2. **Enrichir l'onglet Unlocks** : au-dessus de la table `All unlocks` existante (inchangée), une
   section « Par produit » qui montre, pour chacun des 6 produits, le **prochain palier
   verrouillé**, son effet et sa progression.

C'est l'étape **9.9** de `docs/ROADMAP.md`. Le backend calcule seul les unlocks (`updateWorld`,
`docs/GAME-RULES.md` § Unlocks) ; le front ne fait qu'afficher `product.paliers[].unlocked`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — tableau des fichiers (lignes `product-card`,
   `palier-list`, `app`) et conventions (composants présentationnels, tokens de couleur, un
   fichier de style par composant, `.pip-title` / `h2` de `styles.css`).
2. `docs/GAME-RULES.md` § Unlocks — un palier produit se débloque quand `quantite >= seuil`
   (comparaison large), un all unlock quand **tous** les produits l'atteignent ; c'est la seule
   règle qu'il faut refléter à l'écran.
3. `docs/DECISIONS.md` — D14 (le `getWorld` refait après chaque mutation est la source de
   vérité : la barre d'achat se met à jour à la réception du monde, pas au clic), D15 (le timer
   100 ms n'anime que `timeleft`, la barre d'achat n'est pas animée), D17 / D21 (boutons de la
   carte : **ne pas y toucher**), D22 (thème : couleurs par tokens, `.pip-title`, aucun
   `mat-icon`). **D20 existe deux fois, ne pas renuméroter** : la nouvelle entrée sera D23.
4. `frontend/src/app/product-card.ts` / `.html` / `.css` / `.spec.ts` — `progress()`, `fmt`, le
   bloc `.product-stats`, la liste `ul.paliers`, l'hôte de test `Host` et le fixture `item1`
   (un seul palier `Unlock 1.1`, seuil 25).
5. `frontend/src/app/game-math.ts` / `.spec.ts` — fonctions pures d'affichage ; la nouvelle
   fonction `nextUnlock` y va.
6. `frontend/src/app/app.html` (`@case ('unlocks')`), `app.css` (`.product-grid`),
   `palier-list.html` / `.css` (le `mat-table` et le style de ligne à imiter), `src/styles.css`
   (sélecteurs `app-palier-list h2` qui donnent le style de titre d'écran).
7. `backend/src/origworld.ts` — pour vérifier les chiffres de l'exemple (Item 1 : `quantite: 1`,
   paliers `Unlock 1.1` seuil 25 vitesse ×2, `Unlock 1.2` seuil 50 gain ×2, `Unlock 1.3` seuil
   100 vitesse ×2 ; les autres items ont les mêmes seuils avec `quantite: 0`). **Ne pas le
   modifier.**

### Comportement attendu

**`game-math.ts`** — ajouter une fonction pure :

```ts
// Prochain palier à atteindre : le palier verrouillé de plus petit seuil, ou null si tout est
// débloqué (ou si le produit n'a aucun palier).
export function nextUnlock(product: { paliers: readonly PalierData[] }): PalierData | null
```

On prend le **plus petit seuil parmi les verrouillés**, pas « le premier verrouillé du tableau » :
`origworld` les liste en ordre croissant, mais rien ne le garantit dans un `userworlds/*.json`
édité à la main, et le backend teste chaque palier indépendamment.

**Carte produit** (`ProductCard`) :

- Supprimer du template : le `mat-card-subtitle` « id N », les `span` `vitesse`, `cout`,
  `croissance`, le `span.muted` « timeleft N ms » sous la barre de production, et toute la liste
  `ul.paliers`. Retirer le CSS orphelin (`.paliers`, `.unlocked`, `.product-progress .muted`).
- Garder : avatar, titre, chip manager, `revenu`, `gain/production`, `mat-progress-bar` de
  production (avec son `aria-label`), les deux boutons **tels quels** (D17 / D20 / D21).
- Remplacer le `span` `quantite` par un bloc `.product-owned` : une deuxième `mat-progress-bar`
  (`mode="determinate"`, `aria-label="Progression vers le prochain palier"`) + un texte
  `{{ quantite }} / {{ seuil }}` — ou `{{ quantite }}` seul quand `nextUnlock` renvoie `null`.
  Deux `computed` : `nextPalier = nextUnlock(product())` et
  `ownedProgress = nextPalier ? min(100, 100 * quantite / seuil) : 100`, bornée à 0-100 et `100`
  si `seuil <= 0` (même garde-fou que `progress()` contre la division par zéro). Mise en page
  identique au bloc `.product-progress` existant (flex, barre `flex: 1 1 auto`, texte à droite
  en `.muted`) : réutiliser cette règle CSS pour les deux blocs plutôt que la dupliquer. Ordre
  dans la carte : stats (`revenu`, `gain/production`) → barre d'achat → barre de production.

**Onglet Unlocks** (`app.html`, `@case ('unlocks')`) — nouveau composant présentationnel
`UnlockList` (`unlock-list.ts` / `.html` / `.css` / `.spec.ts`, sélecteur `app-unlock-list`,
input `products: readonly ProductData[]`, aucun output, aucune injection). Un `<h2>` « Par
produit » stylé comme les autres titres d'écran (ajouter `app-unlock-list h2` aux sélecteurs
`app-palier-list h2` de `styles.css`, ou poser `class="pip-title"` — les deux sont acceptés,
choisir le plus court), puis un `mat-table` d'une ligne par produit avec 4 colonnes :

| Colonne | Contenu | Exemple (Item 1, monde neuf) |
|---|---|---|
| `produit` | `product.name` | Item 1 |
| `palier` | `nextUnlock(product).name`, ou « tous les paliers débloqués » (cellule fusionnant visuellement le reste : les 3 autres colonnes vides) | Unlock 1.1 |
| `effet` | `typeratio ×ratio` (libellé brut du schéma, comme sur la carte aujourd'hui) | vitesse ×2 |
| `progression` | `mat-progress-bar` + texte `quantite / seuil` (même calcul que la carte : réutiliser `nextUnlock`, pas de copie de la formule) | 1 / 25 |

Une ligne dont le produit a tout débloqué prend `class.unlocked` (couleur `--mat-sys-primary`,
comme les lignes de `PalierList`). L'écran devient
`<section class="unlocks"><app-unlock-list [products]="world.products" /><app-palier-list title="All unlocks" [paliers]="world.allunlocks" /></section>`,
la table `All unlocks` reste strictement identique.

**Exemple chiffré** (user neuf, Item 1) — à retrouver sur la carte **et** dans la ligne Item 1 de
l'onglet Unlocks :

| Instant | Carte Item 1 | Ligne Unlocks Item 1 | Pourquoi |
|---|---|---|---|
| Chargement | barre d'achat 4 %, texte « 1 / 25 » ; ni « id 1 », ni « vitesse », ni « cout », ni « croissance », ni « timeleft » | Unlock 1.1 — vitesse ×2 — 1 / 25 | `quantite 1`, plus petit palier verrouillé = seuil 25 |
| Créditer 500 $ (`"money": 500` dans `backend/userworlds/<user>-world.json`), puis Acheter x10, x10, x1 (`quantite 22`, 179.46 $ dépensés — `buyCost`) | 88 %, « 22 / 25 » | Unlock 1.1 — vitesse ×2 — 22 / 25 | 100 × 22 / 25 |
| Acheter x10 (`quantite 32`, 228.83 $ de plus) | 64 %, « 32 / 50 » | Unlock 1.2 — gain ×2 — 32 / 50 | le backend a passé `Unlock 1.1` à `unlocked: true` (et `vitesse` 500 → 250, invisible ici) ; le prochain verrouillé est `Unlock 1.2` |
| `quantite 120` (éditer le JSON) | 100 %, « 120 » seul | « tous les paliers débloqués », ligne en `unlocked` | `nextUnlock` renvoie `null` |

Item 2 à 6 au chargement : « 0 / 25 », 0 %, bouton Produire grisé (D21, inchangé).

### Cas limites

- `quantite > seuil` alors que `unlocked` est encore `false` (monde reçu il y a ≤ 2 s, D15, ou
  JSON édité) → barre bornée à 100 %, texte « 30 / 25 », pas d'erreur : le serveur tranchera au
  prochain `getWorld`.
- `paliers: []` → `nextUnlock` renvoie `null` → carte « N » seul à 100 %, ligne « tous les
  paliers débloqués ».
- Palier verrouillé avec `seuil: 0` → 100 %, texte « N / 0 » (données absurdes, on ne plante pas).
- Deux paliers verrouillés de même seuil → le premier du tableau (ordre stable de `Array.find`
  après tri, ou boucle `min` avec `<` strict).
- `world` absent → l'onglet Unlocks n'est pas rendu (déjà le cas : `@else if (game.world())`).

### Contraintes (et pourquoi)

- `nextUnlock` dans `game-math.ts`, testée dans `game-math.spec.ts`, et **appelée** par les deux
  composants — une seule définition du « prochain palier », sinon carte et onglet finiront par
  diverger (par ex. sur l'ordre des paliers).
- Barre d'achat calculée en `computed` à partir de `product()` seulement, **pas** du timer 100 ms
  (D15) : `quantite` ne change qu'à la réception d'un `getWorld` (D14).
- `mat-progress-bar` comme pour la production, pas de `<div>` maison : le thème (D22,
  `mat.progress-bar-overrides`) sépare déjà piste et indicateur ; une barre custom devrait
  réinventer les tokens.
- Aucune couleur en dur, aucun `mat-icon` (D22) ; CSS de composant limité à la mise en page.
- Ne pas toucher aux boutons Produire / Arrêter / Reprendre / Acheter ni à leurs `computed`
  (`canBuy`, `canProduce`, `quantity`, `cost`) : D17 / D20 / D21 sont testés par
  `product-card.spec.ts`, ces tests doivent rester verts sans modification.
- `PalierList` reste tel quel (il sert aux 4 listes) : la section « Par produit » est un
  composant à part, pas un mode de plus de `PalierList`.
- Ne pas toucher à `backend/`, à `schema.graphql`, ni à `graphql/*.graphql` (les champs
  nécessaires — `quantite`, `paliers { seuil ratio typeratio unlocked name }` — sont déjà dans
  `GetWorld`) ; ne pas relancer `codegen`.
- Commentaires en français.

### Hors périmètre

- Progression des `All unlocks` (min des quantités / seuil) : la table reste brute, décision
  prise en amont.
- Un 7e onglet, un routeur, une URL par onglet (D19 / D22 : pas de `Router`).
- Rappel du prochain unlock ailleurs que dans la barre d'achat (pas de tooltip, pas de badge).
- Traduire `typeratio` en phrase (« production 2× plus rapide ») ; masquer les produits à
  `quantite 0`.
- Modifier `docs/GAME-RULES.md` ou le backend.

### Étapes

1. Lire les fichiers ci-dessus et lancer `cd frontend && npx vitest run` pour partir d'un état
   vert. **Point d'arrêt** : si `product-card.html` n'a pas de `ul.paliers` ni de `span` `cout`,
   ou si `app.html` n'a pas de `@case ('unlocks')` avec `app-palier-list title="All unlocks"`,
   l'état 9.8 ne correspond pas à ce prompt — s'arrêter et le signaler. La feature touche plus de
   3 fichiers : écrire un plan de 5 lignes (fichiers, ordre) et le montrer avant de coder.
2. `game-math.ts` : `nextUnlock` + commentaire ; `game-math.spec.ts` : 4 tests (tout verrouillé →
   seuil 25 ; `Unlock 1.1` débloqué → seuil 50 ; tout débloqué → `null` ; tableau désordonné
   `[100, 25, 50]` verrouillés → seuil 25).
3. `product-card.ts` / `.html` / `.css` : suppressions, `nextPalier`, `ownedProgress`, bloc
   `.product-owned` à la place de la stat `quantite`. `product-card.spec.ts` : adapter le test
   « affiche le nom et la quantité » (le texte attendu devient « 1 / 25 », plus de « id 1 ») et
   ajouter : (a) `quantite 22` → 2e `mat-progress-bar` à `value` 88 ; (b) palier `unlocked: true`
   → « 22 » seul, 100 ; (c) le HTML ne contient plus « vitesse », « croissance », « timeleft »
   ni « cout » hors du bouton Acheter.
4. `unlock-list.ts` / `.html` / `.css` / `.spec.ts` (hôte avec 2 produits : Item 1 neuf → ligne
   « Unlock 1.1 / vitesse ×2 / 1 / 25 » ; Item à 120 tout débloqué → « tous les paliers
   débloqués » + `tr.unlocked`). `app.html` : la section `.unlocks`. `app.ts` : import
   `UnlockList`. `styles.css` : le titre si tu passes par le sélecteur d'élément.
5. Documentation : `docs/DECISIONS.md` — `## D23 — Frontend : carte produit allégée, barre
   d'achat vers le prochain palier, onglet Unlocks par produit` (Contexte / Décision (phase 9.9,
   2026-09-19) / Conséquences, format de D21) ; `frontend/CLAUDE.md` — lignes `product-card`,
   `app`, nouvelle ligne `unlock-list`, `game-math` (ajouter `nextUnlock`), et la phrase du
   résumé d'en-tête ; `CLAUDE.md` racine — une phrase « Depuis 9.9, … » dans « État actuel » ;
   `docs/ROADMAP.md` — insérer `- [x] 9.9 Carte produit allégée + onglet Unlocks par produit
   (D23) : …` avant la ligne « 9.9 … (à compléter) » qui devient 9.10.
6. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` et `npx vitest run` : 0 erreur, tous les specs verts (les
      tests existants de D17 / D20 / D21 non modifiés).
- [ ] `grep -n "product().id\|croissance\|vitesse\|timeleft\|product().cout" frontend/src/app/product-card.html`
      ne renvoie **rien** (`cost()` du bouton Acheter n'est pas `product().cout`) ; `grep -c
      "mat-progress-bar" frontend/src/app/product-card.html` renvoie `2`.
- [ ] `grep -n "nextUnlock" frontend/src/app/product-card.ts frontend/src/app/unlock-list.ts`
      : une occurrence dans chaque (formule non dupliquée).
- [ ] Backend et front lancés (configs `backend` / `frontend` de `.claude/launch.json`), user neuf
      `test-9-9` : carte Item 1 = « 1 / 25 » et `mat-progress-bar[aria-label="Progression vers
      le prochain palier"]` à `aria-valuenow="4"` ; aucune des chaînes « id 1 », « vitesse »,
      « croissance », « timeleft » dans la carte (`read_page` ou inspecteur).
- [ ] Onglet Unlocks : table « Par produit » de 6 lignes, Item 1 = « Unlock 1.1 | vitesse ×2 |
      1 / 25 », Items 2-6 = « 0 / 25 » ; la table « All unlocks (3) » est toujours là en dessous,
      colonnes inchangées.
- [ ] Éditer `backend/userworlds/test-9-9-world.json` → Item 1 `"quantite": 120` (ne pas toucher
      aux `unlocked`), attendre le `getWorld` (≤ 2 s ou recharger) : le backend passe les 3
      paliers à `unlocked: true` ; la carte affiche « 120 » seul à 100 %, la ligne Item 1 dit
      « tous les paliers débloqués ».
- [ ] `docs/DECISIONS.md` contient `## D23` ; `docs/ROADMAP.md` a `[x] 9.9` ;
      `frontend/CLAUDE.md` mentionne `unlock-list`.

### Rapport attendu

En fin de tâche : fichiers créés / modifiés, sortie réelle de `npm run build` et `npx vitest run`
(nombre de tests), capture d'écran de la carte Item 1 et de l'onglet Unlocks (chargement et
après `quantite 120`), ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Une recherche web (AdVenture Capitalist : sources ci-dessous) ; conventions Angular / Material de
mémoire.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Compteur d'exemplaires | AdVenture Capitalist : le nombre possédé est posé sur une barre qui se remplit vers le prochain palier (25, 50, 100…), sans afficher le seuil en clair | Barre + texte « 12 / 25 » (le seuil est écrit) | diverge volontairement : le TP n'a pas d'icône ni de tooltip, le seuil écrit remplace l'infobulle du jeu |
| Écran des unlocks | AdVenture Capitalist : panneau « Unlocks » listant tous les paliers de tous les business, débloqués grisés ; Cookie Clicker : achievements dans une grille à part | Une ligne par produit (prochain palier seul) + table All unlocks brute | diverge : choix utilisateur (lisibilité), tout l'historique reste dans le JSON |
| Infos par business | AdVenture Capitalist : nom, compteur, revenu par cycle, barre de cycle, prix d'achat sur le bouton | revenu + gain/production + barre + prix sur Acheter | identique (c'est la demande) ; `revenu` gardé en plus (décision utilisateur) |
| Calcul de « prochain palier » | Jeux idle : milestones triées par seuil, le prochain = plus petit non atteint | `nextUnlock` = plus petit seuil verrouillé | reprendre ; ne pas supposer le tableau trié |
| Logique dérivée | Angular : `computed()` sur inputs, fonctions pures partagées testées seules | `game-math.ts` déjà dans ce rôle | reprendre (`nextUnlock`) |
| Barre d'accessibilité | Material : `mat-progress-bar` porte `role="progressbar"` + `aria-valuenow` ; libellé via `aria-label` | Déjà fait pour la production | reprendre (2e barre, `aria-label` distinct, testable) |
| Source de vérité | Jeux idle en ligne : le client anime, le serveur décide | D14 / D15 | identique : barre non animée, mise à jour au `getWorld` |
| Divergence documentée | — | Carte décrite dans `frontend/CLAUDE.md`, D17 / D21 inchangés | décision à noter (D23) |

Sources : [Unlocks (Earth) — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Unlocks_(Earth)),
[Businesses — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Businesses),
[AdVenture Capitalist: General Info & Tips — Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=445227074).

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Ce qui est affiché aujourd'hui, ce qu'un joueur n'a pas besoin de voir, les deux changements, étape 9.9, rôle du backend |
| 2 | Instructions séquencées | 2 | 6 étapes avec fichiers, tests à écrire nommés, ordre de la doc, renumérotation 9.9 → 9.10 |
| 3 | Exemples concrets | 2 | Tableau chargement → 22 → 32 → 120 sur Item 1, vérifié contre `origworld.ts` (paliers 25 / 50 / 100, vitesse-gain-vitesse) et la règle `>=` de GAME-RULES |
| 4 | Structure lisible | 2 | Sections du gabarit ; tableau des colonnes de l'onglet ; signature TS en bloc |
| 5 | Rôle et périmètre | 2 | Frontend seul, boutons et `PalierList` intouchables, hors périmètre listé (all unlocks, 7e onglet, tooltip, traduction) |
| 6 | Critères mesurables | 2 | build + vitest, greps sur le template, `aria-valuenow="4"`, contenu des lignes, scénario JSON `quantite 120` |
| 7 | Le « pourquoi » | 2 | `nextUnlock` partagée (divergence), min seuil (JSON non trié), pas de timer (D14/D15), `mat-progress-bar` (tokens du thème) |
| 8 | Raisonnement guidé | 2 | Lecture, vitest avant, point d'arrêt sur l'état 9.8, plan de 5 lignes imposé (> 3 fichiers) |
| 9 | Format de sortie | 2 | Fichiers et doc nommés, mise en page du bloc `.product-owned` (même règle que `.product-progress`), ordre des blocs, contenu des cellules de la table, format de D23 et de la ligne 9.9 |
| 10 | Concision / cohérence | 1 | Prompt long pour deux changements d'affichage ; la règle « barre bornée à 100 » est dite trois fois (comportement, cas limites, contraintes) |

Historique : v1 16/20 → v2 18/20 → v3 19/20.
Améliorations retenues : v1 disait « styler le titre comme les autres » sans nommer le sélecteur
`app-palier-list h2` de `styles.css` ni offrir `class="pip-title"` (critère 9 : 0 → 1) ; les
critères de succès v1 (« la carte est allégée ») sont devenus des greps sur `product-card.html`
et un `aria-valuenow` lisible (critère 6 : 1 → 2) ; v2 ajoute le tableau des colonnes et le
scénario `quantite 120` qui teste `nextUnlock → null` de bout en bout (critère 3 : 1 → 2), et
corrige les montants de l'exemple (179.46 $ / 228.83 $ recalculés avec `buyCost`, un exemple
faux valant moins qu'aucun) ; v3 fixe la mise en page du bloc `.product-owned` et l'ordre des
blocs de la carte (critère 9 : 1 → 2). Les redites du critère 10 couvrent des lecteurs différents
(celui qui code la formule, celui qui teste), conservées.
