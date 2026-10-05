# Prompt — Adresse du serveur dans Paramètres, achats barrés, palier sur la carte, onglets plus lisibles, teinte des notifications

- Date : 2026-10-05
- Étape roadmap : 10.8 (nouvelle ligne à ajouter, voir Étapes) — suppose 10.7 et D39 (mise en ligne) faites
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « rajoute dans les parametre une cham pour changer
  le lien du back-end ; augmente la taille de la police de la bottom bar ; quand on achete un
  upagrade/ un manager ou autre il disparait laisse le dans les affichage en barré une fois
  acheter ; quand on atteint un unlock, rajoute le nom et change l'image au niveau des affichage
  des item ; les notification sont bugger il ne prennent pas en compte le changement des couleur
  des parametre »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first) et `frontend/` (Angular 22
standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1 en thème « écran
cathodique », tests vitest). L'application est en ligne sur https://capitalist.lucaslopvet.fr
(D39). Tu es le développeur frontend : cette tâche ne touche que `frontend/src/` et la
documentation. Réponds en français ; code et commentaires selon `CLAUDE.md` et
`frontend/CLAUDE.md`.

### Objectif

Cinq retours du joueur, tous côté client :

- **A. Adresse du serveur** modifiable dans Paramètres (F-34 sans recompiler).
- **B. Barre d'onglets** (disposition « Onglets », D37) : libellés plus grands.
- **C. Éléments achetés** (managers, cash upgrades, angel upgrades, allunlocks) : ils ne
  disparaissent plus des listes, ils restent affichés barrés en fin de liste.
- **D. Carte produit** : le dernier palier atteint s'affiche (nom en sous-titre, image du palier).
- **E. Bug** : les notifications (snack-bar) ignorent la teinte choisie dans Paramètres.

### À lire avant d'écrire

1. `CLAUDE.md`, `frontend/CLAUDE.md` (conventions : composants présentationnels, monde immuable,
   tokens de couleur, un contenu = un seul `ng-template` pour les deux dispositions).
2. `docs/DECISIONS.md` : D34 (réglages d'affichage, teinte par `filter`), D35 (icônes Pip-Boy,
   CORS), D36 (le cahier des charges prime), D37 (disposition), D39 (`server.ts` en prod).
3. `docs/CAHIER-DES-CHARGES.md` : F-07, F-18, F-25, F-27, F-31, F-34.
4. Sources : `server.ts`, `graphql/graphql.provider.ts`, `game.service.ts` (`server`,
   `refreshWorld`, effet sur `worldQuery.error()`), `settings-panel.*`, `display-settings.ts`,
   `palier-list.*`, `product-card.*`, `game-icon.ts`, `tab-bar.css`, `app.ts` / `app.html`
   (`settingsTpl`, effet snack-bar, host bindings `data-tint`), `src/styles.css` (règles
   `app-root[data-tint=…]`), `test-world.ts`, et les specs de ces fichiers.

### Comportement attendu

**A. Adresse du serveur (Paramètres)**

- Nouvelle section `h3.section-title` « Serveur » dans `SettingsPanel`, après les sections
  d'affichage : un champ Material (`mat-form-field` + `matInput`) prérempli avec l'adresse
  courante, un bouton « Appliquer » et un bouton « Défaut ».
- Validation par Entrée ou « Appliquer » via une fonction pure `normalizeServerUrl(raw)` dans
  `server.ts` : `new URL(raw.trim())`, protocole `http:` ou `https:` obligatoire, résultat
  `origin + pathname` avec « / » final ajouté si absent (requête et ancre ignorées) ; sinon `null`.

  | Saisie | Résultat |
  |---|---|
  | `  https://capitalist.lucaslopvet.fr  ` | `https://capitalist.lucaslopvet.fr/` |
  | `http://localhost:3000` | `http://localhost:3000/` |
  | `https://autre-groupe.fr/api` | `https://autre-groupe.fr/api/` |
  | `localhost:3000`, `ftp://x.fr`, `` | `null` → erreur « L'adresse doit commencer par http:// ou https:// », rien n'est émis |

