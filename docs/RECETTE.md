# Recette — vérification de l'application contre le cahier des charges

Recette du 05/10/2026 **après la phase 10** (mise en conformité, D36), sur l'état de travail courant
(branche `main`, modifications non committées comprises), contre
[`CAHIER-DES-CHARGES.md`](CAHIER-DES-CHARGES.md).

Complétée le 14/10/2026, **après l'étape 10.14** (D47, commit `293c6ac`), par la recette contre la
grille d'évaluation fonctionnelle du projet (`grille évaluation fonctionnelle.pdf`, § 3) ; les
contrôles automatiques (§ 2) ont été relancés ce jour-là. Le seul défaut trouvé (G-D1) a été
corrigé le même jour par l'étape 10.15 (D48) et revérifié.

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
| Grille d'évaluation (G-01 → G-26), 14/10 | 26 | — | — | 4 écarts avant l'étape 10.14, G-26 partiel avant la 10.15 |

Toutes les exigences du cahier des charges et tous les sous-critères de la grille d'évaluation
sont couverts ; le défaut G-D1 (§ 3.9) est corrigé. API-02 et F-34, conformes le 05/10, avaient
régressé avec D43 (`GetWorld` refusé par un serveur au schéma du sujet) : rétablis par l'étape
10.16 (D49). Reste un **point à arbitrer**, qui n'est pas
une non-conformité (§ 7) : les noms *proposés* du thème.

## 2. Contrôles automatiques

| Contrôle | Commande | 05/10 | 14/10 (après 10.14) |
|---|---|---|---|
| Build backend | `cd backend && npm run build` | OK | OK |
| Lint backend | `npm run lint` (oxlint) | OK, 0 avertissement | OK, 0 avertissement |
| Tests unitaires backend | `npm test` | **86 / 86** (moteur, échantillon gitlab, contrôleur) | **90 / 90** (3 fichiers) |
| Tests e2e backend | `npm run test:e2e` | **10 / 10** | **13 / 13** |
| Build frontend | `npx ng build` | OK, 971 kB, plus d'avertissement de budget | OK, 1,03 Mo (budget 1,1 Mo) |
| Tests frontend | `npx ng test --watch=false` | **161 / 161** (12 fichiers) | **221 / 221** (15 fichiers), **226 / 226** après la 10.15 |
| Équilibrage | `node backend/scripts/simulate-balance.mjs [--resets]` | voir F-33 |

## 3. Grille d'évaluation fonctionnelle (14/10/2026)

Recette après l'étape 10.14 contre `grille évaluation fonctionnelle.pdf` (8 sections,
26 sous-critères), dans la preview (backend :3000, frontend :4200, disposition du sujet). Joueur
jetable `grille1014` : 10⁷ $ puis un score de 1,2 × 10¹⁴ posés dans son fichier de sauvegarde pour
atteindre managers, upgrades et reset ; fichier supprimé après le test. Avant l'étape 10.14, quatre
sous-critères n'étaient pas tenus (G-04, G-10, G-21, G-22) : voir D47. G-26, partiel lors de
cette recette, est conforme depuis l'étape 10.15 (D48).

### 3.1 Lancement de la production d'un produit

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-01 | Clic sur l'icône | Conforme | Clic sur l'icône de Nuka-Cola → production lancée. Icône désactivée sans exemplaire, ou avec un manager (le produit tourne seul). |
| G-02 | Animation | Conforme | Barre relevée toutes les 100 ms pour une vitesse de 500 ms : 0 → 20 → 40 → 60 → 80 %, puis 0 au repos. |
| G-03 | Mise à jour du solde | Conforme | Fin de production : 0 → 1 $ (revenu 1, 1 exemplaire). |
| G-04 | Temps restant | Conforme (D47) | `00:00:00.4` → `0.3` → `0.1` → `00:00:00.0`, et 0 au repos. |

### 3.2 Achat de produit

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-05 | Multiplicateur | Conforme | Un seul bouton : « Buy x1 » → x10 → x100 → Max → x1. |
| G-06 | Nombre à acheter (Max) | Conforme | Avec 10⁷ $ : x178 / x72 / x57 / x41 / x22 / x6 sur les 6 produits. |
| G-07 | Calcul du coût | Conforme | Nuka-Cola : 4.00 (x1), 55.27 (x10), 49 527 (x100), 9,711 × 10⁶ (Max). |
| G-08 | Bouton d'achat (`canBuy`) | Conforme | À 0 $ : les 6 boutons désactivés. Avec 10⁷ $ : Nuke désactivé en x10 (2,08 × 10⁷), 5 produits sur 6 en x100. |
| G-09 | Mise à jour du monde | Conforme | Achat Max de 178 Nuka-Cola : quantité 1 → 179, argent 10⁷ → 288 825, prochain exemplaire 679 786 (= 4 × 1,07¹⁷⁸), 3 paliers débloqués appliqués. |

