# Recette — vérification de l'application contre le cahier des charges

Recette du 05/10/2026 **après la phase 10** (mise en conformité, D36), sur l'état de travail courant
(branche `main`, modifications non committées comprises), contre
[`CAHIER-DES-CHARGES.md`](CAHIER-DES-CHARGES.md).

Statuts : **Conforme** · **Partiel** (fonction présente mais différente de ce que demande le sujet)
· **Non conforme** (absent ou contraire au sujet).

## 1. Synthèse

| Bloc | Conforme | Partiel | Non conforme | Avant la phase 10 |
|---|---|---|---|---|
| Backend (B-01 → B-17) | 17 | — | — | 15 / 1 / 1 |
| Contrat d'API (API-01, API-02) | 2 | — | — | — / 1 / — |
| Frontend (F-01 → F-34) | 34 | — | — | 9 / 20 / 5 |
| Non fonctionnel (NF-01 → NF-05) | 5 | — | — | 4 / 1 / — |
| Défauts hors cahier (D-01 → D-06) | 6 corrigés | | | 6 ouverts |

Toutes les exigences sont couvertes. Reste un **point à arbitrer**, qui n'est pas une
non-conformité (§ 6) : les noms *proposés* du thème.

## 2. Contrôles automatiques

| Contrôle | Commande | Résultat |
|---|---|---|
| Build backend | `cd backend && npm run build` | OK |
| Lint backend | `npm run lint` (oxlint) | OK, 0 avertissement |
| Tests unitaires backend | `npm test` | **86 / 86** (moteur, échantillon gitlab, contrôleur) |
| Tests e2e backend | `npm run test:e2e` | **10 / 10** |
| Build frontend | `npx ng build` | OK, 971 kB, plus d'avertissement de budget |
| Tests frontend | `npx ng test --watch=false` | **161 / 161** (12 fichiers) |
| Équilibrage | `node backend/scripts/simulate-balance.mjs [--resets]` | voir F-33 |

## 3. Scénario backend (API GraphQL réelle, joueur jetable)

27 contrôles sur 27 passent (joueur et fichiers supprimés après le test) :

| Contrôle | Exigence | Résultat |
|---|---|---|
| Nouveau joueur = monde d'origine, fichier `userworlds/<user>-world.json` créé par `getWorld` | B-07, B-08 | OK |
| 6 produits / 6 managers / 3 paliers par produit / 3 allunlocks / 10 upgrades / 3 angel upgrades ; monde « Nuka Capitalist » | B-04, F-33 | OK |
| Produit 99 → « Le produit avec l'id 99 n'existe pas » ; achat sans argent refusé | B-09 | OK |
| `lancerProductionProduit` → `timeleft = vitesse`, aussi à 0 exemplaire | B-10 | OK |
| Production créditée après 500 ms (`money = score = 1`), `lastupdate` recalé | B-12 | OK |
| Achat de 24 : `cout` = 4 × 1,07²⁴, débit = somme géométrique exacte (232,7067) | B-09, RG-01 | OK |
| Seuil 25 → unlock vitesse ×2 ; tous les produits à 25 → allunlock gain ×2 partout | B-13 | OK |
| `engagerManager` : débloqué, production en boucle (100 $ en 1,1 s), aussi pour un produit à 0 exemplaire ; manager inconnu → erreur | B-11, B-12 | OK |
| `acheterCashUpgrade` « Bottle » → revenu ×3 | B-14 | OK |
| Reset : monde d'origine, score gardé, **4 743 anges pour un score de 10¹⁸** (150 × √1000) | B-15, RG-09 | OK |
| `acheterAngelUpgrade` « Fortune Finder » : anges actifs −10, `angelbonus` 2 → 3 | B-14 | OK |
| 50 anges à 2 % : une production de 1 × 1 $ rapporte 2 $ | B-16 | OK |
| `GET /icones/nuka-cola.png` → 200 `image/png` | B-05 | OK |
| Pseudo « ../x » : fichier créé dans `userworlds/` sous un nom encodé, rien hors du dossier | D-01 | OK |
| `basculerManager` absent ; `totalangels` / `activeangels` en `Int` (introspection) | API-01 | OK |

## 4. Détail par exigence

### 4.1 Backend et API

