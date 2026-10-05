# Cahier des charges — ISIS Capitalist

Établi le 05/10/2026 à partir des deux sujets officiels (N. Singer, cours « Architectures orientées
services ») :

| Réf. | Document | Contenu |
|---|---|---|
| **[BE]** | `backend.pdf` (11 p.) — « ISIS Capitalist, partie backend » | Mise en place NestJS, schéma, monde, resolver, mutations, moteur temporel, unlocks, upgrades, reset |
| **[FE]** | `frontendangularsignal.pdf` (36 p.) — « ISIS Capitalist » | Présentation du jeu, référentiel d'interopérabilité (API), puis tout le travail frontend Angular (signals) |

Chaque exigence porte un identifiant (`RG-`, `API-`, `B-`, `F-`, `NF-`), sa source et un niveau :
**Obligatoire** (le sujet l'impose), **Recommandé** (le sujet le propose comme manière de faire, le
résultat compte plus que le moyen). La vérification de l'application contre ces exigences est dans
[`RECETTE.md`](RECETTE.md).

---

## 1. Contexte et objectifs

- Réaliser un jeu vidéo *idle* calqué sur **AdVenture Capitalist** (Kongregate) : le joueur investit
  dans des produits dont la production lui rapporte de l'argent, sans autre défi que la croissance
  de ses revenus. [FE §Présentation]
- Le logiciel se compose d'un **serveur** (définition du monde + persistance des parties) et d'un
  **client** (interface du jeu). [FE §Présentation]
- **Interopérabilité** : tout client doit fonctionner avec tout serveur. Chaque groupe définit son
  propre monde, jouable par le client des autres groupes. Un référentiel commun (schéma GraphQL)
  garantit cette compatibilité. [FE §Présentation, §Spécifications de l'API]
- Objectifs pédagogiques : services web GraphQL, représentations JSON, Node.js / NestJS, Angular +
  Material, calculs mathématiques, synchronisation temporelle client / serveur. [FE §Finalisation]

## 2. Périmètre

| Inclus | Exclus |
|---|---|
| Backend NestJS GraphQL *schema-first*, persistance en fichiers JSON | Base de données (les mondes sont des fichiers) [BE §Création du resolver] |
| Un monde complet de 6 produits | Upgrades de type « ajout d'une quantité de produits » (seule concession au jeu d'origine) [FE §Spécifications] |
| Frontend Angular (signals, Apollo, Material) | Authentification : le joueur est identifié par un pseudo libre [FE §Le nom du joueur] |
| Branchement du client sur le monde d'un autre groupe | |

Organisation imposée : un dossier unique sous git contenant `frontend/` et `backend/`. [BE §Organisation]

## 3. Glossaire

| Terme | Définition |
|---|---|
| Monde (`World`) | Niveau de jeu : produits, managers, unlocks, upgrades, argent, score, anges |
| Produit (`Product`) | Investissement achetable en plusieurs exemplaires, caractérisé par son coût, sa croissance de coût, son revenu et sa durée de production |
| Palier (`Palier`) | Structure unique décrivant un manager, un unlock, un cash upgrade ou un angel upgrade (cf. RG-11) |
| Manager | Automatise la production d'un produit, y compris joueur déconnecté |
| Unlock / allunlock | Bonus débloqué quand **un** produit (unlock) ou **tous** les produits (allunlock) atteignent une quantité |
| Cash upgrade / angel upgrade | Bonus acheté avec de l'argent / avec des anges actifs |
| Score | Argent total gagné depuis le début (jamais remis à zéro) |
| Anges (`totalangels`, `activeangels`) | Anges accumulés depuis le début / anges actuellement actifs (la différence = anges dépensés en angel upgrades) |
| Reset | Remise à zéro de la partie qui rend actifs les anges gagnés |

## 4. Règles de gestion (communes au client et au serveur)