### 3.3 Gestion des managers

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-10 | Affichage modal | Conforme (D47) | Fenêtre superposée : 6 managers listés, puis 5 après l'engagement de Cappy, qui disparaît de la liste. |
| G-11 | Badge du bouton | Conforme | 1 (Cappy, seul manager dont le produit est possédé, D42), puis masqué après l'engagement. |
| G-12 | Achat (Hire) | Conforme | 1 000 $ débités (288 825 → 288 541, avec 716 $ produits dans les 300 ms qui suivent) ; message « Cappy engagé : Nuka-Cola est automatisé ». |
| G-13 | Production automatisée | Conforme | Sans aucun clic, l'argent monte de 716 $ toutes les 250 ms ; chip « manager » sur la carte. Écart assumé : un manager ne s'engage qu'avec un exemplaire de son produit (D42). |

### 3.4 Upgrades & Angel-upgrades

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-14 | Liste accessible | Conforme | Boutons « Cash Upgrades » et « Angel Upgrades » du bandeau gauche, chacun ouvrant sa fenêtre. |
| G-15 | Conditions d'achat | Conforme | À 289 k$ : 3 cash upgrades actifs (1 000, 15 000, 180 000 $), les 7 autres grisés. Avec 51 anges actifs : seul Fortune Finder (10 anges) actif, Cap Collector (100) et Troc (1 000) grisés. |
| G-16 | Effet de l'upgrade | Conforme | Affiche Nuka-Cola (revenus ×3) : gain 358 → 1 074. Fortune Finder (anges +1 %) : anges actifs 51 → 41, bonus par ange 2 → 3 %, gain 2.02 → 2.23 (= 1 × (1 + 41 × 3 %)). |

### 3.5 Reset du monde

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-17 | Bouton Reset | Conforme | Fenêtre Investors : anges actifs, total des anges, bonus par ange, score, formule ; bouton « 51 anges à réclamer avec un reset » ; badge Investors 51. |
| G-18 | Comportement | Conforme | Après le reset (confirmation) : argent 0, quantités [1, 0, 0, 0, 0, 0], managers et upgrades remis à zéro (badges masqués), 51 anges actifs et au total, gain Nuka-Cola 1 → 2.02 (51 × 2 %). Le premier produit revient à **1** exemplaire et non à 0 : c'est le monde d'origine (`origworld`), sans quoi le joueur à 0 $ ne pourrait rien faire (D47). |

### 3.6 Gestion du pseudo du joueur

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-19 | Champ texte | Conforme | Champ « Your ID » (formulaire signal) ; saisie acceptée. |
| G-20 | Persisté | Conforme | Clé `username` du localStorage ; après rechargement complet de la page, champ et partie « grille1014 » retrouvés. |
| G-21 | Refresh | Conforme (D47) | Pseudo tapé puis Refresh, sans Entrée → monde du nouveau pseudo chargé et mémorisé. |

### 3.7 Feedback visuel

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-22 | SnackBar | Conforme (D47) | Achat (« Achat : 178 × Nuka-Cola — paliers débloqués : … »), manager engagé, cash et angel upgrade achetés, reset (« Monde remis à zéro : 51 ange(s) gagné(s) »), erreurs serveur (« Erreur de chargement du monde : Failed to fetch », « Erreur de transmission serveur pour le lancement de la production : Failed to fetch »). |
| G-23 | Badges | Conforme | Masqués à 0, visibles quand une action est possible : Managers 1 → masqué après l'engagement, Investors 51 → masqué après le reset, Angel Upgrades 0 → 1 après le reset ; Unlocks et Paramètres jamais badgés. |
| G-24 | Adresse du back | Conforme (D49) | Paramètres → « Adresse du serveur » (Appliquer / Défaut, mémorisée). Une adresse injoignable (`localhost:3999`) est signalée ; « Défaut » revient au serveur et recharge le monde. Le serveur d'un autre groupe (`isiscapitalist.chl.connected-health.fr`) refusait toutefois notre `GetWorld` (champ `angeldivisor` de D43) : corrigé par l'étape 10.16, monde de ce serveur chargé et joué, adresse collée avec `/graphql` acceptée. |

### 3.8 Synchronisation frontend - backend

| ID | Sous-critère | Statut | Constat |
|---|---|---|---|
| G-25 | Conservation des propriétés du monde | Conforme | Monde du serveur lu au même instant que celui du client : quantités, manager, upgrade identiques. Après rechargement complet de la page : 41 / 51 anges, bonus 3 %, Fortune Finder acheté, quantités conservés. |
| G-26 | Évolution correcte de l'argent | Conforme (D48) | Avant l'étape 10.15 : **partiel** (défaut G-D1) ; après l'engagement de Cappy, le client avait un cycle d'avance sur le serveur (467 257 $ affichés, 466 183 $ côté serveur) et l'argent affiché a reculé au Refresh (544 585 → 543 511 $). Après la 10.15, même scénario : client − serveur = 0 à −2 cycles sur 40 mesures, jamais en avance ; **10 Refresh sans aucun recul** (l'argent reste égal ou monte du léger retard du client). |

