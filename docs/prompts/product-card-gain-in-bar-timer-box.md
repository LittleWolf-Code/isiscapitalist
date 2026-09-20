# Prompt — Carte produit : gain dans la barre de production, chrono à sa droite, revenu retiré

- Date : 2026-09-19
- Étape roadmap : 9.13 (nouvelle ligne, voir Étapes) — suppose 9.10 (D25) et 9.12 (D26) dans
  le code ; 9.11 (D24) peut rester non cochée, elle ne touche pas la carte
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « dans la page produit pour chaque produit
  enlève l'affichage du revenu et déplace gain/production dans la barre de progression avec à
  droite de la production un rectangle de la hauteur de la barre avec le temps restant »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette feature touche **un composant présentationnel** (`ProductCard`), une fonction pure de
`game-math.ts`, leurs specs et la documentation — rien dans `backend/`, rien dans
`game.service.ts` ni `app.*`.

### Objectif

Rapprocher la carte produit de la ligne d'un business d'*AdVenture Capitalist* : le montant que
rapporte une production est écrit **dans** la barre de production, et un **chrono** encadré, de
la hauteur de la barre, est collé **à sa droite**. Trois changements d'affichage, **aucune règle
de jeu, aucune donnée, aucun comportement nouveau** :

1. La ligne `.product-stats` (« revenu … » et « gain/production … ») **disparaît**.
2. La barre de production (`mat-progress-bar` « Production en cours », 16 px) affiche le **gain
   d'une production** centré dedans (valeur seule, ex. « 12.34 »), avec la technique déjà
   validée pour la barre d'achat (D25).
3. À droite de la barre, sur la même ligne : un **rectangle de 16 px de haut, contour 1 px**,
   qui montre le **temps restant** de la production en cours au format `mm:ss` (arrondi à la
   seconde supérieure), ou la **durée d'un cycle** (`vitesse`) quand rien ne tourne.

