# Prompt — Bouton de production grisé sans exemplaire du produit

- Date : 2026-09-19
- Étape roadmap : 9.7 (nouvelle ligne à insérer, voir Étapes) — suppose 9.6 terminée
  (`manager-pause.md`)
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « le bouton pour produire doit être grisé quand
  j'ai pas au moins 1 exemplaire d'un produit »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22.1 standalone + signals, `@apollo-orbit/angular`,
Angular Material 22.1, tests vitest). Réponds en français ; code et commentaires selon `CLAUDE.md`
et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP : cette feature touche **une seule
carte** (`ProductCard`) et la documentation qui décrit son comportement — rien d'autre, et rien
dans `backend/`.

### Objectif

Dans un monde neuf, seul « Item 1 » a un exemplaire (`quantite: 1`) ; les cinq autres produits
sont à `quantite: 0`. Cliquer « Produire » sur l'un d'eux envoie `lancerProductionProduit`, que le
backend refuse (`throw`, D12 : « Aucun exemplaire de Item 2 à produire ») ; le joueur voit alors
le bandeau d'erreur rouge, ce qui n'a rien d'un jeu idle. On veut que le **bouton de production
de la carte soit désactivé tant que `product.quantite === 0`**, quel que soit son libellé
(Produire / Arrêter / Reprendre), exactement comme le bouton Acheter l'est déjà faute d'argent
(D17). Aucune règle de jeu ne change : le serveur garde son `throw`, le front se contente de ne
plus envoyer une mutation vouée à l'échec. C'est l'étape **9.7** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — en particulier la ligne des conventions qui dit
   que le bouton Produire / Arrêter / Reprendre n'est « jamais désactivé » : c'est cette phrase
   que tu vas rendre fausse, il faudra la corriger.
2. `docs/DECISIONS.md` — D12 (le backend refuse `quantite === 0`, à conserver tel quel), D17 (règle
   des boutons désactivés : `[disabled]` natif, mêmes comparaisons que le serveur, serveur seul
   juge), D20 « Mutation `basculerManager` » (les trois libellés du bouton ; **D20 existe deux
   fois dans le fichier, ne pas renuméroter** — la nouvelle entrée sera D21).
3. `frontend/src/app/product-card.ts` (`productionLabel`, `canBuy`, `onProductionClick`),
   `product-card.html` (les deux boutons de `mat-card-actions` et leurs commentaires),
   `product-card.spec.ts` (hôte `Host`, helper `productionButton`, les trois tests « sans
   manager » / « Arrêter » / « Reprendre » qui affirment `button.disabled === false`).
