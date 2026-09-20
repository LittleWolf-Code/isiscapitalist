# Prompt — Engager un manager exige au moins un exemplaire du produit

- Date : 2026-09-19
- Étape roadmap : 9.10 (nouvelle ligne à insérer, voir Étapes) — suppose 9.9 terminée
- Sous-projet : **les deux** (garde-fou backend + bouton grisé frontend)
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « j'ai un bug si j'achete un manager alors que
  j'ai pas de quantité de l'objet la barre avance dans la page produit, empeche l'achat de manager
  pour un produit avec un quantité de 0 »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`,
Angular Material 22.1, tests vitest). Réponds en français ; code et commentaires selon `CLAUDE.md`,
`backend/CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur du TP : cette correction touche
**une mutation** côté backend et **une liste** côté frontend, plus la documentation qui les décrit.

### Objectif

Bug constaté : dans un monde neuf, seul « Item 1 » a un exemplaire ; les cinq autres produits sont
à `quantite: 0`. Or `engagerManager` (backend) ne vérifie pas la quantité du produit cible : avec
assez d'argent, on peut engager « Manager 2 » sur « Item 2 » à 0 exemplaire. Le resolver passe alors
`product.managerUnlocked = true`, et `updateWorld` suit la branche « avec manager » : la barre de
production d'Item 2 tourne en boucle sur la page Produits **pour un gain de 0** (`gain = quantite ×
revenu × …`). Le joueur a payé 15 000 $ pour une barre qui avance à vide.

On veut que **l'engagement d'un manager soit refusé tant que son produit cible n'a aucun
exemplaire**, aux deux niveaux habituels du projet : le backend `throw` (comme D12 pour
`lancerProductionProduit`), le frontend grise le bouton « Engager » de la ligne (comme D17/D21).
Aucune formule ne change. C'est l'étape **9.10** de `docs/ROADMAP.md`, décision **D24**.

### À lire avant d'écrire

1. `CLAUDE.md` (racine), `backend/CLAUDE.md`, `frontend/CLAUDE.md` — la ligne du tableau
   `palier-list` et la convention « boutons d'achat désactivés » (liste des comparaisons D17) sont
   à mettre à jour.
2. `docs/GAME-RULES.md` § « Managers — `engagerManager` » — y ajouter la nouvelle vérification.
3. `docs/DECISIONS.md` — D12 (garde-fou `quantite === 0` de `lancerProductionProduit`, modèle du
   message d'erreur), D17 (règle des boutons désactivés : `[disabled]` natif, mêmes comparaisons que
   le serveur, serveur seul juge), D20 « Mutation `basculerManager` » (deux notions : `manager.unlocked`
   = possédé, `product.managerUnlocked` = automatisation active), D21 (bouton Produire grisé à
   `quantite = 0`). La dernière entrée est D23 : la nouvelle sera **D24**.
4. `backend/src/resolver.ts` — `lancerProductionProduit` (le `throw` D12 à imiter) et
   `engagerManager` (ordre actuel des vérifications : déjà engagé → argent).
5. `backend/test/world.e2e-spec.ts` — helpers `gql`, `readFile`, `writeFile`, test « engagerManager
   refuse si l'argent manque » (modèle du nouveau test).
6. `frontend/src/app/palier-list.ts` / `.html` / `.spec.ts` — input `balance`, méthode
   `isDisabled(palier)`, hôte de test `Host`.
7. `frontend/src/app/app.ts` / `.html` — `managerOwned`, `computed angelsEarned`, et le
   `@case ('managers')` qui monte `PalierList` avec `[balance]="world.money"`.
8. `frontend/src/app/game-math.ts` / `.spec.ts` — fonctions pures d'affichage (`nextUnlock`,
   `angelsEarned`) : la nouvelle fonction suit ce modèle.
9. `backend/src/origworld.ts` — pour vérifier les chiffres de l'exemple : « Manager 2 » `seuil:
   15000`, `idcible: 2` ; « Item 2 » `quantite: 0`, `cout: 60`. **Ne pas le modifier.**

### Comportement attendu

**Backend** — dans `engagerManager`, après la vérification « déjà engagé » et **avant** « pas assez
d'argent », lever :

```ts
throw new Error(`Aucun exemplaire de ${product.name} : achetez le produit avant d'engager son manager`);
```

quand `product.quantite === 0` (`product` = `findProduct(world, manager.idcible)`, à remonter
avant la vérification d'argent). Rien n'est débité, aucun flag ne change, le monde est tout de même
sauvegardé après `updateWorld` (règle 4 de `CLAUDE.md`) — même schéma que le `throw` D12.

**Frontend** — `PalierList` reçoit un nouvel input optionnel `blockedNames: readonly string[]`
(défaut `[]`) : les paliers dont le `name` y figure ont leur bouton d'action désactivé, en plus des
conditions existantes de `isDisabled`. `App` fournit cet input **uniquement** à la liste Managers,
via un `computed` alimenté par une fonction pure `blockedManagerNames(world)` de `game-math.ts` :
noms des managers non `unlocked` dont le produit `idcible` a `quantite === 0`. Les listes Upgrades,
Bonus (anges) et All unlocks ne passent pas l'input et gardent leur comportement.

Exemple (monde neuf pour le user `test-9-10`, `money` mis à 20 000 en éditant
`backend/userworlds/test-9-10-world.json`) :

| Instant | Backend | Écran (onglet Managers) | Pourquoi |
|---|---|---|---|
| Chargement | — | « Manager 1 » : Engager **actif** ; « Manager 2 » : Engager **grisé** | Item 1 `quantite: 1`, Item 2 `quantite: 0` ; `money 20000 ≥ seuil` des deux |
| Playground : `engagerManager(user: "test-9-10", name: "Manager 2")` | `errors[0].message = "Aucun exemplaire de Item 2 : achetez le produit avant d'engager son manager"`, `money` reste 20 000, `managers[1].unlocked` et `products[1].managerUnlocked` restent `false` | inchangé | garde-fou serveur, quel que soit le client |
| Onglet Produits, « Acheter x1 — 60.00 » sur Item 2 | `acheterQtProduit(id: 2, quantite: 1)` → Item 2 `quantite: 1` | Onglet Managers : « Manager 2 » Engager **redevient actif** | `blockedManagerNames` recalculé au `getWorld` suivant (D14) |
| Clic Engager sur « Manager 2 » | `engagerManager` réussit : `money 19 940 − 15 000 = 4 940`, `managers[1].unlocked: true`, `products[1].managerUnlocked: true` | Onglet Produits : la barre d'Item 2 tourne, le gain est crédité | comportement nominal, inchangé |

### Cas limites

- Manager déjà `unlocked` sur un produit revenu à `quantite: 0` (impossible en jeu : la quantité
  ne baisse qu'au reset, qui remet aussi `unlocked: false`) → backend : « déjà engagé » (vérifié
  en premier) ; front : bouton déjà grisé par `palier.unlocked`, le manager **n'est pas** dans
  `blockedManagerNames` (on ne liste que les non possédés).
- `quantite: 0` **et** argent insuffisant → message « Aucun exemplaire … » (la quantité est
  vérifiée avant l'argent : dire « pas assez d'argent » à un joueur qui ne possède pas le produit
  l'enverrait sur une fausse piste).
- `blockedNames` contient un nom absent de `paliers` → ignoré, aucune erreur.
- Fichier `userworlds/` **déjà** dans l'état bogué (manager engagé sur un produit à 0 avant cette
  correction) → laissé tel quel : la barre continue de tourner à gain 0 jusqu'à l'achat d'un
  exemplaire ou un reset. `updateWorld` n'est pas modifié (voir Contraintes).
- Le solde/quantité côté front peuvent dater de 2 s (D15) : le serveur reste seul juge, le
  bandeau d'erreur reste en place pour le playground ou une course entre deux onglets.

### Contraintes (et pourquoi)

- **Ne pas toucher à `updateWorld`** (`backend/src/world-engine.ts`) ni à ses specs — le jeu de
  tests officiel du sujet (`backend/test/production-samples.*`) fixe son comportement ; on bloque
  l'entrée dans l'état incohérent, on ne change pas le moteur.
- Ne pas modifier `backend/src/schema.graphql` (aucune nouvelle opération : la mutation existante
  gagne une vérification) ni `backend/src/graphql.ts` (généré au démarrage).
- Message d'erreur via `throw new Error(...)` dans le resolver, comme les autres vérifications
  d'`engagerManager` — c'est ce qui produit `errors[0].message` lu par les tests e2e et affiché
  dans le bandeau du front.
- `[disabled]` natif sur le bouton Material, pas de classe CSS ni de `pointer-events` — les specs
  lisent `button.disabled` (D17/D18) et Material rend l'état grisé tout seul.
- Aucun tooltip, aucun texte explicatif dans la ligne, aucun `MatTooltipModule` — même choix que
  D17 et D21 ; un tooltip sur un bouton `disabled` exigerait en plus un wrapper.
- `PalierList` reste présentationnelle et **agnostique des produits** : elle reçoit des noms, pas
  `world.products` — le composant sert à quatre listes dont trois n'ont pas de notion de produit
  cible.
- La dérivation est une fonction pure de `game-math.ts` (pas un `computed` inline dans `App`) —
  `app.spec.ts` n'a aucun test avec un monde chargé ; `game-math.spec.ts` teste la logique sans
  TestBed.
- Ne pas modifier `game.service.ts`, `product-card.*`, `basculerManager` : le bouton
  Reprendre/Arrêter est déjà grisé à `quantite = 0` par D21.
- Commentaires en français, `computed`/fonction pure (pas de logique dans le template), imports
  Material inchangés.

### Hors périmètre

- Masquer la ligne du manager tant que le produit n'est pas possédé (AdVenture Capitalist le
  fait) : ici on grise, on ne masque pas — le sujet frontend n'est pas encore fourni.
- Corriger ou migrer les fichiers `userworlds/` existants.
- Appliquer la même règle aux upgrades (`acheterCashUpgrade`) ou aux angel upgrades : ils ne
  déclenchent aucune production.
- Toute modification de `updateWorld`, du schéma, du `ProductCard`.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche 5 fichiers de code + 3 specs + 4 fichiers de
   doc : écrire un plan en 5 lignes et le montrer avant de coder. Lancer `cd backend && npm test`
   et `cd frontend && npx vitest run` pour partir d'un état vert.
   **Point d'arrêt** : si `engagerManager` vérifie déjà `quantite`, si `PalierList` n'a pas
   d'input `balance` / de méthode `isDisabled`, ou si D23 n'est pas la dernière entrée de
   `DECISIONS.md`, l'état du projet n'est pas celui décrit ici — s'arrêter et le signaler plutôt
   que d'adapter ce prompt.
2. **Backend** — `resolver.ts` : dans `engagerManager`, remonter `findProduct` avant la
   vérification d'argent et ajouter le `throw` (commentaire de la mutation mis à jour : « ; refuse
   si le produit n'a aucun exemplaire (D24) »). `world.e2e-spec.ts` : ajouter, après « engagerManager
   refuse si l'argent manque », un test « engagerManager refuse si le produit cible n'a aucun
   exemplaire » : `writeFile({ ...readFile(), money: 20000 })`, mutation sur « Manager 2 », attendre
   `data.engagerManager === null`, le message exact ci-dessus, puis dans le fichier : `money` 20000,
   `managers[1].unlocked === false`, `products[1].managerUnlocked === false`.
3. **Frontend** — `game-math.ts` : `blockedManagerNames(world: WorldData): string[]` (commentaire :
   managers non possédés dont le produit cible est à 0 exemplaire, D24). `game-math.spec.ts` : monde
   neuf → `['Manager 2', …, 'Manager 6']` (tous sauf « Manager 1 ») ; Item 2 à `quantite: 1` →
   « Manager 2 » sort de la liste ; « Manager 2 » `unlocked: true` avec Item 2 à 0 → absent aussi.
4. `palier-list.ts` : input `blockedNames = input<readonly string[]>([])`, `isDisabled` retourne
   aussi `true` si `blockedNames().includes(palier.name)` ; commentaire HTML du bouton complété
   (« ou si le palier est dans blockedNames, D24 »). `palier-list.spec.ts` : `Host` gagne un signal
   `blocked` lié à `[blockedNames]` ; tests : (a) `balance 20000`, `blocked ['Manager 1']` →
   `disabled === true`, clic n'émet rien ; (b) `blocked []` → `disabled === false` ; (c) nom
   inconnu dans `blocked` → sans effet.
5. `app.ts` : `computed blockedManagers` (`world ? blockedManagerNames(world) : []`) ; `app.html` :
   `[blockedNames]="blockedManagers()"` sur la seule `PalierList` Managers.
6. Documentation : `docs/DECISIONS.md` — `## D24 — Engager un manager exige un exemplaire du
   produit cible` (Contexte / Décision (phase 9.10, 2026-09-19) / Conséquences, même format que
   D21 ; mentionner que c'est un écart au sujet §6.3 qui ne prévoit pas cette vérification, et
   que `updateWorld` n'est pas touché) ; `docs/GAME-RULES.md` § Managers — puce « Refuser si
   `product.quantite == 0` (D24) » ; `frontend/CLAUDE.md` — ligne `palier-list` du tableau
   (input `blockedNames`) et convention des boutons désactivés (managers : `money < seuil` **ou**
   produit cible à `quantite = 0`) ; `backend/README.md` si la liste des erreurs d'`engagerManager`
   y figure ; `docs/ROADMAP.md` — insérer `- [ ] 9.10 Engager un manager exige un exemplaire du
   produit (D24) : …` avant la ligne « 9.10 … (à compléter) » qui devient 9.11.
7. Vérifier (section suivante), puis cocher 9.10.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` : 0 erreur, tous les tests verts
      (y compris le nouveau e2e) ; `production-samples.spec.ts` inchangé et vert.