- Répartition : `SettingsPanel` reste présentationnel (inputs `server`, `defaultServer`,
  `httpsPage` — défaut `globalThis.location?.protocol === 'https:'` — et output `serverChange`) ;
  `app.html` (`settingsTpl`) relie `serverChange` à une nouvelle méthode
  `GameService.setServer(url)`, qui fait le reste.
- Adresse valide : `SERVER.set(url)`, mémorisée en localStorage sous `isiscapitalist.server`,
  message éphémère « Serveur : <url> », puis `refreshWorld()`. Au démarrage, `SERVER` part de
  l'adresse mémorisée si `normalizeServerUrl` l'accepte, sinon de l'adresse par défaut actuelle
  (`DEFAULT_SERVER` : `http://localhost:3000/` en mode dev, origine de la page en prod).
- « Défaut » revient à `DEFAULT_SERVER` et supprime la clé. « Appliquer » est désactivé tant que
  la saisie normalisée égale l'adresse courante.
- Si la page est en `https:` et la saisie en `http:`, un `mat-hint` non bloquant prévient :
  « Depuis une page https, le navigateur peut bloquer un serveur en http:// ».
- L'endpoint GraphQL suit le changement **sans recharger la page** : dans
  `graphql.provider.ts`, `uri: () => SERVER() + 'graphql'` (fonction évaluée à chaque opération)
  au lieu de la chaîne calculée une seule fois au démarrage. Les images suivent déjà (`GameIcon`
  lit `SERVER()`).

**B. Barre d'onglets** — `.tab-label` passe de `var(--mat-sys-label-large)` (1,15 rem) à
`var(--mat-sys-title-medium)` (1,35 rem), espacement des lettres inchangé. Mesure faite avant
rédaction, à 450 px : onglets de 83 → 89 px, hauteur toujours 48 px ; la pagination Material
apparaît donc sous ~535 px au lieu de ~500 px (comportement D26 conservé).

**C. Achats barrés** — `PalierList` affiche d'abord les paliers non débloqués (ordre du monde,
bouton comme aujourd'hui), puis les débloqués (ordre du monde) : ligne `.done` grisée, texte barré
(nom, produit, effet, coût), et à la place du bouton une mention texte passée par un nouvel input
`doneLabel` : « Engagé » (managers), « Acheté » (cash et angel upgrades), « Atteint » (allunlocks).
La colonne d'action existe si `actionLabel` **ou** `doneLabel` est fourni (les allunlocks, sans
bouton, gagnent donc une colonne qui n'est remplie que pour les paliers atteints). Quand tous les
paliers de la liste sont débloqués, `emptyText` s'affiche **au-dessus** du tableau barré. Badges
inchangés (ils ne comptent que l'achetable). Exemple, fenêtre Managers après avoir engagé Cappy :
Mister Orderly, Vault Boy, Commando… avec « Hire ! », puis Cappy barré avec « Engagé ».

**D. Palier sur la carte produit** — `ProductCard` calcule le dernier palier débloqué du produit
(`product().paliers`, plus grand `seuil` parmi `unlocked`) : son nom en `mat-card-subtitle` sous le
titre, et l'icône cliquable reçoit `[palier.logo, product.logo]` (repli de `GameIcon` si l'image
manque). Sans palier : pas de sous-titre, icône du produit. La ligne du sous-titre garde sa hauteur
même vide, pour que les cartes d'une même rangée restent alignées. Exemple, Nuka-Cola :

