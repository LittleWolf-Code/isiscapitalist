# Prompt — Multiplicateur « max » et boutons d'achat désactivés faute d'argent

- Date : 2026-09-19
- Étape roadmap : 9.3 (nouvelle ligne à insérer, voir Étapes)
- Sous-projet : frontend
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « dans le front-end je dois avoir les options
  d'achat +1 +10 +100 et max pour acheter le maximum que je peux, aussi je veux dans le cas x1 x10
  x100 les boutons d'achat des produits grisés quand j'ai pas l'argent pour acheter »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, terminé) et `frontend/` (Angular 22
standalone + signals, `@apollo-orbit/angular` 3). Réponds en français ; code et commentaires selon
les conventions de `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur Angular du TP ; le
backend, le schéma GraphQL et `origworld.ts` ne sont pas ton périmètre.

### Objectif

Le front générique de test (phase 9.2) propose un multiplicateur d'achat **x1 / x10 / x100** et
laisse **tous** les boutons d'achat actifs même sans argent, pour provoquer les erreurs serveur.
On veut maintenant le comportement d'un vrai jeu idle : une option **max** qui achète le maximum
d'exemplaires que l'argent permet, et des boutons d'achat **désactivés** (`disabled`) quand le
joueur ne peut pas payer — sur les produits (x1 / x10 / x100 / max) comme sur les managers,
upgrades et angel upgrades. Cette feature devient l'étape 9.3 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` (tableau des fichiers, règle « jamais désactivé
   pour raison d'argent » — c'est cette règle que tu vas remplacer)
