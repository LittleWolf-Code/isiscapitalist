# Thème « Nuka Capitalist » — casting et lexique

Habillage Fallout du monde de départ (`backend/src/origworld.ts`). Ce fichier fige les choix faits
en brainstorming. **Appliqué le 05/10/2026 (phase 10.4, F-33)** : le casting validé, les paliers
proposés et des noms proposés pour les cases restantes sont dans `origworld.ts` (noms et images
seulement, chiffres inchangés) ; les cases marquées *proposé* restent à confirmer. Source de
départ : `Nuka Capitalist.pdf` (6 objets + images produit déjà choisies).

## Lexique (correspondance AdVenture Capitalist → Fallout) — proposé

| Concept | Équivalent Fallout | Note |
|---|---|---|
| Argent | Bouchons (caps) | suffixe à changer côté frontend |
| Paliers produit (25 / 50 / 100) | Variantes du produit | ex. Nuka-Cherry → Quantum → Victory |
| Upgrades produit (gain ×3) | Équipements / mascottes | cf. casting |
| Upgrades globaux (1e6 → 1e12) | Magazines | *Tales of a Junktown Jerky Vendor*… |
| Anges | Bobbleheads Vault-Tec | bonus permanent qui survit au reset |
| Upgrades d'anges | Perks (Cap Collector, Fortune Finder, Troc) | |
| Paliers globaux `allunlocks` | Lieux conquis (Sanctuary → Diamond City → Nuka-World) | |
| Reset | « Activer le G.E.C.K. » | |

## Casting — validé (20/09/2026)

| Case | Mascotte / image | Fichier `icones/` |
|---|---|---|
| Logo du monde | **Vault Boy** (pouce levé) | `world.png` |
| Produit 1 | **Nuka-Cola** (bouteille, image du PDF) | `nuka-cola.png` |
| Produit 2 | **Stimpak** (image du PDF) | `stimpak.png` |
| Produit 3 | **Pip-Boy** (image du PDF) | `pip-boy.png` |
| Produit 4 | **Armes** (pistolet 10 mm, image du PDF) | `armes.png` |
| Produit 5 | **Armure assistée** (casque T-60, image du PDF) | `armure.png` |
| Produit 6 | **Nuke** (mini-nuke, image du PDF) | `nuke.png` |
| Manager Nuka-Cola | **Cappy** | `manager-cappy.png` |
| Manager Stimpak | **Mister Orderly** | `manager-mister-orderly.png` |
| Manager Pip-Boy | **Vault Boy** (pose Pip-Boy, distincte du logo) | `manager-vault-boy-pipboy.png` |
| Manager Armes | **Commando** — Vault Boy à la mitraillette (PDF du 05/10 ; remplace « Gunslinger », passé en palier 1) | `manager-vault-boy-mitraillette.png` |
| Manager Armures | **Confrérie de l'Acier** (emblème, pas un paladin en T-60) | `manager-confrerie.png` |
| Manager Nuke | **Nuka-Girl** en combinaison spatiale (PDF du 05/10, recadrée sur le buste) | `manager-nuka-girl-spatiale.png` |
| Upgrade Nuka-Cola | **Affiche Nuka-Cola** (PDF du 05/10 ; remplace « Bottle ») | `upgrade-affiche-nuka-cola.png` |
| Upgrade Pip-Boy | **Vault Girl** | `upgrade-vault-girl.png` |
| Upgrade Nuke | **Sugar Bombs** | `upgrade-sugar-bombs.png` |

Vault Boy apparaît trois fois (logo, Pip-Boy, Armes) volontairement, dans trois poses différentes.
Repli envisagé si ça gêne : Protectron (RobCo) en manager Pip-Boy.

## Paliers produit — proposé, appliqué

Les cases en **gras** ont une image propre (PDF du 05/10/2026) ; les autres reprennent l'image du
produit.

| Produit | 25 (vitesse ×2) | 50 (gain ×2) | 100 (vitesse ×2) |
|---|---|---|---|
| Nuka-Cola | **Nuka-Cola Classic** (logo) | Nuka-Cherry | **Nuka-Cola Quantum** |
| Stimpak | Med-X | RadAway | Super Stimpak |
| Pip-Boy | Pip-Boy 2000 | Pip-Boy 3000 | Pip-Boy 3000 Mark IV |
| Armes | **Gunslinger** (Vault Boy aux revolvers) | Fusil à plasma | Fusil Gauss |
| Armure assistée | T-45 | T-51 | X-01 |
| Nuke | **Fat Man** (mini-nuke) | **Ogive MIRV expérimentale** (mini-nuke à réaction) | **Missile nucléaire (Site Alpha)** (champignon) |

Le `logo` d'un palier peut pointer vers l'image du produit si on ne veut pas 18 images de plus
(le `GameIcon` du frontend a déjà le repli palier → produit → monde, D32).

## Cases restantes — proposé, appliqué (05/10/2026)