- [ ] `cd frontend && npm run build && npx vitest run` : 0 erreur, specs verts (3 nouveaux dans
      `palier-list.spec.ts`, 3 dans `game-math.spec.ts`).
- [ ] Backend lancé (config `backend` de `.claude/launch.json`), user neuf `test-9-10` créé par un
      `getWorld`, `money` mis à 20 000 dans `backend/userworlds/test-9-10-world.json`, puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"mutation { engagerManager(user: \"test-9-10\", name: \"Manager 2\") { name unlocked } }"}'
  ```
  Réponse attendue : `"data":{"engagerManager":null}` et
  `"message":"Aucun exemplaire de Item 2 : achetez le produit avant d'engager son manager"` ;
  le fichier garde `"money": 20000` et `products[1].managerUnlocked: false`.
- [ ] Même commande avec `"Manager 1"` : pas de champ `errors`, `unlocked: true` (nominal intact).
- [ ] Front lancé (config `frontend`), user `test-9-10`, onglet Managers : « Manager 1 » Engager
      actif, « Manager 2 » à « Manager 6 » grisés (`button.disabled === true` via l'inspecteur ou
      `read_page`). Onglet Produits, « Acheter x1 » sur Item 2 ; retour sur Managers ≤ 2 s plus
      tard : « Manager 2 » actif, clic → aucun bandeau d'erreur, puis sur Produits la barre d'Item 2
      tourne et `money` augmente.
- [ ] `grep -n "D24" docs/DECISIONS.md docs/GAME-RULES.md frontend/CLAUDE.md` renvoie une ligne
      dans chaque fichier ; `docs/ROADMAP.md` a `[x] 9.10`.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm test` (backend) et `npx vitest run`
