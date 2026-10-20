# Protocole de démonstration — grille d'évaluation fonctionnelle

Déroulé pas à pas pour montrer à l'évaluateur les **26 sous-critères** de
`grille évaluation fonctionnelle.pdf` (numérotés G-01 → G-26 comme dans `RECETTE.md` § 3), sur
https://capitalist.lucaslopvet.fr. Durée : 15 à 20 minutes. L'ordre suit le jeu, pas la grille :
la table de correspondance (§ 4) retrouve chaque critère.

Les messages de la snack-bar restent **2 secondes** : les montrer du doigt dès qu'ils apparaissent.

## 1. Préparation (la veille ou une heure avant)

Deux parties, toutes les deux sur le serveur en ligne :

| Partie | Usage | Comment la préparer |
|---|---|---|
| `demo-neuf` | Sections A et B : partir de zéro | Rien : elle est créée pendant la démo. Choisir un pseudo **jamais utilisé** (ex. `demo-neuf-2010`). |
| `demo-avance` | Sections C à G : managers, upgrades, reset, anges | La jouer **20 à 30 minutes** avant (voir ci-dessous). |

Préparer `demo-avance` :

1. Ouvrir le site, **Ctrl+F5** (dernière version), saisir `demo-avance` dans « Your ID », cliquer
   **Refresh**.
2. Paramètres → cadre **Démonstration** → choisir **Démo** (`150 × √(score / 10⁶)`) : un reset
   rapportera des anges en quelques minutes au lieu de ~30 (la formule du sujet, 10¹⁵, reste celle
   par défaut des nouveaux comptes, D43).
3. Jouer : produire, acheter, engager les managers au fur et à mesure.
4. **S'arrêter dans cet état** (à vérifier juste avant la séance, bandeau gauche) :
   - badge **Managers ≥ 1** : au moins un manager engageable **non engagé** (son produit doit
     avoir au moins un exemplaire, D42) ;
   - badge **Cash Upgrades ≥ 1** : au moins un upgrade achetable non acheté ;
   - badge **Investors ≥ 10** : au moins 10 anges à réclamer (pour acheter ensuite l'angel upgrade
     « Fortune Finder », 10 anges) ;
   - **aucun reset déjà fait** (Investors : « Anges actifs 0 ») — le reset se fait devant
     l'évaluateur ;
   - au moins un produit **sans manager** avec un exemplaire (pour la production manuelle).
5. Noter les deux pseudos sur un papier.

Juste avant la séance : Ctrl+F5, disposition **Sujet** (Paramètres → Disposition), son coupé si
la salle est calme (Paramètres → Son).

## 2. Déroulé