| Case | Nom dans `origworld.ts` | Image |
|---|---|---|
| Upgrade 2 (×3) | **Pinkie Pie** (armée), **cible Armes** (PDF du 05/10, choix de l'utilisateur ; remplace « Doc Phosphate » sur Stimpak, qui n'a plus d'upgrade propre) | `upgrade-pinkie-pie.png` |
| Upgrade Armes (×3) | **One-Eyed Ike** (hors-la-loi de Dry Rock Gulch) | `upgrade-one-eyed-ike.png` (20/10) |
| Upgrade Armures (×3) | **The Mechanist** | `upgrade-mechanist.png` (20/10) |
| Upgrades globaux (magazines, ×2) | **Tales of a Junktown Jerky Vendor**, **Grognak the Barbarian**, **Guns and Bullets**, **Astoundingly Awesome Tales** | `upgrade-junktown-jerky-vendor.png`, `upgrade-grognak.png`, `upgrade-guns-and-bullets.png`, `upgrade-awesome-tales.png` (20/10) |
| Paliers globaux (lieux) | **Sanctuary** (25), **Diamond City** (50), **Nuka-World** (100) | `global.png` |
| Upgrades d'anges (perks) | **Fortune Finder** (+1 %), **Cap Collector** (gain ×2), **Troc** (+2 %) | `bobblehead.png` |
| Logo du monde | nom **Nuka Capitalist** | `world.png` (inchangé) |

Mascottes encore disponibles : Festus, Mothman, Red Rocket, Jangles the Moon Monkey, Giddyup
Buttercup, Mr. Pebbles, Captain Cosmos, Manta Man, Mister Handy, Protectron, Mad Mulligan, l'Atome.

Lexique non appliqué (*proposé*, à confirmer) : argent → bouchons, reset → « Activer le G.E.C.K. ».

## Images

### Images de la version du 05/10/2026 du PDF (Bureau, 10 pages)

- 10 images ajoutées par l'utilisateur sous les rubriques manager / palier / upgrade (aucun nom
  nouveau, sauf « cappy » déjà en place) : `palier-nuka-cola-logo`, `palier-nuka-cola-quantum`,
  `manager-vault-boy-mitraillette`, `palier-vault-boy-revolvers`, `manager-nuka-girl-spatiale`,
  `palier-mini-nuke`, `palier-mini-nuke-reaction`, `palier-champignon-atomique`,
  `upgrade-affiche-nuka-cola`, `upgrade-pinkie-pie` (xref 8, 12, 22, 23, 32, 35, 36, 39, 40, 43).
- Détourage : remplissage depuis les bords sur les pixels clairs et peu saturés (luminosité ≥ 180,
  écart entre canaux ≤ 22) pour les fonds en faux damier ; ≥ 238 / ≤ 12 pour les fonds blancs
  (Nuka-Girl, champignon) ; aucun pour l'affiche. Recadrage, carré 512 × 512, marge 8 %.
  Nuka-Girl est recadrée sur la moitié haute (en pied, illisible dans un rond de 40 à 80 px).
- Plus référencées par `origworld.ts` (gardées pour les anciennes parties) :
  `manager-vault-boy-gunslinger.png`, `manager-nuka-girl.png`, `upgrade-bottle.png`.

### Images des cash upgrades restants (20/10/2026)

- Les 6 cash upgrades qui reprenaient l'image de leur produit (One-Eyed Ike, The Mechanist) ou
  `global.png` (les 4 magazines) ont chacun leur image, tirée de Nukapedia (tableau ci-dessous).
  Choix fait sur un aperçu passé par le rendu Pip-Boy du client (96 × 96, 4 verts, D35), en 64
  et 40 px.
- Même méthode que le 05/10 : détourage par remplissage depuis les bords (≥ 180 / ≤ 22 pour le
  Protectron, ≥ 200 / ≤ 30 pour le casque), recadrage sur les pixels d'alpha > 96, carré
  512 × 512, marge 8 %.
- Magazines : couverture **rognée en carré par le haut** (titre + personnage). En entier, les
  quatre couvertures devenaient des rectangles verts identiques ; rognées, le titre se lit en 64 px.
- One-Eyed Ike : le wiki n'a de lui que des captures en jeu (décor trop chargé une fois réduit) ;
  l'image est le Protectron shérif de Nuka-World, même modèle de robot du Far West, au chapeau.
- Les parties existantes gardent l'ancien `logo` (enregistré dans leur JSON) jusqu'au prochain reset.

### Images produits et symboles (05/10/2026)

- `nuka-cola.png`, `stimpak.png`, `pip-boy.png`, `armes.png`, `armure.png`, `nuke.png` : images de
  `Nuka Capitalist.pdf` (xref 6, 9, 13, 14, 18, 22), fond uni détouré par remplissage depuis les
  coins (tolérance 40), recadrées puis centrées dans un carré 512 × 512 transparent (marge 8 %).
- `global.png` (symbole radioactif jaune et noir) et `bobblehead.png` (figurine Vault-Tec stylisée)
  : dessinés en 1024 px puis réduits, faute d'image dans le PDF.