| Quantité | Sous-titre | Image |
|---|---|---|
| 24 | (vide) | `icones/nuka-cola.png` |
| 25 | Nuka-Cola Classic | `icones/palier-nuka-cola-logo.png` |
| 50 | Nuka-Cherry | `icones/nuka-cola.png` (le palier réutilise l'image du produit) |
| après reset | (vide) | `icones/nuka-cola.png` |

**E. Teinte des notifications** — cause : `MatSnackBar` rend dans `.cdk-overlay-container`,
enfant direct de `<body>`, donc hors de `<app-root>` qui porte `data-tint` et le `filter`
(`styles.css`). Correction : dans `App`, un `effect` pose `data-tint` sur
`inject(OverlayContainer).getContainerElement()` ; dans `styles.css`, les trois règles `filter`
(ambre, bleu, blanc) visent aussi `.cdk-overlay-container[data-tint=…]`. Une snack-bar ouverte
change de teinte avec le réglage.

### Cas limites

- Serveur injoignable ou qui refuse : l'effet existant affiche « Erreur de chargement du
  monde : … », le dernier monde reste affiché ; le joueur corrige ou clique « Défaut ». La fenêtre
  Paramètres reste ouverte même sans monde.
- Valeur mémorisée illisible ou localStorage indisponible → `DEFAULT_SERVER`, sans erreur.
- « Réinitialiser » (réglages d'affichage) ne touche pas à l'adresse du serveur.
- Autre serveur sans CORS sur `/icones` : icônes en couleur au lieu du rendu Pip-Boy (repli D35),
  ce n'est pas un bug.
- Palier débloqué localement à l'achat (`applyUnlocks`) : sous-titre et image changent
  immédiatement, sans attendre le serveur. Les allunlocks ne changent pas les cartes.
- Monde où tout est débloqué : message `emptyText` + liste barrée complète.

### Contraintes (et pourquoi)

- `SettingsPanel`, `PalierList`, `ProductCard` restent **présentationnels** (`input()` /
  `output()`, aucune injection) : leurs specs les testent sans serveur.
- `server.ts` reste le **seul** endroit qui définit l'adresse (F-34, D39) : défaut, clé de
  stockage, `normalizeServerUrl`, `readStoredServer` y vivent, en fonctions pures testables.
- Pas de `background` sur `.cdk-overlay-container` (contrairement à `app-root`) : il couvre tout
  l'écran et masquerait le jeu. Pas de `panelClass` non plus : il ne suivrait pas un changement de
  teinte pendant qu'une snack-bar est ouverte.
- Couleurs uniquement par tokens `var(--mat-sys-…)` ; `MatFormFieldModule` / `MatInputModule`
  font partie d'Angular Material déjà installé (aucune dépendance nouvelle).

### Hors périmètre

- Backend, schéma GraphQL, mutations : rien ne change.
- Effets CRT (scanlines, halo…) sur les notifications : seule la teinte est demandée.
- `UnlockList` (prochain palier de chaque produit, fenêtre Unlocks) : inchangée.
- Ne pas déployer (`deploy/deploy.sh`) et ne pas committer : l'utilisateur le demandera.

### Étapes

1. Lire les fichiers ci-dessus et vérifier trois hypothèses avant de coder : le type `uri` de
   `HttpLink` (`@apollo/client` 4) accepte une fonction ; `stubApollo()` expose un compteur de
   `refetch` utilisable par la spec de `setServer` ; quelles specs attendent
   `http://localhost:3000/` dans `SERVER`. Si l'une est fausse, le dire et adapter. Puis écrire un
   plan de 5 à 8 lignes (fichiers touchés par point A-E) et le montrer.
2. E puis B (petits, indépendants) : `app.ts`, `styles.css`, `tab-bar.css`.
3. C : `palier-list.*` + `doneLabel` passé par `app.html` aux 4 listes.
4. D : `product-card.*`.
5. A : `server.ts` (+ `server.spec.ts`), `graphql.provider.ts`, `game.service.ts`
   (`setServer`), `settings-panel.*`, `app.html`.
6. Mettre à jour les specs (voir Vérification), puis vérifier dans la preview.
7. Docs : `D40` (achats barrés en fin de liste — écart assumé avec F-18/F-25/F-27/F-31 qui ne
   listent que le non débloqué — et palier sur la carte), `D41` (adresse du serveur modifiable,
   `uri` en fonction, teinte des overlays) dans `docs/DECISIONS.md` ; lignes concernées de
   `frontend/CLAUDE.md` ; ajouter et cocher dans `docs/ROADMAP.md` :
   `- [x] 10.8 Retours joueur (D40, D41) : adresse du serveur dans Paramètres, achats barrés, palier sur la carte, onglets 1,35 rem, teinte des notifications.`

### Vérification — critères de succès

- [ ] `cd frontend && npx ng test --watch=false` : tout passe (173 tests avant la tâche), dont :
  - `server.spec.ts` (nouveau) : les 6 saisies du tableau A, et `readStoredServer` (clé valide,
    invalide, absente, localStorage qui lève) ;
  - `palier-list.spec.ts` : les deux tests « seuls les paliers NON débloqués » et « tout débloqué
    → pas de tableau » sont **remplacés** par : ordre non débloqués puis débloqués, ligne `.done`
    sans bouton avec `doneLabel`, `emptyText` + tableau quand tout est débloqué ;
  - `product-card.spec.ts` : les 4 lignes du tableau D (sous-titre et `src` de l'icône) ;
  - `settings-panel.spec.ts` : Entrée sur une adresse valide émet la forme normalisée ; adresse
    invalide → message d'erreur, rien d'émis ; « Défaut » émet `defaultServer` ; hint visible
    seulement si `httpsPage` et saisie en `http:` ;
  - `game.service.spec.ts` : `setServer` met à jour `SERVER`, la clé localStorage et appelle
    `refetch` une fois ;
  - `app.spec.ts` : `.cdk-overlay-container` porte `data-tint="amber"` après passage en ambre,
    puis `"blue"`.
  Les specs qui écrivent `isiscapitalist.server` nettoient le localStorage (sinon `SERVER` change
  pour les autres specs, qui attendent `http://localhost:3000/`).
- [ ] `cd frontend && npm run build` : aucun dépassement de budget (`anyComponentStyle` : 4 kB
  avertissement, 8 kB erreur).
- [ ] Preview (`backend` + `frontend` de `.claude/launch.json`), constaté à l'écran :
  1. Paramètres → Serveur : `localhost:3000` → erreur ; `http://localhost:3000` + Entrée → snack
     « Serveur : http://localhost:3000/ » et monde rechargé ; après rechargement de la page, le
     champ montre toujours cette adresse ; « Défaut » la retire.
  2. Teinte Ambre puis un achat : `getComputedStyle(document.querySelector('.cdk-overlay-container')).filter`
     vaut `hue-rotate(-105deg)`, la snack-bar est ambre et toujours centrée en bas (capture).
  3. Engager Cappy : il reste dans Managers, barré, en dernière ligne, avec « Engagé » et sans
     bouton ; le badge Managers est égal au nombre de boutons « Hire ! » actifs de la fenêtre.
  4. Nuka-Cola à 25 exemplaires : sous-titre « Nuka-Cola Classic », icône
     `palier-nuka-cola-logo.png`.
  5. Disposition Onglets : `getComputedStyle(.tab-label).fontSize` = `21.6px`, onglets de 48 px
     de haut, pastilles entières (non rognées) à 450 px et 1280 px de large.

### Rapport attendu

Fichiers modifiés par point (A-E), résultats réels des tests et du build (nombre de tests),
captures des vérifications 2, 3 et 4 de la preview, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Retour d'exécution (2026-10-05)

Prompt exécuté dans la même session ; 197 tests (173 avant), build sans avertissement, recette
dans la preview. Deux hypothèses du prompt étaient fausses et ont été corrigées (D41) :

- **E** : le filtre sur `.cdk-overlay-container` ne suffit pas dans un vrai navigateur. La CDK
  place les overlays dans un `[popover]` de la top layer, hors de portée du filtre d'un ancêtre
  (jsdom ne le montre pas). Le filtre est posé sur chaque `.cdk-overlay-pane`.
- **B** : le libellé ne faisait pas 1,15 rem mais 14 px. Le raccourci `var(--mat-sys-label-large)`
  garde la taille Material par défaut, seuls les tokens `-size` sont relevés par le thème. Avec
  les tokens séparés, le libellé fait bien 21,6 px ; la pagination apparaît sous ~650 px (et non
  ~535 px comme prévu).

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Éléments achetés | AdVenture Capitalist retire de ses listes les managers / upgrades achetés ; Cookie Clicker les garde visibles, séparés des achetables (menu Statistiques) | Le sujet (F-18, F-25, F-27, F-31) ne liste que le non débloqué ; le joueur veut voir ses achats → barrés **après** les achetables, comme Cookie Clicker | décision à noter (D40) |
| Signaler un état par le style seul | WCAG 1.4.1 / 1.3.1 : le barré seul n'est pas annoncé par les lecteurs d'écran | mention texte « Engagé / Acheté / Atteint » à la place du bouton | reprendre |
| Progression visuelle des produits | Jeux idle : le nom ou l'image d'un bâtiment évolue aux paliers, pour récompenser la progression | sous-titre + image du dernier palier, tirés des données du monde (aucune règle nouvelle) | reprendre |
| Endpoint GraphQL dynamique | Apollo `HttpLink` : `uri` accepte une fonction évaluée à chaque opération | `uri: () => SERVER() + 'graphql'` au lieu d'une chaîne figée au démarrage | reprendre |
| Thème des overlays CDK | Angular Material : les overlays vivent dans `.cdk-overlay-container` sous `<body>` ; on pose la classe / l'attribut de thème sur `OverlayContainer.getContainerElement()` | même `data-tint` sur le conteneur, mêmes filtres | reprendre |
| Contenu mixte | Les navigateurs bloquent les requêtes `http://` depuis une page `https://` (localhost à part, avec autorisation possible) | avertissement non bloquant, pas d'interdiction | décision à noter (D41) |

Sources : [Apollo — HTTP Link](https://www.apollographql.com/docs/react/v3/api/link/apollo-link-http),
[Apollo — Advanced HTTP networking](https://www.apollographql.com/docs/react/networking/advanced-http-networking),
[Angular Material theming — overlay handling (gist)](https://gist.github.com/tomastrajan/ee29cd8e180b14ce9bc120e2f7435db7),
[angular/components#10679](https://github.com/angular/components/issues/10679),
[AdVenture Capitalist wiki — Managers](https://adventure-capitalist.fandom.com/wiki/Managers),
[AdVenture Capitalist wiki — Upgrades](https://adventure-capitalist.fandom.com/wiki/Upgrades).
Cookie Clicker et WCAG : connaissances du modèle, non revérifiées.

Mesures faites pendant la rédaction (preview locale) : `.cdk-overlay-container` est enfant de
`BODY` (hors `app-root`) ; à 450 px, onglets de 83 px (label-large) et 89 px (title-medium),
hauteur 48 px dans les deux cas.

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Projet, mise en ligne (D39), cinq retours nommés A-E avec leur but. |
| 2 | Instructions explicites et séquencées | 2 | 7 étapes numérotées, ordre du plus petit au plus gros, fichiers par étape. |
| 3 | Exemples concrets | 2 | Tableau des 6 saisies d'URL, tableau Nuka-Cola (seuils 25 / 50 et logos vérifiés dans `origworld.ts`), exemple Managers. |
| 4 | Structure lisible | 2 | Comportement découpé A-E ; la répartition panneau / service de A est regroupée dans A (v2). |
| 5 | Rôle et périmètre | 2 | Développeur frontend, `frontend/src` seul ; hors périmètre explicite (backend, CRT des notifications, `UnlockList`, déploiement). |
| 6 | Critères de succès mesurables | 2 | Specs nommées avec leurs cas, valeurs calculées (`21.6px`, `hue-rotate(-105deg)`), badge comparé aux boutons actifs (v2). |
| 7 | Le « pourquoi » des contraintes | 2 | `uri` en fonction, pas de `background` ni de `panelClass` sur l'overlay, nettoyage du localStorage dans les specs, hauteur du sous-titre. |
| 8 | Raisonnement guidé | 2 | Trois hypothèses à vérifier avant de coder (v2), puis plan à montrer. |
| 9 | Format de sortie et livrables | 2 | Fichiers par point, D40 / D41, ligne exacte de la roadmap, rapport avec captures. |
| 10 | Concision et absence de contradiction | 1 | Long (cinq retours en un seul prompt), sans contradiction relevée ; une ligne inutile retirée (v2). |

Historique : v1 17/20 → v2 19/20.
Améliorations retenues : critère 6 (« le badge baisse de 1 » dépendait de l'argent restant →
badge = nombre de boutons actifs), critère 8 (vérification de `HttpLink.uri`, de `stubApollo` et
des specs dépendant de `SERVER` avant le plan), critère 4 / 10 (API du panneau déplacée des
contraintes vers A, ligne sur `types.ts` retirée car la tâche ne touche pas aux opérations).