| ID | Statut | Constat |
|---|---|---|
| B-01 → B-03 | Conforme | NestJS 12 (ESM), schema-first, `graphql.ts` généré en classes, `/graphql` répond. `@nestjs/serve-static` remplacé par `useStaticAssets`, même résultat. |
| B-04 | Conforme | Quantités respectées ; monde « Nuka Capitalist » : noms et images du casting de `THEME.md` (phase 10.4). |
| B-05 → B-08 | Conforme | Images sur `/icones/*`, resolver déclaré, lecture avec clone d'`origworld` (D3), sauvegarde à chaque opération. |
| B-09 → B-11 | Conforme | Comportements du sujet ; plus de règle ajoutée (D24 et le refus de production à 0 retirés, D36). |
| B-12 | Conforme | `advanceProduction` + `updateWorld`, 21 cas de l'échantillon gitlab verts. |
| B-13, B-14 | Conforme | Unlocks et upgrades par `applyBonus` ; une production en cours accélère (RG-07). Règles en fonctions pures dans `world-engine.ts` (D10). |
| B-15, B-16 | Conforme | Anges `floor(150 × √(score / 10¹⁵)) − totalangels` (D20 remplacée) ; gain avec bonus des anges. |
| B-17 | Conforme | `AppService` = persistance + recherches, resolver = orchestration, règles dans `world-engine.ts`. |
| API-01 | Conforme | Schéma du sujet ; seul écart `lastupdate: Float!` (D6), interprétation de l'ambiguïté A1 (le sujet dit `String!` puis `Int!`). |
| API-02 | Conforme | Serveur de test joignable ; nos 7 opérations sont **valides contre son schéma** (`validate()` de graphql-js sur son introspection). |

### 4.2 Frontend

