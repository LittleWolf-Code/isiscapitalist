# Règles métier — ISIS Capitalist

Résumé des mécaniques du jeu telles que le backend doit les implémenter. Ce qui est **imposé** par
le sujet est marqué (sujet) ; ce qui est une **interprétation** classique du genre (AdVenture
Capitalist) est marqué (hypothèse) et doit être confirmé/ajusté dans `DECISIONS.md` si l'enseignant
ou le frontend impose autre chose.

## Modèle

- `World` : `money` (argent disponible), `score` (total gagné depuis le début, ne décroît jamais —
  sert au calcul des anges), `totalangels` / `activeangels`, `angelbonus` (% par ange actif, 2 au
  départ), `lastupdate` (timestamp ms de la dernière évolution calculée).
- `Product` : `cout` (prix du **prochain** exemplaire), `croissance` (facteur multiplicatif du prix),
  `revenu` (gain par exemplaire et par production), `vitesse` (durée d'une production en **ms**),
  `quantite`, `timeleft` (ms restant sur la production en cours, 0 = pas de production en cours),
  `managerUnlocked`, `paliers` (unlocks du produit).
- `Palier` : `seuil` (quantité requise pour un unlock ; **prix** pour un manager / upgrade /
  angelupgrade), `idcible` (produit visé : `id` du produit, `0` = tous les produits, `-1` = spécial,
  cf. angelupgrades), `ratio` + `typeratio` (nature du bonus), `unlocked`.

## Temps et unités

- `lastupdate`, `vitesse`, `timeleft` : **millisecondes**. Instant courant = `Date.now()`.
- Le schéma déclare `lastupdate: Int!` ; `Date.now()` dépasse Int32 côté GraphQL → voir
  `DECISIONS.md` (D6).

## Achat de produits — `acheterQtProduit` (sujet)

Avec `q` = quantité achetée, `c` = `product.cout` (prix du prochain), `g` = `croissance` :

- Prix total (hypothèse, suite géométrique) : `total = c * (g^q - 1) / (g - 1)` (si `g == 1` : `c * q`).
- Vérifier `world.money >= total` sinon `throw new Error("Pas assez d'argent")` (hypothèse : le sujet
  ne l'exige pas explicitement mais le frontend s'y attend).
- `world.money -= total`, `product.quantite += q`, `product.cout = c * g^q`.
- Puis vérifier les unlocks (ci-dessous).

## Production

### Revenu d'une production (sujet, p.11)

```
gain = product.quantite * product.revenu * (1 + world.activeangels * world.angelbonus / 100)
```

À chaque production terminée : `world.money += gain` et `world.score += gain`.

### Lancer une production — `lancerProductionProduit` (sujet)
`product.timeleft = product.vitesse`. Ignoré si une production est déjà en cours (`timeleft > 0`,
D12). Aucune condition sur la quantité (D36) : à 0 exemplaire la production ne rapporte rien.

### Évolution temporelle — `updateWorld(world)` (sujet, à concevoir)

Le calcul d'un produit est isolé dans `advanceProduction(product, elapsed)` →
`{ timeleft, produced }`, recopiée à l'identique dans `frontend/src/app/game-math.ts` : le client
fait le même calcul toutes les 100 ms (`calcScore`, D36).

`elapsed = now - world.lastupdate` (si `lastupdate == 0` → premier accès : `elapsed = 0`).

Pour chaque produit :

- **Sans manager** (`managerUnlocked == false`) :
  - si `timeleft == 0` → rien ;
  - sinon si `timeleft <= elapsed` → 1 production terminée : `+gain`, `timeleft = 0` ;
  - sinon `timeleft -= elapsed`.
- **Avec manager** (production en boucle, redémarre automatiquement) :
  - si `timeleft == 0` → considérer que la production démarre : `timeleft = vitesse` ;
  - si `elapsed < timeleft` → `timeleft -= elapsed`, 0 production ;
  - sinon : `n = 1 + floor((elapsed - timeleft) / vitesse)` productions terminées, `+ n * gain`,
    puis `timeleft = vitesse - ((elapsed - timeleft) % vitesse)`.

Enfin `world.lastupdate = now`. **Appeler `updateWorld` au début de chaque query/mutation** avant
toute autre action, puis `saveWorld` à la fin.

Un jeu de tests officiel existe : https://gitlab.com/-/snippets/2522185 (à récupérer à la main et
déposer dans `backend/test/` — voir ROADMAP étape 7).