C'est l'étape **9.13** de `docs/ROADMAP.md`, décision **D27** dans `docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — lignes `product-card` et `game-math` du
   tableau des fichiers ; conventions : composants présentationnels, un `.css` par composant qui
   ne porte **que la mise en page**, couleurs uniquement via `var(--mat-sys-…)` (D22), aucune
   couleur en dur hors `material-theme.scss`.
2. `docs/DECISIONS.md` — **D25** (en-tête maison, barres 16 px, texte centré dans la barre
   d'achat par `span.owned-label` en `mix-blend-mode: difference` : **réutiliser tel quel**, ne
   pas réessayer la variante `on-primary` + `text-shadow`, déjà rejetée), **D15** (le timer
   100 ms de `GameService` n'anime que `timeleft` : c'est ce qui fera vivre le chrono sans
   rien ajouter), **D26** (Acheter au bord droit — ne pas toucher), D17 / D20 / D21 (boutons —
   ne pas toucher). **D20 existe deux fois, ne pas renuméroter.**
3. `docs/GAME-RULES.md` § Production — `vitesse` et `timeleft` sont en **millisecondes** ;
   `timeleft = 0` signifie « pas de production en cours » ; avec manager actif `timeleft`
   reboucle sur `vitesse` (jamais 0 durablement).
4. `frontend/src/app/game-math.ts` — `formatNumber` (modèle de style pour la nouvelle fonction :
   fonction pure, commentaire en français, pas de locale) et `productionGain` (déjà utilisé par
   `gain()` de la carte).
5. `frontend/src/app/product-card.html` / `.ts` / `.css` / `.spec.ts` — état actuel :
   `mat-card-content` = `div.product-stats` (deux `span`) puis `div.product-progress` (la barre
   seule, `aria-label="Production en cours"`, sans texte) ; en `.ts`, `gain()` et `progress()`
   existent déjà ; en `.css`, `.product-owned` / `.owned-label` portent la technique du texte
   dans la barre. Dans le spec, la barre de production est trouvée par
   `mat-progress-bar[aria-label="Production en cours"]` et un test vérifie que les mots
   `vitesse`, `croissance`, `timeleft`, `cout`, `id ` n'apparaissent pas dans la carte.
6. `frontend/src/app/game-math.spec.ts` — style des tests de `formatNumber`, à imiter.

### Comportement attendu

**`game-math.ts`** — nouvelle fonction pure exportée :

```ts
// Durée en ms → « mm:ss », ou « h:mm:ss » à partir d'une heure ; arrondie à la seconde
// SUPÉRIEURE : une production en cours n'affiche jamais 00:00. Valeurs négatives ou non
// finies → « 00:00 ». Affichage seulement (chrono de la carte produit, D27).
export function formatDuration(ms: number): string
```

Règle : `s = Math.ceil(ms / 1000)` (0 si `ms` ≤ 0 ou non fini), puis `h = floor(s / 3600)`,
`m = floor((s % 3600) / 60)`, `sec = s % 60` ; minutes et secondes toujours sur 2 chiffres
(`padStart(2, '0')`), heures sans zéro devant, absentes si `h = 0`.

| `ms` | résultat | pourquoi |
|---|---|---|
| 0 | `00:00` | |
| 1 | `00:01` | ceil |
| 500 | `00:01` | Item 1 au repos (`vitesse: 500`) |
| 2 950 | `00:03` | ceil, pas round |
| 3 000 | `00:03` | |
| 61 001 | `01:02` | ceil(61.001) = 62 s |
| 120 000 | `02:00` | Item 6 au repos |
| 3 599 000 | `59:59` | |
| 3 599 001 | `1:00:00` | ceil → 3600 s, bascule en h:mm:ss |
| 90 000 000 | `25:00:00` | heures non bornées à 24 |
| −5, `NaN`, `Infinity` | `00:00` | garde-fou, même esprit que `formatNumber` |

**`product-card.ts`** — un seul `computed` ajouté :

```ts
// Chrono : temps restant de la production en cours, ou durée d'un cycle au repos (comme
// AdVenture Capitalist : le joueur voit ce que coûtera la prochaine production). Suit le timer
// 100 ms de GameService via product().timeleft (D15).
protected readonly remainingLabel = computed(() => {
  const { vitesse, timeleft } = this.product();
  return formatDuration(timeleft > 0 ? timeleft : vitesse);
});
```

Rien d'autre ne change dans le `.ts` (`gain`, `progress`, `nextPalier`, boutons intacts).

**`product-card.html`** — dans `mat-card-content` :

- Supprimer `div.product-stats` entièrement.
- `div.product-progress` devient une ligne flex à deux enfants :
  1. `div.product-gain` (`position: relative`) contenant la `mat-progress-bar` **inchangée**
     (même `mode`, `[value]`, `aria-label`) et un `span.bar-label` avec `{{ fmt(gain()) }}`.
  2. `span.product-timer` avec `{{ remainingLabel() }}`, `role="timer"` et
     `aria-label="Temps restant"` (`aria-label` seul sur un `span` sans rôle est ignoré par les
     lecteurs d'écran ; `timer` est le rôle ARIA prévu pour un compte à rebours).

**`product-card.css`** :

- Renommer `.owned-label` en `.bar-label` (classe partagée par les deux barres : mêmes règles
  `position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
  font: var(--mat-sys-label-large); line-height: 1; color: var(--mat-sys-primary);
  mix-blend-mode: difference`), et poser `position: relative; isolation: isolate` sur
  `.product-owned` **et** `.product-gain` (sélecteur groupé). Mettre à jour le template et le
  spec de la barre d'achat en conséquence (`.owned-label` → `.bar-label`).
- `.product-progress { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }`,
  `.product-gain { flex: 1 1 auto; min-width: 0; }` (la barre prend la place restante),
  `.product-gain mat-progress-bar { display: block; }`.
- `.product-timer` : `flex: 0 0 auto; box-sizing: border-box; height: 16px; min-width: 5ch;
  padding: 0 0.25ch; border: 1px solid var(--mat-sys-primary); display: grid; place-items:
  center; font: var(--mat-sys-label-large); line-height: 1; color: var(--mat-sys-primary);
  white-space: nowrap;`. `min-width` en `ch` et non en px : VT323 est à chasse fixe, 5 ch =
  « 00:00 » exactement, et `h:mm:ss` (7 ch) élargit la boîte sans la tronquer. Pas de
  `mix-blend-mode` ici (le fond est celui de la carte).

**Exemple chiffré** (user neuf, `activeangels: 0`, onglet Produits, multiplicateur x1) :

| Moment | Carte Item 1 (`revenu 1`, `quantite 1`, `vitesse 500`) | Carte Item 6 (`vitesse 120000`) |
|---|---|---|
| Au repos | barre vide, texte « 1.00 » centré, chrono `00:01` | barre vide, « <gain> », chrono `02:00` |
| Clic Produire, tick à `timeleft = 250` | barre à 50 %, « 1.00 », chrono `00:01` | — |
| Production finie (`timeleft = 0` reçu) | barre vide, chrono `00:01` (retour à `vitesse`) | — |
| Item 6 lancé, `timeleft = 61 001` | — | barre à ~49 %, chrono `01:02` |
| Après achat de 9 Item 1 (`quantite 10`) | « 10.00 » dans la barre (gain = 10 × 1) | — |

Avant : `mat-card-content` montrait « revenu **1.00** gain/production **1.00** » puis la barre
seule ; après : la barre porte « 1.00 » et `[00:01]` est à sa droite, plus aucun mot « revenu ».

### Cas limites

- `timeleft = 0` et `vitesse = 0` (JSON absurde) → chrono `00:00`, barre à 0 (garde-fou
  existant de `progress()`).
- `timeleft` entre 1 et 999 ms → `00:01`, jamais `00:00` tant que la production tourne.
- Manager actif : `timeleft` reboucle (`GameService.tick`), le chrono redémarre à `vitesse` sans
  passer par `00:00` ; rien à coder.
- Upgrade de `vitesse` amenant un cycle sous 1 s (`floor(vitesse / ratio)`) → `00:01` en
  permanence ; pas de mode « cash/sec » à la AdCap (hors périmètre, à noter dans D27).
- Gain très grand → `formatNumber` (« 1.23 M ») ; le texte reste centré et lisible sur la
  partie remplie comme sur la piste grâce au `mix-blend-mode` (D25).
- `quantite = 0` → gain « 0.00 » dans la barre, chrono à `vitesse`, bouton Produire déjà
  désactivé (D21) : cohérent, rien à ajouter.
- Carte étroite (~320 px, x100) : la barre rétrécit (`min-width: 0`), le chrono garde ses 5 ch ;
  aucun retour à la ligne dans `.product-progress` (pas de `flex-wrap`).
- `prefers-reduced-motion` : rien à faire, aucune animation ajoutée.

### Contraintes (et pourquoi)

- **`formatDuration` dans `game-math.ts`, pas dans le composant** : fonction pure testable sans
  TestBed, à côté de `formatNumber` dont elle reprend les conventions ; le composant ne fait que
  choisir entre `timeleft` et `vitesse`.
- **Arrondi supérieur** (`ceil`) : avec `floor`, un chrono à `00:00` serait affiché pendant la
  dernière seconde alors que la barre n'est pas pleine — contradiction visuelle. Choix
  utilisateur, à noter dans D27.
- **Ne pas ajouter de timer ni d'`interval` dans la carte** : `product().timeleft` est déjà
  décrémenté toutes les 100 ms par `GameService` (D15) ; un `computed` suffit et suit le rythme.
- **Garder l'`aria-label` « Production en cours » et la structure `mat-card-actions`** : les
  tests existants (progress 75 %, vitesse 0, ordre des boutons, D26) s'y accrochent.
- **Aucune couleur nouvelle** : `border` et `color` du chrono en `var(--mat-sys-primary)`,
  `material-theme.scss` intouché (D22) ; pas de `.pip-frame` (cadre global de `styles.css` à
  padding de bloc, trop épais pour 16 px).
- **`.bar-label` partagé plutôt que dupliqué** : deux règles identiques dans le même fichier
  divergeraient au premier ajustement.
- Adapter les tests, ne pas les supprimer : le test « ne montre plus vitesse, croissance,
  timeleft… » doit rester vert — d'où `aria-label="Temps restant"` et jamais le mot `timeleft`
  dans le template. Les hauteurs et alignements ne se testent pas en jsdom : navigateur.
- Ne pas modifier `frontend/src/app/graphql/types.ts` / `operations.ts` (générés), ni le
  backend, ni `game.service.ts`.

### Hors périmètre

- L'en-tête (icône, nom, chip, barre d'achat « quantite / seuil ») : rien ne bouge au-dessus de
  `mat-card-content`, sauf le renommage de classe `.owned-label` → `.bar-label`.
- Les boutons (libellés, `[disabled]`, position d'Acheter, D17 / D20 / D21 / D26).
- Un mode « cash/sec », un affichage du `revenu` unitaire ailleurs, un tooltip.
- `UnlockList` (ses barres restent à 4 px, sans texte), `PalierList`, `AngelsPanel`, `TabBar`.
- Le timer 100 ms, sa précision, le refetch `getWorld` (D14 / D15).

### Étapes

1. Lire les fichiers ci-dessus. La feature touche 4 fichiers de code + 2 specs + 4 fichiers de
   doc : écrire un plan en 5 lignes (fonction, computed, template, CSS, tests) et le montrer
   avant de coder.
2. `game-math.ts` : `formatDuration` + tests dans `game-math.spec.ts` (au minimum les lignes du
   tableau : 0, 1, 500, 2 950, 61 001, 3 599 000, 3 599 001, 90 000 000, −5, `NaN`).
3. `product-card.ts` : `remainingLabel` ; `product-card.html` : suppression de `.product-stats`,
   nouvelle ligne `.product-progress` ; `product-card.css` : `.bar-label` partagé,
   `.product-gain`, `.product-timer`.
4. `product-card.spec.ts` : `.owned-label` → `.bar-label` dans les tests existants ; ajouter
   (a) « revenu » absent de `mat-card-content`, gain « 1.00 » dans `.product-gain .bar-label`
   (item1, `activeangels 0`) et « 10.00 » avec `quantite: 10` ; (b) chrono :
   `timeleft 0, vitesse 500` → `00:01` ; `timeleft 61001` → `01:02` ; `timeleft 250` → `00:01`
   (le test « progress 75 % » existant passe `timeleft: 250` — vérifier qu'il reste vert) ;
   (c) structure : `.product-progress` contient dans l'ordre `.product-gain` (avec la barre
   « Production en cours ») puis `.product-timer[role="timer"][aria-label="Temps restant"]`.
   Lancer `cd frontend && npm test`.
5. Vérifier (section suivante) à 1024 px puis en fenêtre étroite (`resize_window`).
6. Documentation :
   - `docs/ROADMAP.md` : remplacer la ligne « `- [ ] 9.13 … (à compléter quand frontend.pdf
     sera disponible).` » par `- [x] 9.13 Carte produit : gain dans la barre de production,
     chrono mm:ss à sa droite, ligne revenu retirée (D27)` puis réinsérer le placeholder en
     `9.14`.
   - `docs/DECISIONS.md` : ajouter **D27** en fin de fichier (contexte / décision /
     conséquences : `formatDuration` et `ceil`, `mm:ss` plutôt que le `hh:mm:ss` d'AdCap,
     `vitesse` au repos, `.bar-label` partagé, chrono en `ch` sans `mix-blend-mode`, pas de
     cash/sec, valeurs mesurées dans le navigateur). Ne pas écrire D24 / D26 (existent).
   - `frontend/CLAUDE.md` : ligne `product-card` (plus de stats, `.product-gain` + `.bar-label`,
     `.product-timer` / `remainingLabel`) et ligne `game-math` (`formatDuration`) du tableau ;
     `CLAUDE.md` racine : une phrase « Depuis 9.13, … » dans l'état actuel.

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning nouveau (le warning de budget
      `initial` 500 kB est connu, D18).
- [ ] `cd frontend && npm test` vert : `game-math.spec.ts` (≥ 8 cas `formatDuration`) et
      `product-card.spec.ts` (3 tests ajoutés, aucun supprimé).
- [ ] Serveurs lancés via les configurations `backend` et `frontend` de `.claude/launch.json`
      (jamais Bash ; s'ils tournent déjà sur 3000 / 4200, naviguer vers `http://localhost:4200`),
      user jetable (ex. `verif-913`), fenêtre à 1024 px, onglet Produits, carte Item 1 — avec
      `c = document.querySelector('app-product-card')` :
  - `c.querySelector('.product-stats') === null` et `!c.textContent.includes('revenu')`.
  - `c.querySelector('.product-gain .bar-label').textContent.trim() === '1.00'`.
  - `t = c.querySelector('.product-timer')` : `t.textContent.trim() === '00:01'` ;
    `getComputedStyle(t).height === '16px'`, `getComputedStyle(t).borderTopWidth === '1px'` ;
    `b = c.querySelector('.product-gain mat-progress-bar')` :
    `Math.abs(t.getBoundingClientRect().top - b.getBoundingClientRect().top) <= 1` (même ligne,
    même hauteur) et `t.getBoundingClientRect().left >= b.getBoundingClientRect().right + 7`
    (à droite, gap 0.5rem).
  - Clic Produire puis, dans la demi-seconde, relire `t.textContent` → `00:01` ; après la fin,
    retour à `00:01` sans passage par `00:00` (observer 2-3 lectures à 100 ms d'intervalle
    via `setInterval` dans `javascript_tool`).
  - Éditer `backend/userworlds/verif-913-world.json` : Item 6 `timeleft: 61001` (puis attendre
    le poll de 2 s) → chrono affiche `01:02` puis décroît de 1 s en 1 s ; `timeleft: 3599001`
    → `1:00:00`, boîte élargie à 7 ch sans troncature (`t.scrollWidth <= t.clientWidth`).