Colonnes : **Action** (ce que je fais) → **Montrer** (ce que l'évaluateur doit voir) → **À annoncer** : la section, le sous-critère et la description attendue de la grille, mot pour mot, à dire à voix haute en faisant le geste.

### A. Pseudo et partie neuve — `demo-neuf` (2 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| A1 | Cliquer dans « Your ID », effacer, taper `demo-neuf-2010` **sans appuyer sur Entrée**. | Le champ accepte la saisie. | **Gestion du pseudo du joueur › Champ texte** : « Le champ ID du joueur accepte la saisie d'un pseudo. » |
| A2 | Cliquer **Refresh**. | Monde neuf de ce pseudo : argent 0, Nuka-Cola à 1 exemplaire, les 5 autres à 0. | **Gestion du pseudo du joueur › Refresh** : « Le bouton Refresh recharge le monde avec le nouveau pseudo. » |
| A3 | Appuyer sur **F5** (rechargement complet). | « Your ID » contient toujours `demo-neuf-2010` et la même partie revient : le pseudo est en `localStorage` (clé `username`). | **Gestion du pseudo du joueur › Persisté** : « Le pseudo est stocké dans localStorage et rechargé au démarrage. » |

### B. Production et achat — `demo-neuf` (4 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| B1 | Montrer les boutons d'achat. | À 0 $, tous les boutons « x1 — … » sont **grisés**. | **Achat de produit › Bouton d'achat** : « Le bouton est activé seulement si le joueur possède les fonds suffisants (canBuy). » |
| B2 | Cliquer sur l'**image** de Nuka-Cola. | La barre démarre. | **Lancement de la production › Clic sur l'icône** : « Un clic déclenche la barre de progression. » |
| B3 | Regarder la carte pendant la production. | La barre progresse de 0 à 100 % en 0,5 s (vitesse du produit) ; le minuteur à droite du bouton décroît (`00:00:00.4` → … → `00:00:00.0`) et **revient à 0** à la fin. | **Lancement de la production › Animation** : « La barre de progression progresse de 0 % à 100 % en fonction de la vitesse du produit. »<br>**Lancement de la production › Temps restant** : « Le champ timeleft du produit diminue correctement et passe à 0 quand la production est terminée. » |
| B4 | Regarder l'argent en haut. | À la fin de la barre, l'argent augmente du gain affiché dans la barre (1 $). | **Lancement de la production › Mise à jour du solde** : « À 100 % le gain est ajouté à l'argent. » |
| B5 | Cliquer 3 fois de plus sur l'image (attendre la fin de chaque production) jusqu'à 4 $. | Le bouton « x1 — 4.00 » devient **actif** dès que l'argent atteint 4 $. | **Achat de produit › Bouton d'achat** : « Le bouton est activé seulement si le joueur possède les fonds suffisants (canBuy). » |
| B6 | Cliquer « x1 — 4.00 ». | Quantité 1 → 2, argent 4 → 0, le bouton affiche le coût du **suivant** (4,28 = 4 × 1,07) ; snack-bar « Achat : 1 × Nuka-Cola ». | **Achat de produit › Mise à jour du monde** : « Après l'achat : la quantité du produit, le coût du prochain exemplaire et le solde du joueur sont correctement actualisés. »<br>**Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. » |
| B7 | Cliquer le bouton **Buy x1** de l'en-tête 4 fois. | Il passe par **x10 → x100 → Max → x1** ; à chaque cran, le libellé et le coût de chaque bouton d'achat changent. | **Achat de produit › Multiplicateur** : « Le sélecteur global passe de x1 → x10 → x100 → Max et boucle correctement. »<br>**Achat de produit › Calcul du coût** : « Le coût d'achat s'ajuste en fonction de la valeur du multiplicateur. » |

### C. Managers — `demo-avance` (3 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| C1 | « Your ID » → `demo-avance`, **Refresh**. | Partie préparée : produits, managers déjà engagés (chip « manager »), argent. | **Synchronisation frontend - backend › Conservation des propriétés du monde** : « Toutes les propriétés du monde sont conservées après rechargement (quantité produits, bonus débloqués, anges, etc.). » |
| C2 | Montrer le bandeau gauche. | Badges visibles **seulement** où une action est possible (Managers, Cash Upgrades, Investors) ; pas de badge sur Angel Upgrades (0 ange actif) ni sur Unlocks. | **Gestion des managers › Badge du bouton** : « Le bouton Managers possède un badge indiquant le nombre de managers achetables. »<br>**Feedback visuel › Badges** : « Les badges des boutons (Managers, Upgrades, etc.) sont visibles uniquement lorsqu'une action est possible. » |
| C3 | Cliquer **Buy x1** jusqu'à **Max**. | Chaque bouton affiche la quantité maximale achetable avec l'argent actuel (« x178 — … »), boutons inabordables grisés. | **Achat de produit › Calcul du nombre à acheter** : « En mode Max, calcul et affichage de la quantité maximale achetable à partir du solde actuel. » |
| C4 | Repasser en **x1**. Cliquer **Managers**. | Fenêtre superposée « Managers make you feel better ! » : **uniquement les managers non engagés** ; « Hire ! » actif seulement si l'argent suffit et que le produit a un exemplaire. | **Gestion des managers › Affichage modal** : « Le bouton Managers ouvre une fenêtre modale listant uniquement les managers non débloqués. » |
| C5 | Noter l'argent, cliquer **Hire !** sur un manager actif. | Le coût est **débité** ; le manager **disparaît** de la liste ; snack-bar « <manager> engagé : <produit> est automatisé ». | **Gestion des managers › Achat** : « En cliquant sur Hire : le coût est soustrait du solde. »<br>**Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. » |
| C6 | Fermer (Close), regarder la carte du produit, **sans rien cliquer**. | Chip « manager » ; la barre repart toute seule à chaque fin de cycle, l'argent monte en continu. Le badge Managers a diminué (ou disparu). | **Gestion des managers › Badge du bouton** : « Le bouton Managers possède un badge indiquant le nombre de managers achetables. »<br>**Gestion des managers › Production automatisée** : « Dès qu'un manager est débloqué, le produit démarre automatiquement la production dès que le temps restant atteint 0, même sans interaction du joueur. »<br>**Feedback visuel › Badges** : « Les badges des boutons (Managers, Upgrades, etc.) sont visibles uniquement lorsqu'une action est possible. » |

### D. Cash upgrades — `demo-avance` (2 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| D1 | Cliquer **Cash Upgrades** (bandeau gauche). | Liste accessible depuis la barre latérale ; « Buy ! » actif **seulement** si l'argent suffit, les autres grisés. | **Upgrades & Angel-upgrades › Liste accessible** : « Les sections Cash Upgrades et Angel Upgrades sont affichables depuis la barre latérale. »<br>**Upgrades & Angel-upgrades › Conditions d'achat** : « Un upgrade n'est achetable que si le joueur possède le montant requis (argent ou angels). » |
| D2 | Noter le gain affiché dans la barre du produit ciblé (colonne « produit ») ; cliquer **Buy !**. | Snack-bar « Upgrade acheté : … (revenus ×3) » ; argent débité. | **Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. » |
| D3 | Fermer, regarder la carte du produit ciblé. | Le gain affiché dans la barre est **multiplié** (×3) immédiatement. | **Upgrades & Angel-upgrades › Effet de l'upgrade** : « Après achat : le ratio (gain, vitesse ou ange) s'applique immédiatement au(x) produit(s) ciblé(s). » |

### E. Reset et anges — `demo-avance` (3 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| E1 | Noter le gain de Nuka-Cola. Cliquer **Investors**. | Fenêtre « Angel Investors » : **anges actifs** (0), **total des anges**, bonus par ange (2 %), score, formule ; bouton « N anges à réclamer avec un reset ». | **Reset du monde › Bouton Reset** : « La section Investors est affichable depuis la barre latérale avec le nombre total d'anges, le nombre d'anges actifs et un bouton reset. » |
| E2 | Cliquer le bouton de reset, confirmer. | Snack-bar « Monde remis à zéro : N ange(s) gagné(s) ». | **Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. » |
| E3 | Regarder le jeu. | Argent 0, quantités revenues au départ (Nuka-Cola à 1 : c'est le monde d'origine du sujet, sinon on ne pourrait rien faire), plus de manager ni d'upgrade (badges Managers et Cash Upgrades disparus). | **Reset du monde › Comportement** : « Après le reset : le solde, les quantités, les managers et les upgrades reviennent à 0 ; le nombre actif d'angels augmente ainsi que le revenu de la production des produits. » |
| E4 | Rouvrir **Investors**. | **Anges actifs = N** (avant : 0). | **Reset du monde › Comportement** : « Après le reset : le solde, les quantités, les managers et les upgrades reviennent à 0 ; le nombre actif d'angels augmente ainsi que le revenu de la production des produits. » |
| E5 | Comparer le gain de Nuka-Cola avec E1. | Gain **augmenté** : 1 × (1 + N × 2 %). | **Reset du monde › Comportement** : « Après le reset : le solde, les quantités, les managers et les upgrades reviennent à 0 ; le nombre actif d'angels augmente ainsi que le revenu de la production des produits. » |

### F. Angel upgrades — `demo-avance` (2 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| F1 | Montrer le badge **Angel Upgrades** (apparu après le reset). Cliquer dessus. | Liste accessible ; « Buy ! » actif seulement pour les upgrades dont le coût en **anges** est ≤ anges actifs (Fortune Finder, 10 anges). | **Upgrades & Angel-upgrades › Liste accessible** : « Les sections Cash Upgrades et Angel Upgrades sont affichables depuis la barre latérale. »<br>**Upgrades & Angel-upgrades › Conditions d'achat** : « Un upgrade n'est achetable que si le joueur possède le montant requis (argent ou angels). »<br>**Feedback visuel › Badges** : « Les badges des boutons (Managers, Upgrades, etc.) sont visibles uniquement lorsqu'une action est possible. » |
| F2 | Noter le gain de Nuka-Cola ; cliquer **Buy !** sur Fortune Finder. | Snack-bar « Angel upgrade acheté : Fortune Finder (anges +1 %) ». | **Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. » |
| F3 | Regarder Nuka-Cola, puis **Investors**. | Gain augmenté immédiatement ; anges actifs −10 ; bonus par ange 2 % → 3 %. | **Upgrades & Angel-upgrades › Effet de l'upgrade** : « Après achat : le ratio (gain, vitesse ou ange) s'applique immédiatement au(x) produit(s) ciblé(s). » |

### G. Synchronisation, adresse du back, erreurs — `demo-avance` (3 min)

| # | Action | Montrer | À annoncer (grille) |
|---|---|---|---|
| G1 | Lancer quelques productions / un achat, puis cliquer **Refresh**. | L'argent repart de la **dernière valeur affichée** : il ne recule pas (il peut monter de quelques centièmes de seconde de production). | **Synchronisation frontend - backend › Évolution correcte de l'argent** : « Lors du refresh du monde l'argent correspond à la dernière valeur affichée. » |
| G2 | Appuyer sur **F5**. | Après rechargement complet : mêmes quantités, anges actifs et total, bonus 3 %, Fortune Finder toujours acheté. | **Synchronisation frontend - backend › Conservation des propriétés du monde** : « Toutes les propriétés du monde sont conservées après rechargement (quantité produits, bonus débloqués, anges, etc.). » |
| G3 | **Paramètres** → cadre « Serveur » → champ **Adresse du serveur**. | Un champ permet de changer l'adresse du backend. | **Feedback visuel › Adresse du back** : « Un champ permet de changer l'adresse du backend. » |
| G4 | Remplacer par `https://serveur-inexistant.invalid/` → **Appliquer**. | Snack-bar « Serveur : … » puis « Erreur de chargement du monde : Failed to fetch » (erreur serveur). | **Feedback visuel › SnackBar** : « Tous les événements critiques (achat, erreur serveur, hire manager, reset) affichent un message temporaire. »<br>**Feedback visuel › Adresse du back** : « Un champ permet de changer l'adresse du backend. » |
| G5 | *(Si l'évaluateur fournit son serveur, ou celui d'un autre groupe)* Coller son adresse, même avec `/graphql` à la fin (ex. `https://isiscapitalist.chl.connected-health.fr/graphql`) → **Appliquer**. | Le monde de ce serveur s'affiche (autre nom, autres produits) ; on peut y jouer. Le cadre « Démonstration » disparaît (réglage propre à notre serveur, D49). | **Feedback visuel › Adresse du back** : « Un champ permet de changer l'adresse du backend. » |
| G6 | Cliquer **Défaut**. | Retour sur notre serveur et sur la partie `demo-avance`. | **Feedback visuel › Adresse du back** : « Un champ permet de changer l'adresse du backend. » |

## 3. Si quelque chose coince

| Problème | Parade |
|---|---|
| Ancienne version affichée (bug déjà corrigé qui réapparaît) | **Ctrl+F5**. |
| Aucun produit affiché | Le serveur choisi ne répond pas : Paramètres → **Défaut**. |
| Snack-bar ratée | Elle est rejouée à l'action suivante du même type ; ou montrer l'effet (argent, liste). |
| Pas de manager engageable | Acheter un exemplaire du produit concerné (D42), ou attendre que l'argent suffise. |
| Pas assez d'anges pour Fortune Finder | Vérifier la formule « Démo » avant le reset (Paramètres → Démonstration). |
| Le bouton Hire ! reste grisé avec assez d'argent | Le produit du manager est à 0 exemplaire (D42) : c'est voulu, l'expliquer. |

## 4. Correspondance grille → étapes

| Section de la grille | Sous-critère | ID | Étapes |
|---|---|---|---|
| Lancement de la production | Clic sur l'icône | G-01 | B2 |
| | Animation | G-02 | B3 |
| | Mise à jour du solde | G-03 | B4 |
| | Temps restant | G-04 | B3 |
| Achat de produit | Multiplicateur | G-05 | B7 |
| | Calcul du nombre à acheter (Max) | G-06 | C3 |
| | Calcul du coût | G-07 | B7 |
| | Bouton d'achat (`canBuy`) | G-08 | B1, B5 |
| | Mise à jour du monde | G-09 | B6 |
| Gestion des managers | Affichage modal | G-10 | C4 |
| | Badge du bouton | G-11 | C2, C6 |
| | Achat (Hire) | G-12 | C5 |
| | Production automatisée | G-13 | C6 |
| Upgrades & Angel-upgrades | Liste accessible | G-14 | D1, F1 |
| | Conditions d'achat | G-15 | D1, F1 |
| | Effet de l'upgrade | G-16 | D3, F3 |
| Reset du monde | Bouton Reset (Investors) | G-17 | E1 |
| | Comportement | G-18 | E3, E4, E5 |
| Gestion du pseudo | Champ texte | G-19 | A1 |
| | Persisté | G-20 | A3 |
| | Refresh | G-21 | A2 |
| Feedback visuel | SnackBar | G-22 | B6, C5, D2, E2, F2, G4 |
| | Badges | G-23 | C2, C6, F1 |
| | Adresse du back | G-24 | G3 → G6 |
| Synchronisation | Conservation des propriétés | G-25 | C1, G2 |
| | Évolution correcte de l'argent | G-26 | G1 |
