# Prompt — Chip « manager » à texte constant (plus de « (en pause) »)

- Date : 2026-09-19
- Étape roadmap : 9.15 (remplace la ligne « 9.15 … (à compléter) ») — suppose 9.6 (D20) et 9.14
  (D29) terminées
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « enlève le fait que quand j'arrête une
  production ça met le manager en pause, laisse le texte manager comme il est »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22.1 standalone + signals, `@apollo-orbit/angular`,
Angular Material 22.1, tests vitest). Réponds en français ; code et commentaires selon `CLAUDE.md`
et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP : cette modification touche **le
template d'une seule carte** (`ProductCard`), sa spec et la documentation qui décrit la carte —
rien d'autre, et rien dans `backend/`.

### Objectif

Quand un manager est engagé sur un produit, la carte affiche une chip à droite du nom. Aujourd'hui
son texte dépend de l'état de l'automatisation : `manager` si elle tourne, `manager (en pause)`
après un clic sur « Arrêter » (D20). Le joueur trouve ce changement de texte inutile : le bouton
qui passe d'« Arrêter » à « Reprendre » et la barre de production qui s'arrête à 0 disent déjà
que le manager est en pause. On veut que la **chip affiche toujours `manager`** dès que le manager
est possédé, quel que soit `product.managerUnlocked`. La mécanique de pause (mutation
`basculerManager`, bouton à trois libellés) **ne change pas** : seul le texte de la chip devient
constant. C'est l'étape **9.15** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine, § « État actuel ») et `frontend/CLAUDE.md` (ligne `product-card` du
   tableau : elle dit « chip « manager » / « manager (en pause) » si `managerOwned` » — c'est
   cette description que tu vas rendre fausse, il faudra la corriger).
