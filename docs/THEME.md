# Thème « Nuka Capitalist » — casting et lexique

Habillage Fallout du monde de départ (`backend/src/origworld.ts`). Ce fichier fige les choix faits
en brainstorming ; les cases **validées** sont à reporter telles quelles dans `origworld.ts` et dans
`backend/public/icones/`, les cases **proposées** restent à confirmer, les cases **à faire** sont
vides. Source de départ : `Nuka Capitalist.pdf` (6 objets + images produit déjà choisies).

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

| Case | Mascotte / image | Fichier `icones/` (proposé) |
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
| Manager Armes | **Vault Boy « Gunslinger »** (deux revolvers) | `manager-vault-boy-gunslinger.png` |
| Manager Armures | **Confrérie de l'Acier** (emblème, pas un paladin en T-60) | `manager-confrerie.png` |
| Manager Nuke | **Nuka-Girl** | `manager-nuka-girl.png` |
| Upgrade Nuka-Cola | **Bottle** | `upgrade-bottle.png` |
| Upgrade Pip-Boy | **Vault Girl** | `upgrade-vault-girl.png` |
| Upgrade Nuke | **Sugar Bombs** | `upgrade-sugar-bombs.png` |

Vault Boy apparaît trois fois (logo, Pip-Boy, Armes) volontairement, dans trois poses différentes.
Repli envisagé si ça gêne : Protectron (RobCo) en manager Pip-Boy.

## Paliers produit — proposé

| Produit | 25 (vitesse ×2) | 50 (gain ×2) | 100 (vitesse ×2) |
|---|---|---|---|
| Nuka-Cola | Nuka-Cherry | Nuka-Cola Quantum | Nuka-Cola Victory |
| Stimpak | Med-X | RadAway | Super Stimpak |
| Pip-Boy | Pip-Boy 2000 | Pip-Boy 3000 | Pip-Boy 3000 Mark IV |
| Armes | Fusil laser AER9 | Fusil à plasma | Fusil Gauss |
| Armure assistée | T-45 | T-51 | X-01 |
| Nuke | Fat Man | Ogive MIRV expérimentale | Missile nucléaire (Site Alpha) |

Le `logo` d'un palier peut pointer vers l'image du produit si on ne veut pas 18 images de plus
(le `GameIcon` du frontend a déjà le repli palier → produit → monde, D32).

## À faire

- Upgrades produit **Stimpak**, **Armes**, **Armures** (3 cases).
- Paliers globaux (3), upgrades globaux (4), icône anges, upgrades d'anges (3).
- Mascottes encore disponibles : Festus, Mothman, Red Rocket, Jangles the Moon Monkey,
  Giddyup Buttercup, Mr. Pebbles, Captain Cosmos, Manta Man, The Mechanist, Mister Handy,
  Protectron, One-Eyed Ike / Mad Mulligan / Doc Phosphate (Dry Rock Gulch), bobblehead, l'Atome.

## Images

- Source : Nukapedia (fallout.fandom.com), PNG à fond transparent pour tout ce qui est listé.
  Assets © Bethesda — usage pédagogique, à mentionner dans le README.
- Format cible : PNG carré (256×256), le frontend les affiche en 64 px dans la carte produit.
- Convention de nommage : slugs minuscules, préfixe `manager-` / `upgrade-` / `palier-`.