| ID | Statut | Constat |
|---|---|---|
| F-01 | Conforme | Angular 22, `@apollo-orbit/angular`, codegen. |
| F-02 | Conforme | `App` (global), composant produit (`ProductCard`), `GameService` (logique et signaux) ; découpage plus fin pour les fenêtres (`Modal`, `PalierList`, `UnlockList`, `AngelsPanel`). |
| F-03 | Conforme | `user`, `server` (= `SERVER` de `server.ts`), `worldQuery = apollo.signal.query`, `world = linkedSignal`. |
| F-04 | Conforme | En-tête : logo rond + nom du monde, argent (`#money`, pipe `bigvalue`), bouton multiplicateur, champ « Your ID » + Refresh. |
| F-05, F-06 | Conforme | Bandeau gauche de boutons (Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors, + Paramètres) ouvrant des fenêtres superposées ; produits au centre sur deux colonnes. |
| F-07 | Conforme | Image ronde avec la quantité superposée ; barre de production avec le gain ; bouton « x<n> — <coût> » et temps restant à côté. |
| F-08 | Conforme | Angular Material + grille CSS (thème cathodique gardé, design libre). |
| F-09 | Conforme | Pipes `bigvalue` (« 1.235 × 10⁶ ») et `second` (« 00:00:01.3 », heures:minutes:secondes.dixièmes). |
| F-10 | Conforme | Clic sur l'icône = production (désactivé sans exemplaire ou si automatisé). |
| F-11, F-12 | Conforme | `calcScore` toutes les 100 ms (`performance.now`, `advanceProduction`) et `productionDone`. Mesuré : production de 500 ms créditée à ~600 ms, serveur au même solde. La barre suit le pas de 100 ms ; `requestAnimationFrame`, seulement recommandé, n'est pas utilisé. |
| F-13 | Conforme | Un seul bouton : x1 → x10 → x100 → Max → x1 ; signal `qtmulti` d'`App` transmis aux produits. |
| F-14, F-15 | Conforme | `maxCanBuy`, `numberToBuy`, `canBuy` ; achat appliqué localement (quantité, coût, argent, unlocks) puis `acheterQtProduit`. Vérifié : en Max avec 10 M, x178 / x72 / x57 / x41 / x22 / x6. |
| F-16, F-20 | Conforme | Snack-bar `snackmessage` : unlocks débloqués, manager engagé, upgrade acheté, reset, erreur de transmission (message du serveur, puis rechargement). |
| F-17, F-22 | Conforme | `lancerProductionProduit` et `engagerManager` transmis. |
| F-18, F-19 | Conforme | Fenêtre Managers : managers non engagés seulement (logo, nom, produit, coût, « Hire ! » actif si l'argent suffit), Close / Échap / fond ; engagement local puis mutation, production lancée aussitôt. |
| F-21, F-27, F-31 | Conforme | Badges : managers, cash upgrades, angel upgrades achetables ; anges à réclamer sur Investors. Vérifié avec 10 M $ et 50 anges : 6 / 5 / 1. |
| F-23, F-24 | Conforme | Formulaire signal `form()` + `[formField]`, Entrée → `commitName`, clé `username` (ancienne clé migrée), `Captain<n>` par défaut ; bouton Refresh. |
| F-25, F-26 | Conforme | Fenêtre Unlocks (prochain palier par produit + allunlocks restants, effet en clair) ; unlocks appliqués par le client (accélération comprise) avec message. |
| F-28, F-32 | Conforme | Cash et angel upgrades appliqués localement (type `ange` → `angelbonus`), anges actifs débités, mutation. Client et serveur vérifiés au même état après une série d'achats (argent 322 409 des deux côtés). |
| F-29, F-30 | Conforme | Fenêtre « Angel Investors » : actifs, total, bonus, score, bouton « N anges / à réclamer avec un reset » (confirmation, `resetWorld`, rechargement) ; gains avec bonus des anges. |
| F-33 | Conforme | Monde « Nuka Capitalist ». Simulation : 6 managers en 8 min 34 s, 10⁹ en 17 min, premier ange en 28 min, 10¹² en 58 min ; avec un reset quand les anges doublent, 10 anges à 1 h 30, 150 en 32 h (sans reset : 57 h). |
| F-34 | Conforme | Adresse du serveur en un seul endroit (`server.ts`) ; opérations valides contre le serveur de test ; plus d'opération hors sujet. Non joué contre le serveur d'un autre groupe (aucune adresse disponible). |

Interface vérifiée aussi à 375 px de large : pas de défilement horizontal, menu au-dessus des
produits, page entière qui défile, fenêtres à 16 px des bords, focus clavier sur Close à
l'ouverture et rendu au bouton d'origine à la fermeture.

### 4.3 Non fonctionnel

| ID | Statut | Constat |
|---|---|---|
| NF-01 | Conforme | Schéma du sujet (A1 pour `lastupdate`), aucune règle serveur ajoutée qui changerait le comportement vu par un client tiers. |
| NF-02 | Conforme | Un JSON par joueur dans `userworlds/`, nom de fichier encodé. |
| NF-03 | Conforme | Le client se recale sur le serveur au chargement, sur Refresh, après un reset et après un refus. |
| NF-04 | Conforme | Production des managers créditée au retour du joueur (calcul par formule). |
| NF-05 | Conforme | Monorepo `isiscapitalist/{backend,frontend}`. |

## 5. Défauts de la recette précédente

| # | Défaut | Correction |
|---|---|---|
| D-01 | Pseudo « ../x » écrivait hors de `userworlds/` | `encodeURIComponent` (+ `*`) dans `AppService.worldPath` ; tests e2e et scénario. |
| D-02 | Anges bruts dans la toolbar (« 4.64e+23 ») | Formule du sujet (petits entiers) ; anges affichés dans la fenêtre Investors. |
| D-03 | Badge Anges non formaté | Idem : le badge Investors compte des anges entiers bornés par le type `Int`. |
| D-04 | Bundle au-delà du budget | Budget relevé à 1,1 Mo / 1,5 Mo (D36) ; 971 kB. |
| D-05 | D35 non documentée, `CLAUDE.md` périmés | D35 écrite ; `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md`, `ARCHITECTURE.md`, `GAME-RULES.md`, `THEME.md` à jour. |
| D-06 | Anges astronomiques (formule D20) | Formule du sujet (RG-09). |

## 6. Points à arbitrer

1. ~~**Partie `lucas`**~~ — **réglé le 05/10/2026** : la partie, créée sous l'ancienne formule
   (4,6·10²³ anges, non transmissibles en `Int`), a été envoyée dans la Corbeille Windows à la
   demande de l'utilisateur ; « lucas » repart du monde « Nuka Capitalist » neuf.
2. **Noms *proposés*** du thème (upgrades Stimpak / Armes / Armures, magazines, lieux, perks) :
   appliqués, à confirmer (`docs/THEME.md`).
3. Les parties existantes gardent les anciens noms (« Item 1 »…) jusqu'à leur prochain reset ; les
   icônes de démonstration restent servies pour elles.