2. `docs/GAME-RULES.md` §Achat de produits — formule du coût total, condition `money >= total`
3. `docs/DECISIONS.md` — D14 (le refetch de `getWorld` est la source de vérité), D15 (le timer
   local n'anime que `timeleft`, jamais `money` : le solde affiché date du dernier `getWorld`)
4. `backend/src/resolver.ts` — lignes de `acheterQtProduit`, `engagerManager`,
   `acheterCashUpgrade`, `acheterAngelUpgrade` : ce sont les conditions exactes à reproduire côté
   front (`money < total` strict → refus ; angel upgrades débités sur `activeangels`)
5. `frontend/src/app/game-math.ts`, `game.service.ts`, `product-card.ts/.html`,
   `palier-list.ts/.html`, `app.ts/.html`, et les specs `game-math.spec.ts`,
   `product-card.spec.ts`, `app.spec.ts`

### Comportement attendu

**Sélecteur d'achat** (bandeau) : quatre radios **x1 / x10 / x100 / max**. Le type
`Multiplier` de `game.service.ts` devient `1 | 10 | 100 | 'max'`.

**Bouton Acheter d'un produit** : il affiche toujours `Acheter x<q> — <coût total>` où `q` est
la quantité qui sera réellement envoyée à `acheterQtProduit` :

- en x1 / x10 / x100, `q` = le multiplicateur ;
- en max, `q = maxAffordable(product, money)` = le plus grand entier tel que
  `buyCost(product, q) <= money` (dérivé de la suite géométrique de `GAME-RULES.md` :
  `q = floor(log(1 + money × (g − 1) / c) / log g)`, ou `floor(money / c)` si `g = 1`), calculé
  côté client à partir du dernier `money` reçu.

Le bouton est **désactivé** quand `q = 0` ou `buyCost(product, q) > money` (même comparaison
stricte que le serveur : un solde exactement égal au coût permet l'achat). Le clic émet `q`.

**Boutons des paliers** (`PalierList`) : Engager / Acheter désactivés quand le solde disponible
est inférieur à `seuil` — `money` pour les managers et upgrades (`costUnit '$'`),
`activeangels` pour les angel upgrades (`costUnit 'anges'`). Un palier déjà `unlocked` reste
désactivé comme aujourd'hui. *All unlocks* (lecture seule) ne change pas. **Produire** n'est
jamais désactivé (pas de coût).

**Exemple chiffré** (Item 1 neuf : `cout 4`, `croissance 1.07`) :

| money | mode | bouton affiché | état |
|---|---|---|---|
| 0 | x1 | `Acheter x1 — 4.00` | désactivé |
| 4 | x1 | `Acheter x1 — 4.00` | actif (égalité permise) |
| 55.26 | x10 | `Acheter x10 — 55.27` | désactivé (55.2658 > 55.26) |
| 55.27 | x10 | `Acheter x10 — 55.27` | actif |
| 0 | max | `Acheter x0 — 0.00` | désactivé |
| 3.99 | max | `Acheter x0 — 0.00` | désactivé |
| 55.26 | max | `Acheter x9 — 47.91` | actif |
| 55.27 | max | `Acheter x10 — 55.27` | actif |
| 100 | max | `Acheter x14 — 90.20` | actif |

Manager 1 (`seuil 1000`) : désactivé à `money 999`, actif à `money 1000`. Angel Upgrade 1
(`seuil 10`) : désactivé tant que `activeangels < 10`, quel que soit `money`.

### Cas limites

- **Solde en retard** : `money` n'est rafraîchi qu'au poll (2 s) ou après une mutation (D15). Un
  bouton peut donc rester désactivé ~2 s après que la production a rendu l'achat possible, ou
  actif alors que le solde a baissé côté serveur : dans ce second cas le serveur répond
  `Pas assez d'argent` et le bandeau d'erreur l'affiche comme avant. Ne pas « corriger » en
  faisant évoluer `money` localement (D15).
- **Arrondi flottant du max** : `floor(log(...))` peut rendre un `q` dont `buyCost(product, q)`
  dépasse `money` de quelques 1e-12. `maxAffordable` doit vérifier `buyCost(product, q) <= money`
  et décrémenter `q` sinon — le serveur refuserait cet achat.
- **Mode max avec `q = 0`** : ne jamais envoyer `quantite: 0` au serveur (il répond
  `La quantité doit être positive`) ; le bouton désactivé suffit.
- **Monde non chargé** (`world()` undefined) : rien à afficher, comme aujourd'hui.
- **`croissance 1`** : `maxAffordable` = `floor(money / cout)` (pas de division par zéro).
- **Bouton désactivé pendant le refetch** : après un achat réussi, le bouton se recalcule à la
  réponse de `getWorld` ; pas de spinner ni d'état intermédiaire à gérer.

### Contraintes (et pourquoi)

- **Aucune modification de `backend/`** ni du schéma : la quantité max se calcule côté client
  parce que `acheterQtProduit(quantite: Int!)` exige un entier — le serveur reste seul juge
  (il refuse si le solde a changé entre-temps).
- `maxAffordable` est une **fonction pure** de `game-math.ts` (même style que `buyCost`), testée
  dans `game-math.spec.ts` : c'est le seul endroit où la formule vit ; `ProductCard` ne fait que
  l'appeler.
- `ProductCard` et `PalierList` restent **présentationnels** (`input()` / `output()`, aucune
  injection) : `ProductCard` reçoit un nouvel input `money`, `PalierList` un nouvel input
  `balance: number | null` (solde dans l'unité de `costUnit`, `null` = pas de vérification,
  utilisé pour *All unlocks*). C'est ce qui permet de tester les états désactivés avec `TestBed`
  sans serveur.
- `ProductCard.buy` émet la quantité et `GameService.buy(id, quantite)` la prend en paramètre
  (aujourd'hui `buy(id)` lit `multiplier()` lui-même) : en mode max, seule la carte connaît `q`.
  Mettre à jour `app.html` en conséquence (`(buy)="game.buy(product.id, $event)"`).
- Le sélecteur radio garde `name="multiplier"` et `[checked]` pilotés par le signal
  `game.multiplier()` ; libellé `max` (pas `xmax`).
- Désactivation via l'attribut natif `[disabled]` : le gris est celui du navigateur, **pas de CSS
  supplémentaire** (le style n'est pas le sujet du front de test).
- Cette feature **inverse** la règle 9.2 « les boutons ne sont jamais désactivés pour raison
  d'argent » : l'écrire noir sur blanc dans `docs/DECISIONS.md` (**D17**) avec la conséquence —
  l'erreur `Pas assez d'argent` n'est plus reproductible depuis l'UI, seulement via le playground
  GraphQL ou une course entre deux onglets — et retirer l'ancienne règle de `frontend/CLAUDE.md`
  et des commentaires HTML qui la citent (`palier-list.html`).

### Hors périmètre

- Pas de mode « next » (acheter jusqu'au prochain palier) ni de bouton « acheter tout ».
- Pas d'estimation locale de l'argent produit entre deux polls (D15).
- Pas de désactivation de **Produire**, de **Reset**, ni du champ `user`.
- Pas de style, d'animation, de tooltip « il manque X $ ».
- Pas de nouvelle dépendance npm.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche plus de 3 fichiers : écrire un plan en 5-8
   lignes (signature de `maxAffordable`, nouveaux inputs/outputs, changement de `buy`) et le
   montrer avant de coder.
2. `game-math.ts` : ajouter `maxAffordable(product: Pick<Product, 'cout' | 'croissance'>, money: number): number`
   avec la garde d'arrondi. `game-math.spec.ts` : cas `money 0 → 0`, `3.99 → 0`, `4 → 1`,
   `55.26 → 9`, `55.27 → 10`, `100 → 14` sur Item 1 ; `croissance 1, cout 5, money 12 → 2`.
3. `game.service.ts` : `Multiplier = 1 | 10 | 100 | 'max'` ; `buy(id, quantite)`.
4. `product-card.ts/.html` : input `money`, computed `quantity`, `cost` (sur `quantity`),
   `canBuy` ; bouton `[disabled]="!canBuy()"`, libellé `Acheter x{{ quantity() }} — {{ fmt(cost()) }}`,
   `(click)="buy.emit(quantity())"`.
5. `palier-list.ts/.html` : input `balance`, bouton désactivé si `palier.unlocked` ou
   `balance !== null && balance < palier.seuil`.
6. `app.ts/.html` : `multipliers = [1, 10, 100, 'max']`, libellé du radio, `[money]="world.money"`
   sur les cartes, `[balance]="world.money"` sur Managers et Upgrades, `[balance]="world.activeangels"`
   sur Angel upgrades, `(buy)="game.buy(product.id, $event)"`.
7. Tests : compléter `product-card.spec.ts` (input `money` dans le hôte ; les 4 cas
   `x10 / 55.26 → disabled`, `x10 / 55.27 → actif`, `max / 55.27 → « Acheter x10 — 55.27 » et
   `buy` émis avec 10`, `max / 0 → « Acheter x0 — 0.00 » disabled`). Créer `palier-list.spec.ts`
   (`seuil 1000` : `balance 999` → disabled, `1000` → actif, `null` → actif, `unlocked` → disabled).
   Vérifier que `app.spec.ts` compile toujours (le stub `multiplier: signal(1)` reste valide).
8. Docs :
   - `docs/DECISIONS.md` : entrée `## D17 — Frontend : boutons d'achat désactivés faute d'argent,
     multiplicateur « max » calculé côté client` au même format que D14/D15 (décision, pourquoi,
     conséquence : l'erreur `Pas assez d'argent` n'est plus déclenchable depuis l'UI ; le solde
     affiché pouvant dater de 2 s, le serveur reste juge).
   - `frontend/CLAUDE.md` : dans « Conventions », remplacer la puce « Les boutons ne sont jamais
     désactivés pour raison d'argent… » par la nouvelle règle (renvoi D17) ; dans le tableau des
     fichiers, mettre à jour les lignes `game.service.ts` (`multiplier` 1/10/100/max,
     `buy(id, quantite)`), `game-math.ts` (`maxAffordable`), `product-card.ts/.html` (input
     `money`) et `palier-list.ts/.html` (input `balance`).
   - `docs/ROADMAP.md` : insérer `- [x] 9.3 Multiplicateur « max » et boutons d'achat désactivés
     faute d'argent (D17)` après 9.2 et renuméroter la ligne « à compléter » en 9.4.
   - `CLAUDE.md` (racine), section « État actuel » : une phrase sur 9.3.
9. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `npm run build` sans erreur dans `frontend/` (warnings listés dans le rapport).
- [ ] `npm test` vert : `game-math.spec.ts`, `product-card.spec.ts`, `palier-list.spec.ts`,
  `app.spec.ts`.
- [ ] Backend lancé avec la configuration `backend` de `.claude/launch.json`, frontend avec
  `frontend` (jamais via Bash). Sur http://localhost:4200 avec un utilisateur **neuf**
  (`test-max-<timestamp>`) :
  - [ ] `money 0` : les 6 boutons Acheter sont désactivés en x1, x10, x100 et max (max affiche
    `Acheter x0 — 0.00`) ; les 6 Produire sont actifs ; Engager / Acheter des paliers désactivés.
  - [ ] 4 × **Produire** sur Item 1 (attendre la barre) → au refetch `money 4` : en x1 le bouton
    d'Item 1 devient actif (`Acheter x1 — 4.00`), en x10 il reste désactivé, en max il affiche
    `Acheter x1 — 4.00`. Item 2 (`cout 60`) reste désactivé dans tous les modes.
  - [ ] Clic sur **Acheter** Item 1 en max → `quantite 2`, `money 0`, bouton de nouveau désactivé.
  - [ ] Éditer `backend/userworlds/test-max-<timestamp>-world.json` (`"money": 1000`), recharger :
    Manager 1 (`seuil 1000`) actif, Manager 2 désactivé, Angel Upgrade 1 désactivé
    (`activeangels 0`) ; en max, Item 1 (`cout 4.28`, `quantite 2`) affiche
    `Acheter x42 — 987.11` et Item 2 (`cout 60`) `Acheter x11 — 947.02` ; clic sur Item 1 →
    `quantite 44`, `money 12.89`, bouton désactivé, aucune erreur dans le bandeau.
  - [ ] Aucune erreur dans la console navigateur pendant ce scénario.
- [ ] Capture d'écran de la page après le scénario (money 1000, mode max), jointe au rapport.

### Rapport attendu

En fin de tâche : fichiers créés/modifiés, commandes lancées avec leurs résultats réels (build,
tests), la capture d'écran, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Quantité max achetable | Idle games (Game Developer, « The Math of Idle Games ») : `max = floor(log(money(r−1)/b + 1) / log r)` avec `b` = prix du prochain exemplaire | Identique : `c` = `product.cout` est déjà le prix du prochain exemplaire, donc pas de terme `r^k` | reprendre, + garde d'arrondi (`buyCost(q) <= money`) |
| Modes d'achat | AdVenture Capitalist : x1 / x10 / x100 / Next / Max ; le bouton affiche le coût total | x1 / x10 / x100 / max, coût total affiché ; « Next » hors périmètre | reprendre (sans Next) |
| Bouton inabordable | AdCap : bouton grisé/« Next » tant que le solde est insuffisant | `disabled` natif, comparaison `<` stricte identique au serveur | reprendre → D17 (inverse la règle 9.2) |
| Solde local vs serveur | Idle games serveur : le client affiche une interpolation, le serveur tranche | Le solde n'est PAS interpolé (D15) : le bouton peut être en retard de ≤ 2 s | diverge volontairement (double comptage évité), documenté dans D17 |
| Composants Angular | Guide de style : `[disabled]` piloté par un `computed()` d'inputs, logique dans des fonctions pures/services | `canBuy` computed dans `ProductCard`, formule dans `game-math.ts` | reprendre |
| Où vit la quantité | Souvent dans le store global (multiplicateur → quantité) | En mode max seule la carte connaît `q` → `buy(id, quantite)` prend la quantité en paramètre | diverge (raison : `q` dépend du produit) |

Sources : [The Math of Idle Games, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i),
[Buy Multiplier — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Buy_Multiplier),
[Upgrades — AdVenture Capitalist Wiki](https://adventure-capitalist.fandom.com/wiki/Upgrades).

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Ce qui existe (9.2, boutons toujours actifs), ce qu'on veut (max + disabled), étape 9.3 nommée. |
| 2 | Instructions séquencées | 2 | 9 étapes cochables, ordre maths → service → composants → app → tests → docs. |
| 3 | Exemples concrets | 2 | Tableau de 9 cas vérifiés numériquement (55.2658, 47.91, 90.20, q = 14) contre la formule de `GAME-RULES.md` ; seuils réels d'`origworld.ts`. |
| 4 | Structure lisible | 2 | Sections du gabarit ; contraintes en liste courte, une par ligne avec sa raison. |
| 5 | Rôle et périmètre | 2 | Dev Angular, backend/schéma exclus, Hors périmètre concret (Next, tooltip, Produire). |
| 6 | Critères de succès mesurables | 2 | v1 = 1 : « q tel que le coût affiché ≤ 1000 » laissait deux relecteurs diverger ; v2 : `x42 — 987.11`, `quantite 44`, `money 12.89` calculés depuis `origworld.ts`. |
| 7 | Pourquoi des contraintes | 2 | Calcul client (Int! côté schéma), garde d'arrondi (refus serveur), `buy(id, quantite)` (seule la carte connaît q), D17 (perte du test d'erreur). |
| 8 | Raisonnement guidé | 2 | Plan avant code, lecture de `resolver.ts` pour copier les conditions exactes, vérification que `app.spec.ts` compile. |
| 9 | Format de sortie | 2 | v1 = 1 (D17 et `frontend/CLAUDE.md` cités sans dire quoi y écrire) ; v2 : titre et contenu de D17, puce et lignes du tableau à modifier, ligne ROADMAP exacte. |
| 10 | Concision / contradictions | 1 | La comparaison stricte, le solde en retard et la garde d'arrondi sont chacun énoncés une fois ; reste la redondance assumée exemple chiffré ↔ scénario de vérification, et l'étape 8 s'est allongée avec le critère 9. |

Historique : v1 17/20 → v2 19/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 6 : le scénario à `money 1000` donne les valeurs exactes (`x42 — 987.11` pour Item 1 à
  `cout 4.28`, `x11 — 947.02` pour Item 2, `quantite 44` / `money 12.89` après clic) au lieu de
  « q tel que le coût affiché ≤ 1000 » ;
- critère 9 : l'étape Docs dit quoi écrire dans D17 (titre, format D14/D15, conséquence), quelle
  puce et quelles lignes du tableau de `frontend/CLAUDE.md` changer, et la ligne ROADMAP exacte ;
- critère 10 non touché : la seule redondance restante (exemple chiffré ↔ scénario) est
  volontaire — l'un explique la formule, l'autre sert de checklist.