(frontend) avec le nombre de tests, réponse brute du `curl`, capture ou description de l'onglet
Managers avant/après achat d'Item 2, ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Pas de recherche web (garde-fou de quelques lignes) : tableau établi de mémoire, à partir des
mécaniques d'AdVenture Capitalist / Cookie Clicker et des guides NestJS / Angular.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Manager sur un business non possédé | AdVenture Capitalist : le manager n'est proposé qu'une fois le business acheté ; Cookie Clicker : les upgrades liées à un bâtiment n'apparaissent qu'avec ≥ 1 bâtiment | Bouton grisé, ligne visible | reprendre le blocage, diverger sur le masquage (front de test, sujet non fourni) — noté dans D24 |
| Validation serveur | Idle games en ligne : toute validation métier côté serveur, l'UI anticipe | D17 « serveur seul juge », D12 | identique : `throw` + grisage |
| Ordre des vérifications | NestJS : erreurs structurelles d'abord (existe ? déjà fait ? pré-requis ?) puis ressources | déjà engagé → argent | reprendre : quantité entre les deux |
| Remontée d'erreur GraphQL | schema-first : `throw new Error(message)` → `errors[0].message` | en place (D12) | identique |
| Composant présentationnel générique | Angular : inputs simples, dérivation dans le parent / fonction pure | `PalierList` n'a que `balance` | reprendre : `blockedNames` + `blockedManagerNames` dans `game-math.ts` |
| Tests | NestJS : e2e sur le message ; Angular : `button.disabled` via TestBed, fonctions pures sans TestBed | `world.e2e-spec.ts`, `palier-list.spec.ts`, `game-math.spec.ts` | reprendre, étendre |
| Écart au sujet | — | §6.3 ne prévoit pas la vérification | décision à noter (D24) |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Bug reproduit (Manager 2 / Item 2, gain = 0 expliqué par la formule), étape 9.10, décision D24 |
| 2 | Instructions séquencées | 2 | 7 étapes, chacune avec fichier, contenu et test associé ; doc et roadmap incluses |
| 3 | Exemples concrets | 2 | Tableau chargement → playground → achat → engagement, chiffres vérifiés dans `origworld.ts` (15 000, 60, 20 000 − 60 − 15 000 = 4 940) |
| 4 | Structure lisible | 2 | Sections du gabarit, backend / frontend séparés dans Comportement, Étapes et Vérification |
| 5 | Rôle et périmètre | 2 | Les deux sous-projets nommés, fichiers interdits (`updateWorld`, schéma, `ProductCard`), hors périmètre explicite (masquage, migration, upgrades) |
| 6 | Critères mesurables | 2 | build/lint/test, `curl` avec message exact et état du fichier, DOM `disabled`, greps |
| 7 | Le « pourquoi » | 2 | Ordre des vérifications, `updateWorld` intact (jeu de tests officiel), fonction pure (pas de test App avec monde), agnosticisme de `PalierList` |
| 8 | Raisonnement guidé | 2 | Lecture préalable, plan en 5 lignes (> 3 fichiers), point d'arrêt sur l'état attendu du projet |
| 9 | Format de sortie | 2 | Fichiers à modifier, signature de la fonction, contenu de D24 / ligne 9.10 / puce GAME-RULES, rapport attendu |
| 10 | Concision / cohérence | 1 | La règle « serveur seul juge » et l'absence de tooltip sont dites deux fois (Cas limites + Contraintes) |

Historique : v1 17/20 → v2 19/20.
Améliorations retenues : v1 laissait la dérivation en `computed` inline dans `App` sans dire où la
tester (critère 6 : 1 → 2, critère 7 : 1 → 2) — remplacé par `blockedManagerNames` dans
`game-math.ts` + `game-math.spec.ts`, avec la raison (`app.spec.ts` n'a pas de test avec monde) ;
v1 ne précisait ni l'ordre des vérifications ni son motif (critère 3 : 1 → 2). Les redites du
critère 10 sont conservées : elles répondent à deux questions différentes (« que fait le front si
le monde a 2 s de retard ? » et « pourquoi pas de tooltip ? »).