### 3.9 Défaut trouvé (corrigé par l'étape 10.15, D48)

| # | Défaut | Cause | Correctif |
|---|---|---|---|
| G-D1 | Au Refresh, l'argent affiché peut reculer d'un cycle de production (G-26). | `calcScore` fait avancer le monde par pas de 100 ms. Une action faite entre deux passages (`startProduction`, `hireManager`) pose `timeleft = vitesse`, puis le passage suivant retire **tout** le temps écoulé depuis le passage précédent, y compris celui d'avant l'action : la production du client prend jusqu'à 100 ms d'avance sur celle du serveur, qui applique `updateWorld` avant l'action (règle 5). Un Refresh qui tombe dans cette avance efface un cycle que le serveur n'a pas encore produit. Pour un produit lent (Nuke, 2 min) le cas est rare, mais le recul vaut alors un cycle entier. | **Corrigé (D48).** `calcScore()` en tête de chaque action locale, comme `updateWorld` côté serveur ; base de temps qui ne recule pas ; premier passage après un rechargement de `getWorld` sans avance (seconde cause, trouvée en vérifiant le correctif : un monde rechargé était lui aussi avancé du temps écoulé avant sa réponse). Reste la latence réseau (le serveur démarre la production à la réception de la mutation) : quelques ms en local, quelques dizaines vers le VPS. |

## 4. Scénario backend (API GraphQL réelle, joueur jetable)

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

## 5. Détail par exigence (05/10/2026)

### 5.1 Backend et API

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

### 5.2 Frontend

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

Depuis D37, Paramètres → « Disposition » propose aussi la barre d'onglets en bas de la phase 9 ;
la disposition du sujet, vérifiée ci-dessus, reste celle par défaut (F-05 inchangé).

Interface vérifiée aussi à 375 px de large : pas de défilement horizontal, menu au-dessus des
produits, page entière qui défile, fenêtres à 16 px des bords, focus clavier sur Close à
l'ouverture et rendu au bouton d'origine à la fermeture.

### 5.3 Non fonctionnel

| ID | Statut | Constat |
|---|---|---|
| NF-01 | Conforme | Schéma du sujet (A1 pour `lastupdate`), aucune règle serveur ajoutée qui changerait le comportement vu par un client tiers. |
| NF-02 | Conforme | Un JSON par joueur dans `userworlds/`, nom de fichier encodé. |
| NF-03 | Conforme | Le client se recale sur le serveur au chargement, sur Refresh, après un reset et après un refus. |
| NF-04 | Conforme | Production des managers créditée au retour du joueur (calcul par formule). |
| NF-05 | Conforme | Monorepo `isiscapitalist/{backend,frontend}`. |

## 6. Défauts de la recette précédente

| # | Défaut | Correction |
|---|---|---|
| D-01 | Pseudo « ../x » écrivait hors de `userworlds/` | `encodeURIComponent` (+ `*`) dans `AppService.worldPath` ; tests e2e et scénario. |
| D-02 | Anges bruts dans la toolbar (« 4.64e+23 ») | Formule du sujet (petits entiers) ; anges affichés dans la fenêtre Investors. |
| D-03 | Badge Anges non formaté | Idem : le badge Investors compte des anges entiers bornés par le type `Int`. |
| D-04 | Bundle au-delà du budget | Budget relevé à 1,1 Mo / 1,5 Mo (D36) ; 971 kB. |
| D-05 | D35 non documentée, `CLAUDE.md` périmés | D35 écrite ; `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md`, `ARCHITECTURE.md`, `GAME-RULES.md`, `THEME.md` à jour. |
| D-06 | Anges astronomiques (formule D20) | Formule du sujet (RG-09). |

## 7. Points à arbitrer

1. ~~**Partie `lucas`**~~ — **réglé le 05/10/2026** : la partie, créée sous l'ancienne formule
   (4,6·10²³ anges, non transmissibles en `Int`), a été envoyée dans la Corbeille Windows à la
   demande de l'utilisateur ; « lucas » repart du monde « Nuka Capitalist » neuf.
2. **Noms *proposés*** du thème (upgrades Stimpak / Armes / Armures, magazines, lieux, perks) :
   appliqués, à confirmer (`docs/THEME.md`).
3. Les parties existantes gardent les anciens noms (« Item 1 »…) jusqu'à leur prochain reset ; les
   icônes de démonstration restent servies pour elles.