| ID | Règle | Source |
|---|---|---|
| **RG-01** | **Coût d'achat.** `cout` est le prix du **prochain** exemplaire ; chaque exemplaire coûte `croissance` fois le précédent (ex. 4 $ puis 4,28 $ puis 4,58 $ pour une croissance de 1,07). Acheter `n` exemplaires coûte la somme géométrique `cout × (1 + c + … + c^(n−1)) = cout × (cⁿ − 1) / (c − 1)`, puis `cout ← cout × cⁿ`. | [FE §Investir, §L'achat de produit], [BE §Mutations] |
| **RG-02** | **Production.** Un clic lance la production d'un produit ; au bout de `vitesse` ms, le joueur gagne `quantite × revenu × (1 + activeangels × angelbonus / 100)`, ajouté à `money` **et** à `score`. Sans manager : au plus une production par clic. | [FE §Investir, §Prise en compte des anges], [BE §Le reset] |
| **RG-03** | **Évolution temporelle.** Entre deux actions, les gains sont calculés d'après le temps écoulé depuis `lastupdate` : sans manager, une production en cours (`timeleft > 0`) se termine si `timeleft ≤ écoulé`, sinon `timeleft` diminue ; avec manager, on compte combien de cycles complets ont eu lieu et on recale `timeleft`. `lastupdate` est ensuite repositionné sur l'instant courant. Le même algorithme est recommandé côté client et côté serveur. | [BE §Mutations], [FE §La boucle principale] |
| **RG-04** | **Managers.** Débloqués contre `seuil` en argent ; automatisent la production du produit `idcible`, qui continue même joueur déconnecté. | [FE §Les managers, §Engagement d'un manager] |
| **RG-05** | **Unlocks produit.** Quand `quantite ≥ seuil` d'un palier du produit, le palier est débloqué et son bonus appliqué. | [FE §Les seuils], [BE §Les unlocks] |
| **RG-06** | **Allunlocks.** Quand **tous** les produits ont `quantite ≥ seuil`, le palier est débloqué et son bonus appliqué à tous les produits. | idem |
| **RG-07** | **Application d'un bonus.** `gain` : `revenu × ratio` ; `vitesse` : `vitesse ÷ ratio` (une production en cours accélère) ; `ange` : `angelbonus + ratio`. Cible `idcible` : id du produit, `0` = tous les produits, `−1` = efficacité des anges. | [FE §Spécifications (Palier), §Prise en compte des unlocks] |
| **RG-08** | **Cash upgrades.** Achetés avec `seuil` en argent ; bonus selon RG-07. | [FE §Les Cash Upgrades], [BE §Les upgrades] |
| **RG-09** | **Anges.** Nombre d'anges acquis : `150 × √(score / 10¹⁵)` ; anges **supplémentaires** de la partie en cours : `150 × √(score / 10¹⁵) − totalangels`. Chaque ange actif rapporte `angelbonus` % (2 % au départ ; 50 anges = revenus doublés). Les anges ne deviennent actifs qu'après un reset. | [FE §Les anges, §Gestion des anges] |
| **RG-10** | **Angel upgrades.** Achetés avec `seuil` anges **actifs**, qui sont perdus (et leur bonus de 2 % avec) ; bonus selon RG-07. | [FE §Les Angel Upgrades, §Gestion des Angel Upgrades] |
| **RG-11** | **Reset.** Ajouter les anges supplémentaires (RG-09) à `totalangels` et `activeangels`, puis repartir du monde d'origine en conservant `score`, `totalangels` et `activeangels`. | [BE §Le reset du monde] |
| **RG-12** | **Interprétation d'un `Palier`** selon la liste qui le contient : voir tableau ci-dessous. | [FE §Spécifications] |

| Champ | Manager | Cash / Angel upgrade | Unlock (produit ou allunlock) |
|---|---|---|---|
| `name` | nom du manager | nom de l'upgrade | nom de l'unlock |
| `logo` | image du manager | icône du produit, icône spécifique si tous, icône d'ange | icône du produit ou icône spécifique (global) |
| `seuil` | prix en argent | prix en argent / en anges | quantité à atteindre |
| `idcible` | produit géré | produit, `0` = tous, `−1` = anges | produit, `0` = tous |
| `ratio`, `typeratio` | non utilisés | bonus (RG-07) | bonus (RG-07) |
| `unlocked` | manager engagé | upgrade acheté | unlock atteint |

## 5. Contrat d'interface (API GraphQL)

**API-01 — Schéma imposé (Obligatoire).** Types `RatioType` (`gain`, `vitesse`, `ange`), `Palier`,
`Product`, `World` et opérations ci-dessous, avec les noms de champs exacts (`cout`, `croissance`,
`revenu`, `vitesse`, `quantite`, `timeleft`, `managerUnlocked`, `paliers`, `seuil`, `idcible`,
`ratio`, `typeratio`, `unlocked`…). Copie de référence : `docs/reference/schema.graphql`.
[FE §Spécifications], [BE §Ajout du schéma]

| Opération | Signature | Rôle |
|---|---|---|
| `getWorld` | `(user: String!): World` | État complet du monde du joueur |
| `acheterQtProduit` | `(user, id: Int!, quantite: Int!): Product` | Achat d'une quantité d'un produit |
| `lancerProductionProduit` | `(user, id: Int!): Product` | Lancement manuel d'une production |
| `engagerManager` | `(user, name: String!): Palier` | Engagement d'un manager |
| `acheterCashUpgrade` | `(user, name: String!): Palier` | Achat d'un cash upgrade |
| `acheterAngelUpgrade` | `(user, name: String!): Palier` | Achat d'un angel upgrade |
| `resetWorld` | `(user): World` | Remise à zéro de la partie |

**API-02 — Serveur de test.** Un backend de référence est disponible pour avancer le frontend
indépendamment : `https://isiscapitalist.chl.connected-health.fr/graphql`. [FE §Mise en place de la
partie serveur]

## 6. Exigences backend

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **B-01** | Projet NestJS créé depuis `nestjs/typescript-starter` dans `backend/`, dépendances `@nestjs/graphql @nestjs/apollo @apollo/server graphql ts-morph @nestjs/serve-static`. | Obligatoire | [BE §Amorçage] |
| **B-02** | Approche *schema-first* : `src/schema.graphql` contenant le schéma fourni ; `GraphQLModule.forRoot` (`ApolloDriver`, `typePaths: ['./**/*.graphql']`, `definitions` → `src/graphql.ts`, `outputAs: 'class'`). `npm run start:dev` génère `graphql.ts` (`World`, `Product`, `Palier`). | Obligatoire | [BE §Ajout du schéma] |
| **B-03** | Playground GraphQL accessible sur `http://localhost:3000`. | Obligatoire | [BE §Ajout du schéma] |
| **B-04** | `src/origworld.ts` décrit le monde : **6 produits**, **6 managers**, **≥ 3 unlocks par produit**, **≥ 3 allunlocks**, **une dizaine d'upgrades**, **quelques angel upgrades** (squelette fourni : `docs/reference/origworld.skeleton.ts`). | Obligatoire | [BE §Création du monde] |
| **B-05** | Images dans `backend/public/icones/`, servies statiquement sur `/icones/<image>`. | Obligatoire | [BE §Création du monde] |
| **B-06** | Resolver `src/resolver.ts` (`@Resolver('World')`) déclaré dans les `providers` d'`app.module.ts`. | Obligatoire | [BE §Création du resolver] |
| **B-07** | `AppService.readUserWorld(user)` : lit `userworlds/{user}-world.json`, retourne le monde d'origine s'il n'existe pas. | Obligatoire | [BE §Création du resolver] |
| **B-08** | `AppService.saveWorld(user, world)` appelé à la fin de **chaque** query et mutation, `getWorld` compris (le premier `getWorld` crée le fichier). | Obligatoire | [BE §Création du resolver] |
| **B-09** | `acheterQtProduit` : produit introuvable → `Error("Le produit avec l'id ${id} n'existe pas")` ; `quantite` augmentée, coût déduit de l'argent, `cout` mis à jour (RG-01). | Obligatoire | [BE §Mutations] |
| **B-10** | `lancerProductionProduit` : `timeleft ← vitesse`. | Obligatoire | [BE §Mutations] |
| **B-11** | `engagerManager` : trouver le manager par son nom, puis son produit ; passer `managerUnlocked` du produit et `unlocked` du manager à vrai. | Obligatoire | [BE §Mutations] |
| **B-12** | Calcul de l'évolution du monde depuis `lastupdate` (RG-03), appliqué avant chaque action ; validable avec l'échantillon `https://gitlab.com/-/snippets/2522185`. | Obligatoire | [BE §Mutations] |
| **B-13** | Vérification des unlocks produit et des allunlocks à chaque achat (RG-05, RG-06), code **dans le service**, appelé par `acheterQtProduit`. | Obligatoire | [BE §Les unlocks] |
| **B-14** | `acheterCashUpgrade` (argent) et `acheterAngelUpgrade` (anges), en réutilisant le code des unlocks. | Obligatoire | [BE §Les upgrades] |
| **B-15** | `resetWorld` selon RG-11 (anges selon RG-09). | Obligatoire | [BE §Le reset du monde] |
| **B-16** | Le calcul des gains applique le bonus des anges actifs (RG-02). | Obligatoire | [BE §Le reset du monde] |
| **B-17** | Code commun dans `AppService` ; chaque resolver ne contient que ce qui lui est propre. | Recommandé | [BE §Création du resolver] |

## 7. Exigences frontend

### 7.1 Architecture

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-01** | Projet Angular créé comme dans l'énoncé préparatoire ; requêtes dans `queries.graphql`, `operations.ts` généré par codegen (`npm run codegen`). | Obligatoire | [FE §Mise en place du projet Angular] |
| **F-02** | Deux composants et un service : `app` (éléments globaux), `produit` (affichage d'un produit, reçu par `input()`), `GameService` (logique et signaux partagés). | Recommandé | [FE §Création des premiers composants] |
| **F-03** | Dans `GameService` : signal `user`, signal `server` (adresse du backend, utilisée pour les images), `worldQuery = apollo.signal.query(GET_WORLD_QUERY, variables: () => ({ user }))`, `world = linkedSignal(() => worldQuery.data()?.getWorld)`. | Recommandé | [FE §Création des premiers composants] |

### 7.2 Mise en page

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-04** | **Bandeau d'en-tête** : icône et nom du monde, argent du joueur, bouton de quantité d'achat, champ de saisie du pseudo. | Obligatoire | [FE §Description du travail attendu, fig. 7] |
| **F-05** | **Bandeau gauche** de boutons ouvrant des fenêtres supplémentaires (Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors). | Obligatoire | idem |
| **F-06** | **Partie centrale** listant les produits et leurs éléments d'interaction. | Obligatoire | idem |
| **F-07** | **Produit** : à gauche l'image avec la quantité **superposée** ; à droite en haut la barre de progression indiquant le gain qui sera généré, en bas la zone d'achat (quantité achetée et coût) avec à côté le temps restant de production. | Obligatoire | [FE §Description du travail attendu] |
| **F-08** | Style avec Angular Material ; grille CSS (*Grid Layout*) conseillée, mise en page libre. | Recommandé | idem |
| **F-09** | Formatage par **pipes** Angular : grands nombres en puissances de 10 (`bigvalue`, 4 chiffres significatifs, `10ⁿ` en HTML) ; temps restant en heures : minutes : secondes : dixièmes. | Recommandé | [FE §Les pipes d'Angular] |

### 7.3 Actions du joueur

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-10** | Un **clic sur l'icône** du produit lance sa production (`startFabrication()`) et anime la barre de progression. | Obligatoire | [FE §Démarrage de la production] |
| **F-11** | **Boucle principale** côté client (`setInterval` 100 ms, `calcScore()`) : calcule les productions terminées depuis la dernière fois (même algorithme que le serveur, RG-03), anime la barre (`requestAnimationFrame`), repart automatiquement si un manager est engagé. | Obligatoire | [FE §La boucle principale] |
| **F-12** | `GameService.productionDone(prod, qt)` met à jour **localement** `money` et `score` à chaque production terminée (client « autonome » qui ne lit le serveur qu'au chargement). | Obligatoire | [FE §Description du travail attendu, §La boucle principale] |
| **F-13** | **Multiplicateur d'achat** dans l'en-tête, cycle `x1 → x10 → x100 → Max → x1` ; état dans un signal (`qtmulti`) transmis à chaque produit. | Obligatoire | [FE §L'achat de produit] |
| **F-14** | Par produit : `maxCanBuy` (quantité max achetable), `numberToBuy` (1, 10, 100 ou max), `canBuy` ; bouton d'achat cliquable seulement si l'achat est payable ; en position Max, la quantité achetable est inscrite dans le bouton. | Obligatoire | idem |
| **F-15** | `buyProduct(qt, product)` : quantité, coût du prochain exemplaire et argent mis à jour dans le monde, puis mutation `acheterQtProduit`. | Obligatoire | idem |
| **F-16** | Toast (snack-bar) d'erreur si la transmission au serveur échoue. | Recommandé | idem |
| **F-17** | Mutation `lancerProductionProduit` à chaque lancement manuel d'un produit non automatisé. | Obligatoire | idem |

### 7.4 Managers

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-18** | Bouton « Managers » ouvrant une **fenêtre superposée** fermable (bouton Close) qui liste les managers **non encore débloqués** : logo, nom, produit géré, coût, bouton « Hire » actif seulement si l'argent suffit. | Obligatoire | [FE §Interface pour lister les managers, fig. 8] |
| **F-19** | Engagement : vérifier l'argent, le débiter, passer `unlocked` du manager et `managerUnlocked` du produit à vrai ; la production démarre immédiatement, même si le produit n'était pas en production. | Obligatoire | [FE §Engagement d'un manager] |
| **F-20** | **Messages éphémères** (snack-bar, signal `snackmessage` + `effect`) : manager engagé, unlock / upgrade débloqué, erreur de transmission serveur. | Obligatoire | [FE §Afficher un message éphémère] |
| **F-21** | **Badge** (`matBadge`) sur le bouton Managers = nombre de managers actuellement achetables, masqué à 0. | Obligatoire | [FE §Badger les boutons] |
| **F-22** | Mutation `engagerManager` envoyée au serveur. | Obligatoire | [FE §Prévenir le backend] |

### 7.5 Nom du joueur

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-23** | Champ texte du pseudo (formulaire signal `form()` + `[formField]`) validé par Entrée (`commitName()`), mémorisé en `localStorage` et rechargé au démarrage ; pseudo aléatoire `Captain<n>` si aucun ; changer de pseudo bascule sur la partie de ce joueur. | Obligatoire | [FE §Le nom du joueur] |
| **F-24** | Bouton **Refresh** qui recharge le monde depuis le backend (`worldQuery.refetch()`). | Obligatoire | idem |

### 7.6 Unlocks et upgrades

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-25** | Fenêtre des **unlocks non débloqués** (bouton Unlocks), faisant apparaître le type et la valeur du bonus ; possibilité de n'afficher que les *n* premiers ou le prochain seuil de chaque produit. | Obligatoire | [FE §Affichage des unlocks, fig. 9] |
| **F-26** | Prise en compte **côté client** des unlocks à chaque augmentation de quantité : unlocks du produit (composant produit) et allunlocks (composant app, appliqués immédiatement à tous les produits) ; accélération de la barre en cours pour un bonus de vitesse ; message éphémère. | Obligatoire | [FE §Prise en compte des unlocks] |
| **F-27** | Fenêtre des **Cash Upgrades** avec bouton d'achat ; **badge** quand au moins un upgrade non débloqué est payable. | Obligatoire | [FE §Affichage des upgrades, fig. 10] |
| **F-28** | Application **côté client** du bonus d'un cash upgrade (même code que les unlocks, cible unique ou tous les produits) et mutation `acheterCashUpgrade`. | Obligatoire | [FE §Prise en compte des upgrades] |

### 7.7 Anges

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-29** | Bouton « Investors » ouvrant une fenêtre : anges actifs, anges supplémentaires gagnés par la partie en cours (RG-09), bouton de reset → mutation `resetWorld` puis `refreshWorld()`. | Obligatoire | [FE §Gestion des anges, fig. 11] |
| **F-30** | Les calculs de gain côté client appliquent le bonus des anges (RG-02). | Obligatoire | [FE §Prise en compte des anges] |
| **F-31** | Fenêtre des **Angel Upgrades** ; **badge** quand le joueur a assez d'anges pour au moins un upgrade. | Obligatoire | [FE §Gestion des Angel Upgrades, fig. 12] |
| **F-32** | Achat d'un angel upgrade côté client : type `ange` → `angelbonus` augmenté, sinon bonus gain / vitesse ; `activeangels` décrémenté du coût ; mutation `acheterAngelUpgrade`. | Obligatoire | [FE §Prise en compte des angel upgrades] |

### 7.8 Finalisation

| ID | Exigence | Niveau | Source |
|---|---|---|---|
| **F-33** | Monde finalisé : spécifications complètes des six produits, croissance des revenus testée (ni trop rapide, ni trop lente). | Obligatoire | [FE §Finalisation] |
| **F-34** | Branchement sur le monde d'un autre groupe en changeant l'adresse du serveur (`graphql.provider.ts` et service) ; sans bug, scores client et serveur restent proches (le serveur fait foi au rechargement). | Obligatoire | [FE §Finalisation] |

## 8. Exigences non fonctionnelles

| ID | Exigence | Source |
|---|---|---|
| **NF-01** | **Interopérabilité** : respect strict du schéma commun (noms, types, opérations) pour qu'un client tiers joue sur notre serveur et inversement. | [FE §Spécifications] |
| **NF-02** | **Persistance** sans base de données : un fichier JSON par joueur dans `backend/userworlds/`. | [BE §Création du resolver] |
| **NF-03** | **Le serveur fait foi** : le client se recale sur lui à chaque chargement ; une légère dérive client / serveur dans le temps est tolérée. | [FE §Finalisation] |
| **NF-04** | **Persistance hors connexion** : l'automatisation des managers produit même quand le joueur n'est pas connecté. | [FE §Les managers] |
| **NF-05** | Dépôt git unique `isiscapitalist/` avec `frontend/` et `backend/`. | [BE §Organisation] |

## 9. Livrables et critères d'acceptation

1. Dépôt git contenant le backend et le frontend, lançables (`npm run start:dev` sur le port 3000,
   `npm start` sur le port 4200).
2. Toutes les opérations de l'API (API-01) fonctionnent dans le playground et depuis le client.
3. Un monde original de 6 produits respectant B-04, avec ses images.
4. Le client joue une partie complète : produire, acheter (x1 / x10 / x100 / Max), engager des
   managers, débloquer unlocks et upgrades, accumuler des anges, faire un reset, acheter des angel
   upgrades, avec badges et messages éphémères.
5. Le client fonctionne contre le serveur d'un autre groupe (ou le serveur de test API-02), et
   notre serveur contre le client d'un autre groupe.

## 10. Ambiguïtés et incohérences relevées dans les sujets

| # | Point | Interprétation proposée |
|---|---|---|
| A1 | `lastupdate` est `String!` dans [BE] (et sur le serveur de test), `Int!` dans [FE]. Un horodatage en ms dépasse l'`Int` 32 bits de GraphQL. | Le type n'est jamais exploité par le client : choisir un type qui sérialise les ms (`Float` ou `String`) et le documenter. |
| A2 | Coût de *n* exemplaires : le texte donne `x·c + x·c² + …`, la formule `x·(1 + c + … + cⁿ)`, le code `cout × croissanceⁿ` pour le prochain prix. | RG-01 : somme géométrique à partir de `cout` (cohérente avec l'exemple 4 $ → 4,28 $ et avec la mise à jour de `cout`). |
| A3 | [BE] `engagerManager` ne mentionne pas le débit de l'argent, [FE] l'exige. | Débiter `seuil` des deux côtés (sinon le client et le serveur divergent). |
| A4 | Palier `ange` : « ajoute **typeratio** au bonus des anges ». | Lire « ajoute **ratio** ». |
| A5 | Exemple `productionDone` : `scrore: world.score + gain` (faute de frappe : le score ne serait jamais mis à jour). | Écrire `score`. |
| A6 | Liste des points d'accès : `acheterCachUpgrade` ; schéma : `acheterCashUpgrade`. | Le schéma fait foi. |
| A7 | La formule des anges (RG-09) est celle du monde « Terre » du jeu d'origine (scores de l'ordre de 10¹⁵ et plus). | Imposée par [FE] ; si le monde du groupe ne permet pas d'atteindre ces scores, faire valider un autre calibrage par l'enseignant. |
| A8 | `server()` + `logo` (`'http://localhost:3000' + 'icones/x.jpg'`) produit une URL sans `/`. | Terminer l'adresse du serveur par `/`. |