4. `backend/src/origworld.ts` — juste pour vérifier que « Item 2 » vaut `cout: 60`,
   `quantite: 0` (base de l'exemple ci-dessous) ; **ne pas le modifier**.

### Comportement attendu

Dans `ProductCard`, ajouter un `computed` `canProduce = product().quantite > 0` et le lier au
bouton de production par `[disabled]="!canProduce()"` — même mécanisme que `canBuy` sur Acheter.
Le libellé (`productionLabel`) et `onProductionClick` ne changent pas : un bouton désactivé ne
déclenche pas `(click)`, donc aucun output (`launch`, `toggleManager`) n'est émis.

Exemple (monde neuf, `money` crédité à 60 via le playground ou en éditant
`backend/userworlds/<user>-world.json`) :

| Instant | Écran | Pourquoi |
|---|---|---|
| Chargement | Item 1 : « Produire » **actif** ; Items 2 à 6 : « Produire » **grisé**, « Acheter x1 — 60.00 » actif sur Item 2 | `quantite` 1 vs 0 ; `money 60 ≥ cout 60` (D17, égalité permise) |
| Clic « Acheter x1 » sur Item 2 | `acheterQtProduit(id: 2, quantite: 1)` puis `getWorld` → Item 2 `quantite: 1` : « Produire » **redevient actif** | `canProduce` recalculé à la réception du nouveau `world` (D14 : `getWorld` refait après chaque mutation) |
| Clic « Produire » sur Item 2 | `lancerProductionProduit(id: 2)` → `timeleft: 3000`, la barre se remplit, le bouton **reste actif** | on ne désactive pas pendant une production en cours : D12 en fait un no-op côté serveur |

Cas manager (rare mais atteignable : `engagerManager` ne vérifie pas `quantite`) : « Manager 2 »
engagé sur Item 2 à 0 exemplaire → le bouton affiche « Arrêter » **grisé** ; après achat d'un
exemplaire il redevient actif avec le même libellé. La règle est une seule condition
(`quantite > 0`), indépendante de `managerOwned` et `managerUnlocked`.

### Cas limites

- `quantite === 0` et `timeleft > 0` (fichier `userworlds/` incohérent) → grisé : `quantite`
  seule décide.
- `quantite === 0` et `managerUnlocked: true` sans manager possédé (cas déjà testé « chip affichée
  seulement si… ») → « Produire » grisé.
- Le solde/quantité peuvent dater de 2 s (D15) : le serveur reste seul juge, le `throw` D12 et le
  bandeau d'erreur restent en place pour le playground ou une course entre deux onglets.

### Contraintes (et pourquoi)

- `[disabled]` natif sur le bouton Material, pas de classe CSS ni de `pointer-events` — les specs
  lisent `button.disabled` (D17/D18) et Material rend l'état grisé tout seul.
- Aucun tooltip, aucun texte explicatif, aucun `MatTooltipModule` — décision prise en amont pour
  rester aligné sur Acheter (D17) ; un tooltip sur bouton `disabled` exigerait en plus un wrapper.
- Ne pas désactiver pendant `timeleft > 0` — le backend traite ce clic comme un no-op (D12), et
  l'état dépendrait du timer local 100 ms (D15) : on éviterait un « rien » au prix d'un bouton
  qui clignote.
- Ne pas toucher à `backend/` (ni `resolver.ts`, ni `schema.graphql`, ni `graphql.ts` généré) : le
  garde-fou serveur D12 est la défense en profondeur, le front ne fait que l'anticiper.
- Ne pas modifier `game.service.ts`, `app.html`, `app.ts` : `ProductCard` a déjà tout ce qu'il
  faut dans `product()`.
- Commentaires en français, `computed` (pas de logique dans le template), imports Material
  inchangés.

### Hors périmètre

- Cacher la carte ou son bouton quand `quantite === 0` (AdVenture Capitalist masque la ligne tant
  que le business n'est pas acheté) : ici on grise, on ne masque pas — le sujet frontend n'est pas
  encore fourni.
- Toute modification du backend, de ses tests ou de `docs/GAME-RULES.md`.
- Désactiver le bouton Reset ou le champ user (restent « jamais désactivés »).

### Étapes

1. Lire les fichiers ci-dessus (4 fichiers touchés au plus : pas de plan nécessaire) et lancer
   `cd frontend && npx vitest run src/app/product-card.spec.ts` pour partir d'un état vert.
   **Point d'arrêt** : si `productionLabel` / `canBuy` n'existent pas dans `product-card.ts`, ou si
   les trois tests « Produire » / « Arrêter » / « Reprendre » sont absents du spec, l'étape 9.6
   n'est pas dans l'état décrit ici — s'arrêter et le signaler plutôt que d'adapter ce prompt.
2. `product-card.ts` : ajouter `canProduce`, mettre à jour le commentaire de `productionLabel`
   (« Jamais désactivé (D17) » → « Désactivé si quantite = 0 (D21) »).
3. `product-card.html` : `[disabled]="!canProduce()"` sur le bouton de production, commentaire
   HTML mis à jour.
4. `product-card.spec.ts` : ajouter, dans le bloc des trois états (D20), des tests avec
   `product.set({ ...item1, quantite: 0 })` : (a) sans manager → « Produire » `disabled`, clic
   n'incrémente pas `launched` ; (b) `managerOwned: true` + `managerUnlocked: true` → « Arrêter »
   `disabled`, `toggled` reste 0 ; (c) retour à `quantite: 1` → `disabled === false`. Les tests
   existants (quantite 1 → `disabled === false`) doivent rester verts sans modification.
5. Documentation : `docs/DECISIONS.md` — nouvelle entrée `## D21 — Frontend : bouton de production
   désactivé sans exemplaire` (Contexte / Décision (phase 9.7, 2026-09-19) / Conséquences, même
   format que D17) et une ligne `- **Amendement** : …` à la fin de D17 renvoyant à D21 ;
   `frontend/CLAUDE.md` — corriger la phrase « jamais désactivé » (le bouton de production l'est
   si `quantite = 0`, D21 ; Reset et champ user restent jamais désactivés) et la ligne
   `product-card` du tableau ; `docs/ROADMAP.md` — insérer `- [ ] 9.7 Bouton de production grisé
   sans exemplaire (D21) : …` avant la ligne « 9.7 … (à compléter) » qui devient 9.8.
6. Vérifier (section suivante), puis cocher 9.7.

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` et `npx vitest run` : 0 erreur, tous les specs verts (y compris
      les 3 nouveaux tests).
- [ ] Backend lancé (config `backend` de `.claude/launch.json`), front lancé (config `frontend`),
      user neuf `test-9-7` : dans la grille, Item 1 a « Produire » cliquable, Items 2-6 ont
      « Produire » grisé (`button.disabled === true` via l'inspecteur ou `read_page`).
- [ ] Créditer 60 $ à `test-9-7` (éditer `backend/userworlds/test-9-7-world.json` → `"money": 60`,
      ou attendre les productions d'Item 1), cliquer « Acheter x1 — 60.00 » sur Item 2 : au
      `getWorld` suivant (≤ 2 s), « Produire » d'Item 2 est actif ; cliquer dessus → la barre
      d'Item 2 progresse, **aucun bandeau d'erreur**.
- [ ] Playground : `mutation { lancerProductionProduit(user: "test-9-7", id: 3) { id } }` renvoie
      toujours `errors[0].message = "Aucun exemplaire de Item 3 à produire"` (backend intact).
- [ ] `grep -n "jamais désactivé" frontend/CLAUDE.md` ne mentionne plus le bouton de production ;
      `docs/DECISIONS.md` contient `## D21` ; `docs/ROADMAP.md` a `[x] 9.7`.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm run build` et `npx vitest run`
(nombre de tests), capture ou description de l'écran avant/après achat d'Item 2, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Pas de recherche web (feature de quelques lignes) : tableau établi de mémoire, à partir des
mécaniques connues d'AdVenture Capitalist / Cookie Clicker et des guides Angular / Material.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Produit non possédé | AdVenture Capitalist : la ligne n'est pas cliquable, seul « Buy » est visible ; Cookie Clicker : bâtiment grisé | Carte visible, bouton grisé, Acheter actif | reprendre (griser, pas masquer — le sujet frontend n'est pas fourni) |
| Clic pendant une production | AdVenture Capitalist : la barre ne réagit pas au clic, bouton non grisé | no-op serveur (D12), bouton actif | identique — ne pas griser (choix utilisateur) |
| Garde-fou serveur | Idle games multi-joueurs : validation serveur même si l'UI grise | D12 conservé, front anticipe seulement | identique à D17 (« serveur seul juge ») |
| État désactivé Material | `[disabled]` sur `matButton` → attribut natif ; `disabledInteractive` uniquement si tooltip | `[disabled]` natif, pas de tooltip | reprendre (D17/D18) |
| Où calculer l'état | Angular : `computed()` dérivé des inputs, template sans logique | `canBuy` déjà en `computed` | reprendre (`canProduce`) |
| Tests | Angular testing : lire `button.disabled`, hôte de test avec signaux | `product-card.spec.ts` le fait déjà | reprendre, étendre les 3 tests D20 |
| Documentation de la divergence | — | D17 dit « jamais désactivé » | décision à noter (D21 + amendement D17) |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Objectif chiffré (5 produits à 0 dans un monde neuf), problème actuel (bandeau rouge), étape 9.7 |
| 2 | Instructions séquencées | 2 | 6 étapes, chacune avec le fichier et le contenu exact ; doc et roadmap incluses |
| 3 | Exemples concrets | 2 | Tableau chargement → achat → production sur Item 2 (cout 60 vérifié dans `origworld.ts`) + cas manager |
| 4 | Structure lisible | 2 | Sections du gabarit, contraintes isolées, cas limites à part |
| 5 | Rôle et périmètre | 2 | Frontend seul, fichiers interdits nommés, hors périmètre explicite (masquer la carte, backend) |
| 6 | Critères mesurables | 2 | build + vitest, état DOM `disabled`, mutation playground avec message exact, greps sur la doc |
| 7 | Le « pourquoi » | 2 | Chaque contrainte motivée (specs lisent `disabled`, no-op D12, timer D15, wrapper tooltip) |
| 8 | Raisonnement guidé | 2 | Lecture préalable, spec lancé avant d'écrire, point d'arrêt explicite si l'état 9.6 ne correspond pas à la description |
| 9 | Format de sortie | 2 | Fichiers à modifier, contenu de D21 / amendement D17 / ligne 9.7, rapport attendu |
| 10 | Concision / cohérence | 1 | Quelques redites (règle « quantite seule décide » dite trois fois : comportement, cas manager, cas limites) |

Historique : v1 16/20 → v2 18/20 → v3 19/20.
Améliorations retenues : v1 ne disait pas quoi faire de la ligne « 9.7 … (à compléter) » ni du
doublon D20 (critère 9 : 1 → 2) ; les critères de succès v1 (« le bouton est grisé ») ont été
remplacés par des observations DOM, une mutation playground et des greps (critère 6 : 1 → 2) ; v3
ajoute le point d'arrêt de l'étape 1 (critère 8 : 1 → 2). Les
redites du critère 10 sont conservées volontairement : elles couvrent trois situations distinctes
(sans manager, avec manager, données incohérentes) et une session vierge ne les déduirait pas
d'une seule règle.