## Managers — `engagerManager` (sujet)

- Trouver `manager` dans `world.managers` par `name` (sinon erreur), puis `product` par `manager.idcible`.
- Refuser si `manager.unlocked` est déjà `true` (« déjà engagé »).
- Coût : `manager.seuil` en argent (sujet frontend) → vérifier et déduire de `money`. C'est la
  seule condition (la règle D24 « au moins un exemplaire » et la pause D20 ont été retirées, D36).
- `product.managerUnlocked = true`, `manager.unlocked = true`.
- Retourne le `Palier` manager.

## Unlocks (sujet)

- **Unlock produit** : pour chaque `palier` de `product.paliers` non débloqué, si
  `product.quantite >= palier.seuil` → `unlocked = true` + appliquer le bonus au produit `idcible`.
- **Allunlock** : pour chaque palier de `world.allunlocks` non débloqué, si **tous** les produits ont
  `quantite >= palier.seuil` → `unlocked = true` + appliquer le bonus à tous les produits.
- Vérifiés après chaque achat (`acheterQtProduit`). Code dans le service, réutilisé par les upgrades.

## Upgrades (sujet)

- `acheterCashUpgrade(name)` : palier dans `world.upgrades`, coût `seuil` en **argent**
  (vérifier `money >= seuil`, déduire), `unlocked = true`, appliquer le bonus.
- `acheterAngelUpgrade(name)` : palier dans `world.angelupgrades`, coût `seuil` en **anges actifs**
  (vérifier `activeangels >= seuil`, déduire de `activeangels` ; `totalangels` inchangé — hypothèse),
  `unlocked = true`, appliquer le bonus.
- Erreur si le palier n'existe pas ou est déjà débloqué (hypothèse).

## Application d'un bonus (`applyBonus(world, palier)`) — hypothèse standard

Cible : `idcible == 0` → tous les produits ; `idcible > 0` → le produit d'id `idcible` ;
`idcible == -1` → le monde lui-même (anges).

| `typeratio` | Effet |
|---|---|
| `gain`    | `product.revenu *= ratio` |
| `vitesse` | `product.vitesse = max(1, floor(product.vitesse / ratio))` ; une production en cours accélère : `timeleft = min(vitesse, ceil(timeleft / ratio))` (D36) |
| `ange`    | `world.angelbonus += ratio` (bonus % par ange actif augmenté) |

## Reset — `resetWorld` (sujet)

1. Anges gagnés (sujet frontend, RG-09 ; remplace la formule linéaire de D20, D36) :
   `gagnes = floor(150 × √(score / 10¹⁵)) − totalangels` (borné à ≥ 0, total plafonné à
   2 147 483 647 car les anges sont des `Int`). `score` cumule tout l'argent gagné depuis le début
   (jamais remis à zéro), `totalangels` ce qui a déjà été distribué : la différence est ce que la
   partie en cours rapporte. Exemples : 10¹⁵ → 150 ; 4·10¹⁵ avec 100 déjà gagnés → 200 ; premier
   ange vers 4,45·10¹⁰.
2. `totalangels += gagnes`, `activeangels += gagnes`.
3. Nouveau monde = `structuredClone(origworld)` avec `score`, `totalangels`, `activeangels`
   repris ; `money = 0`, `lastupdate = now`.

## Invariants à respecter

- `money >= 0`, `score` monotone croissante, `quantite >= 0`, `timeleft >= 0`.
- `origworld` n'est jamais muté.
- Un palier débloqué ne l'est qu'une fois (pas de double application de bonus).
- Toute opération : `read → updateWorld → action → save`.