- Le rendu « écran Pip-Boy » est fait par le frontend (D35) à partir de ces sources couleur.
- Les icônes unies de démonstration (`item1..6`, `manager1..6`, `all`, `angel`, `npm run icons`) ne
  sont plus référencées par `origworld.ts` ; elles restent servies pour les anciennes parties.

### Pipeline (fait le 20/09/2026 pour les 10 cases validées)

- Sources couleur recadrées en carrés 512×512 (fond transparent) dans `backend/scripts/icon-sources/`.
- `python backend/scripts/pipboy-icons.py` les convertit en icônes « écran Pip-Boy » dans
  `backend/public/icones/` : grille **96×96**, luminance → **4 niveaux de vert** (sombre `#002d16`,
  moyen `#006e37`, primary `#1aff80`, pâle `#c4ffcb`), gamma 0,65, seuils 0 / 60 / 130 / 205,
  pas de tramage, alpha binarisé. Choix validés : grille 96 (contre 64 et 48), sans Floyd-Steinberg
  (trop de bruit), gamma relevé (les combinaisons bleues des Vault Boy tombaient dans le noir).
- `world.png` a été retiré de `make-icons.mjs` (`npm run icons`) pour ne plus être écrasé par
  l'icône unie de démonstration. Les autres icônes de démo (`item1..6`, `manager1..6`, `all`,
  `angel`) restent en place tant qu'`origworld.ts` les référence.
- Les mêmes réglages doivent servir aux images restantes (paliers, upgrades, anges) : déposer la
  source 512×512 dans `icon-sources/` et relancer le script.

### Sources Nukapedia (fallout.fandom.com, assets © Bethesda — usage pédagogique, à citer dans le README)

| Fichier | Fichier wiki (`File:…`) | Retouche |
|---|---|---|
| `world.png` | `VaultBoy AnimationsOk.png` | pose clin d'œil + pouce découpée dans la planche (x 860–1380, y 505–952) |
| `manager-cappy.png` | `FO4NW Cappy.png` | — |
| `manager-mister-orderly.png` | `Mister Handy.png` | pas de rendu propre de Mister Orderly sur le wiki ; Mister Handy de base (quasi identique) |
| `manager-vault-boy-pipboy.png` | `Vault-Tec cardboard Vault Boy.png` | pas de Vault Boy « montrant son Pip-Boy » ; silhouette carton FO76 pointant du doigt |
| `manager-vault-boy-gunslinger.png` | `Fo4 Gunslinger.png` | recadré sur le personnage (x 75–270, y 55–287) |
| `manager-confrerie.png` | `BOS Fo4 Classic Logo.png` | — |
| `manager-nuka-girl.png` | `FO4 Nuka Girl prewar.png` | recadré sur le buste (x 100–940, y 0–840) : en pied, la combinaison noire disparaissait |
| `upgrade-bottle.png` | `FO4NW Cappy and Bottle (2).png` | Bottle isolé (x 80–555), main de Cappy effacée en haut à droite |
| `upgrade-vault-girl.png` | `Fo4 Vault Girl.png` | — |
| `upgrade-sugar-bombs.png` | `Fo4 pre-War Sugar Bombs.png` | — |
| `upgrade-one-eyed-ike.png` | `ProtectronSheriff-NukaWorld.png` | fond clair détouré |
| `upgrade-mechanist.png` | `Mechanists helmet.png` | fond blanc détouré, croquis-signature effacé en haut à droite (x 800+, y 0–150) |
| `upgrade-junktown-jerky-vendor.png` | `Jerky vendor - benefits of child labor.jpg` | couverture entière |
| `upgrade-grognak.png` | `Grognak Fatherless Cur.png` | carré du haut de la couverture |
| `upgrade-guns-and-bullets.png` | `Guns and bullets take aim cover.png` | carré du haut de la couverture |
| `upgrade-awesome-tales.png` | `Fallout4 AwesomeTales4.png` | carré du haut de la couverture |

Alternatives écartées mais disponibles : `FO76 Gunslinger perk.png` (carte de perk, illisible en
64 px), `Gunslinger.png` (dessin N&B 158 px), `FO76 Vault boy Excited.png` (autre pose pour le
manager Pip-Boy), `Doctor Orderly in Action.png` (vrai Mister Orderly, capture in-game sombre).
Pour les cash upgrades (20/10) : `OneEyedIke-NukaWorld.jpg` (capture en jeu), `Drawing of the
Mechanist.png`, `MechanistPoster2-Automatron.png`, `Tales of a Junktown Jerky Vendor.png` (livre
de Fallout 3, illisible en vert), `Grognak Blood on the Harp.png`, `Guns and bullets commies
cover.png`, `Fallout4 AwesomeTales8.png`.

- Format d'affichage : 64 px dans la carte produit, donc 96 px natifs restent nets (`image-rendering:
  pixelated` à prévoir côté frontend pour éviter le lissage à l'agrandissement).
- Convention de nommage : slugs minuscules, préfixe `manager-` / `upgrade-` / `palier-`.