2. `docs/DECISIONS.md` — D20 « Mutation `basculerManager` » (**D20 existe deux fois dans le
   fichier, ne pas renuméroter** ; c'est la seconde, « pause de l'automatisation », qui décrit la
   chip) et D25 (mentionne la chip « (en pause) » comme cas de test de mise en page à 700 px :
   **ne pas l'éditer**, c'est le compte rendu d'une vérification passée). La dernière entrée est
   D29 : la nouvelle sera **D30**.
3. `frontend/src/app/product-card.html` (bloc `@if (managerOwned())` de `.product-title-row`),
   `product-card.ts` (input `managerOwned`, `productionLabel` — à laisser intacts, seuls leurs
   commentaires peuvent être relus), `product-card.spec.ts` (bloc des trois états D20 : tests
   « sans manager », « manager possédé et actif », « manager possédé en pause »).

### Comportement attendu

Dans `product-card.html`, remplacer
`<mat-chip>{{ product().managerUnlocked ? 'manager' : 'manager (en pause)' }}</mat-chip>`
par `<mat-chip>manager</mat-chip>`. Le `@if (managerOwned())` qui entoure la chip, la classe
`manager` et l'`aria-label="Manager engagé"` du `mat-chip-set` restent.

Exemple (user avec « Manager 1 » engagé sur Item 1, `quantite ≥ 1`) :

| Instant | Bouton | Chip | Barre de production |
|---|---|---|---|
| Automatisation active | « Arrêter » | `manager` | tourne en boucle |
| Clic « Arrêter » → `basculerManager(id: 1)` → `getWorld` (`managerUnlocked: false`) | « Reprendre » | `manager` (**inchangée**, aujourd'hui `manager (en pause)`) | finit son cycle puis reste à 0, chrono = `vitesse` |
| Clic « Reprendre » → `basculerManager(id: 1)` → `getWorld` (`managerUnlocked: true`) | « Arrêter » | `manager` | repart |
| Manager non possédé (`managerOwned: false`) | « Produire » | **aucune chip** | manuel |

Le seul changement observable est la colonne « Chip » de la deuxième ligne.

### Cas limites

- `managerUnlocked: true` sans manager possédé (fichier `userworlds/` incohérent) → toujours
  « Produire » sans chip : la chip dépend de `managerOwned` seul, comme avant (test existant
  « chip affichée seulement si le manager est possédé »).
- `quantite = 0` avec manager possédé → « Arrêter » ou « Reprendre » grisé (D21), chip `manager`.
- Carte étroite (~328 px) : la chip passe sous le nom (`.product-title-row` en `flex-wrap: wrap`) ;
  le texte étant plus court, ce cas devient plus rare — aucun CSS à toucher.

### Contraintes (et pourquoi)

- Ne pas modifier `productionLabel`, `onProductionClick`, l'input `managerOwned` ni la mutation
  `basculerManager` (`game.service.ts`, `app.html`, `backend/`) — la pause reste fonctionnelle,
  seul son reflet dans la chip disparaît ; le bouton « Reprendre » devient l'**unique** indicateur
  textuel de pause, c'est voulu (une chip Material représente un attribut, pas un état transitoire).
- Pas de style différent pour la chip en pause (opacité, couleur) — choix explicite de
  l'utilisateur : « Reprendre » suffit. Ne pas ajouter de tooltip ni de `MatTooltipModule`.
- Garder l'`aria-label` « Manager engagé » sur `mat-chip-set` — un lecteur d'écran connaît l'état
  par le libellé du bouton, la chip n'a pas à le répéter.
- Ne pas toucher `product-card.css` : la règle `.product-title-row { flex-wrap: wrap }` protège
  toujours le nom (jamais tronqué) si la carte est étroite.
- Ne pas modifier `backend/src/graphql.ts` (généré) ni `docs/GAME-RULES.md` (aucune règle de jeu
  ne change).
- Commentaires en français ; le commentaire HTML au-dessus de la chip, s'il en faut un, tient en
  une ligne (« texte constant : la pause se lit sur le bouton, D30 »).

### Hors périmètre

- Retirer la mécanique de pause (Arrêter / Reprendre, `basculerManager`) : l'utilisateur veut la
  garder.
- Masquer la chip quand l'automatisation est en pause : la chip signale la **possession** du
  manager, pas son activité.
- Toute modification du backend, de ses tests, de `GameService` ou d'`App`.
- Éditer l'entrée D25 de `DECISIONS.md` (compte rendu historique).

### Étapes

1. Lire les fichiers ci-dessus (3 fichiers de code touchés au plus : pas de plan nécessaire) et
   lancer `cd frontend && npx vitest run src/app/product-card.spec.ts` pour partir d'un état
   vert. **Point d'arrêt** : si le template ne contient pas le ternaire
   `managerUnlocked ? 'manager' : 'manager (en pause)'`, ou si le test « manager possédé en
   pause : « Reprendre », chip « manager (en pause) » » n'existe pas, l'état du dépôt ne
   correspond pas à ce prompt — s'arrêter et le signaler plutôt que d'adapter.
2. `product-card.html` : texte constant `manager`, commentaire d'une ligne.
3. `product-card.spec.ts` : dans le test « manager possédé en pause », attendre
   `'manager'` au lieu de `'manager (en pause)'` et renommer le test (« chip « manager » »). Le
   test « manager possédé et actif » est déjà correct et ne bouge pas. Ajouter une assertion
   dans l'un des deux tests : `el.textContent` ne contient pas `'(en pause)'`.
4. Documentation :
   - `docs/DECISIONS.md` — nouvelle entrée `## D30 — Frontend : chip « manager » à texte
     constant` (Contexte / Décision (phase 9.15, 2026-09-19) / Conséquences, même format que
     D21 ; Conséquences : « Reprendre » est le seul indicateur textuel de la pause, D25 garde sa
     mention historique) et une ligne `- **Amendement** : la chip affiche toujours `manager`
     depuis D30.` à la fin de la seconde entrée D20.
   - `frontend/CLAUDE.md` — ligne `product-card` du tableau : « chip « manager » si
     `managerOwned` (texte constant, D30 ; l'état de pause ne se lit que sur le bouton
     Reprendre) », et la parenthèse « manager possédé en pause » du libellé Reprendre reste.
   - `CLAUDE.md` (racine) — une phrase dans « État actuel » : « Depuis 9.15, la chip manager de
     la carte garde le texte `manager` en pause (D30). »
   - `docs/ROADMAP.md` — remplacer `- [ ] 9.15 … (à compléter quand `frontend.pdf` sera
     disponible).` par `- [x] 9.15 Chip « manager » à texte constant (D30) : le ternaire
     « manager » / « manager (en pause) » disparaît de `product-card.html`, la pause ne se lit
     que sur le bouton Reprendre.` puis ajouter `- [ ] 9.16 … (à compléter quand `frontend.pdf`
     sera disponible).`
5. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` et `npx vitest run` : 0 erreur, tous les specs verts.
- [ ] `grep -rn "(en pause)" frontend/src` ne renvoie **aucune ligne** (`product-card.html` et
      `product-card.spec.ts` compris) ; le mot « pause » peut subsister dans les commentaires de
      `product-card.ts` (il décrit l'état, pas un texte affiché).
- [ ] Backend lancé (config `backend` de `.claude/launch.json`), front lancé (config `frontend`),
      user neuf `test-9-15` : créditer le seuil de « Manager 1 » (éditer
      `backend/userworlds/test-9-15-world.json` → `"money": 1000`, seuil de « Manager 1 » dans
      `origworld.ts`, ou attendre),
      l'engager depuis l'onglet Managers, revenir sur Produits : Item 1 affiche « Arrêter » et la
      chip `manager`. Cliquer « Arrêter » : au `getWorld` suivant (≤ 2 s) le bouton dit
      « Reprendre », la chip dit **toujours** `manager` (`read_page` ou inspecteur :
      `mat-chip` textContent = `manager`), la barre finit son cycle et s'arrête. Cliquer
      « Reprendre » : « Arrêter » revient, la barre repart.
- [ ] Playground : `mutation { basculerManager(user: "test-9-15", id: 1) { id managerUnlocked } }`
      bascule toujours `managerUnlocked` (backend intact).
- [ ] `grep -n "D30" docs/DECISIONS.md frontend/CLAUDE.md CLAUDE.md docs/ROADMAP.md` trouve les
      quatre fichiers ; `docs/ROADMAP.md` a `[x] 9.15` et une ligne `[ ] 9.16 … (à compléter`.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm run build` et `npx vitest run`
(nombre de tests), description ou capture de la carte Item 1 avant / après « Arrêter », ce qui
reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Pas de recherche web (modification d'une ligne de template) : tableau établi de mémoire.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Indicateur manager | AdVenture Capitalist : portrait du manager affiché en permanence, jamais d'état textuel (un manager est définitif) | La chip devient un pur indicateur « possédé », comme le portrait AdCap | reprendre |
| État de pause | Jeux idle avec pause (clones open source) : l'état se lit sur le bouton d'action (Pause / Resume), pas répété ailleurs | Bouton Arrêter / Reprendre déjà là ; la chip le répétait | reprendre (une seule source visible) |
| Chips Material | M3 : une chip représente un attribut ou un tag, pas un état transitoire | Chip texte constant `manager` | reprendre |
| Logique de template | Angular : pas de ternaire métier dans le HTML | Le ternaire disparaît | reprendre |
| Accessibilité | L'état doit rester perceptible autrement | « Reprendre » + barre à 0 + `aria-label` « Manager engagé » conservé | identique, rien à ajouter |
| Écart documenté | — | D20 et D25 décrivent la chip « (en pause) » | décision à noter : D30 + amendement D20, D25 laissée (historique) |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Ce que voit le joueur aujourd'hui, pourquoi ça gêne (redondance avec le bouton), ce qui change et ce qui ne change pas, étape 9.15 |
| 2 | Instructions séquencées | 2 | 5 étapes avec fichier, contenu exact (texte du template, assertion, libellés D30 / roadmap) |
| 3 | Exemples concrets | 2 | Tableau actif → Arrêter → Reprendre → non possédé avec la seule cellule qui change mise en évidence |
| 4 | Structure lisible | 2 | Sections du gabarit, contraintes et hors périmètre isolés |
| 5 | Rôle et périmètre | 2 | Frontend, un template ; interdits nommés (backend, `productionLabel`, D25, style de chip) |
| 6 | Critères mesurables | 2 | build + vitest, grep « (en pause) » à zéro résultat, textContent de `mat-chip` avant/après, mutation playground, greps doc |
| 7 | Le « pourquoi » | 2 | Chaque contrainte motivée (chip = attribut, bouton = indicateur unique, D25 historique, CSS wrap) |
| 8 | Raisonnement guidé | 2 | Lecture préalable, spec lancé avant d'écrire, point d'arrêt si le ternaire ou le test attendu manque |
| 9 | Format de sortie | 2 | Fichiers et textes de D30 / amendement D20 / CLAUDE.md / roadmap 9.15 + 9.16, rapport attendu |
| 10 | Concision / cohérence | 1 | « La chip signale la possession, pas l'activité » revient trois fois (objectif, contraintes, hors périmètre) |

Historique : v1 17/20 → v2 19/20.
Améliorations retenues : v1 ne disait pas quoi faire de D25 (qui cite la chip « (en pause) ») ni
que D20 existe en double (critère 9 : 1 → 2) ; les critères de succès v1 (« la chip dit
manager ») ont été remplacés par un grep à zéro résultat, la lecture de `textContent` et une
mutation playground prouvant que le backend est intact (critère 6 : 1 → 2). La redite du
critère 10 est conservée : elle ferme trois portes différentes (retirer la pause, masquer la
chip, styler la chip) qu'une session vierge pourrait ouvrir « par logique ».