- [ ] `resize_window` à 360 px, multiplicateur x100 : `.product-progress` reste sur une ligne
      (`t.top` = `b.top` ±1), la barre a rétréci, aucun débordement horizontal
      (`document.documentElement.scrollWidth === innerWidth`).
- [ ] Halo (`glow`) activé puis désactivé dans Paramètres : texte du gain lisible sur la partie
      remplie (production en cours) et sur la piste ; chrono lisible.
- [ ] Capture d'écran de l'onglet Produits à 1024 px avec une production en cours (barre
      partiellement remplie, gain dedans, chrono à droite).
- [ ] `docs/ROADMAP.md` (9.13 cochée, 9.14 = placeholder), `docs/DECISIONS.md` (D27),
      `frontend/CLAUDE.md`, `CLAUDE.md` mis à jour.

### Rapport attendu

En fin de tâche : fichiers modifiés, commandes lancées avec leurs résultats réels (build, tests,
valeurs lues dans le navigateur, capture), ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : [wiki AdVenture Capitalist — Businesses](https://adventure-capitalist.fandom.com/wiki/Businesses),
[discussion Steam « Cash per Second »](https://steamcommunity.com/app/346900/discussions/0/618458030652766628/),
clone open source [0xVenture Capitalist](https://github.com/sov3333/0xVenture-Capitalist) ;
code installé (`product-card.*`, `game.service.ts` tick 100 ms, `formatNumber`) ; conventions
Angular (fonctions pures + `computed`) de mémoire.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Ligne d'un business | AdCap : montant du gain **dans** la barre, chrono encadré **à droite** | Demande identique | reprendre |
| Format du chrono | AdCap : `hh:mm:ss` toujours | `mm:ss`, `h:mm:ss` seulement ≥ 1 h (5 caractères stables en VT323) | diverge → D27 |
| Barre au repos | AdCap : durée d'un cycle affichée | `vitesse` formatée | reprendre |
| Cycles < 1 s | AdCap bascule en « cash/sec » | `ceil` → `00:01`, pas de mode cash/sec | hors périmètre → D27 |
| Arrondi | Chronos de jeu : `ceil` (jamais 00:00 pendant la course) | `ceil` | reprendre |
| Angular : formatage | Fonction pure testée à part, composant en `computed` | `formatDuration` dans `game-math.ts` | reprendre |
| Texte dans la barre | — | Technique D25 (`mix-blend-mode: difference`) validée en navigateur | reprendre, classe partagée `.bar-label` |
| Rafraîchissement | Timer local par composant dans les clones React | Timer unique de `GameService` (D15) | diverge volontairement : rien à ajouter |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Référence AdCap explicite, avant / après de `mat-card-content`, étape 9.13, D27. |
| 2 | Instructions séquencées | 2 | 6 étapes cochables ; textes exacts pour roadmap (9.13 / 9.14) et D27 ; tests (a)(b)(c) énumérés. |
| 3 | Exemples concrets | 2 | Tableau de 11 valeurs `formatDuration` (vérifiées à la main : 61 001 → 62 s → 01:02 ; 3 599 001 → 3600 s → 1:00:00) + tableau carte Item 1 / Item 6 (gain 10 × 1 = 10.00). |
| 4 | Structure lisible | 2 | Sections du gabarit, un bloc par fichier dans « Comportement attendu ». |
| 5 | Rôle et périmètre | 2 | Un composant + une fonction pure ; hors périmètre listé (en-tête, boutons, cash/sec, timer). |
| 6 | Critères mesurables | 2 | Expressions JS avec tolérances (`top` ±1, `left ≥ right + 7`), `getComputedStyle` 16 px / 1 px, `scrollWidth`, JSON édité pour 01:02 et 1:00:00. |
| 7 | Pourquoi des contraintes | 2 | `ceil` (00:00 contradictoire avec la barre), `ch` (chasse fixe VT323), pas de timer local (D15), pas de `.pip-frame` (padding), `aria-label` sans le mot `timeleft` (test existant). |
| 8 | Raisonnement guidé | 1 | Plan demandé avant de coder, ordre fonction → composant → tests ; mais la hauteur réelle du chrono avec `border` + `box-sizing` dépend du rendu, l'implémenteur doit la mesurer (critère 16 px) plutôt que la prédire. |
| 9 | Format de sortie | 2 | Fichiers nommés, D27 avec son contenu, roadmap 9.13 / 9.14, rapport. |
| 10 | Concision | 1 | « Comportement attendu » (CSS détaillé) et « Contraintes » (`.bar-label` partagé, `ch`) se recoupent en partie ; conservé car les contraintes donnent le *pourquoi*. |

Historique : v1 16/20 → v2 18/20.

Améliorations retenues (v1 → v2) :
- Critère 3 (1 → 2) : v1 n'avait que trois valeurs de `formatDuration` et aucun cas de bascule
  en `h:mm:ss` ni de `ceil` au seuil (2 950 → 00:03) ; le tableau de 11 lignes lève ces deux
  ambiguïtés, et l'exemple carte précise ce que montre le chrono à chaque moment d'un cycle
  (repos → en cours → fini), dont le retour à `vitesse`.
- Critère 6 (1 → 2) : « le chrono est à droite de la barre, même hauteur » est devenu trois
  mesures (`top` ±1, `left ≥ right + 7`, `height === '16px'`), et le comportement dans le temps
  (« jamais 00:00 pendant la course ») est observé par lectures à 100 ms plutôt qu'affirmé.
- Critère 7 (1 → 2) : ajout des raisons du `ceil`, du `min-width` en `ch`, du refus du
  `.pip-frame` et de l'`aria-label` « Temps restant » (le test existant interdit le mot
  `timeleft` dans la carte) — sans cela un implémenteur aurait pu choisir `floor`, un
  `width` en px ou réutiliser le cadre global.
