# ISIS Capitalist — backend

API GraphQL du jeu *ISIS Capitalist* (idle game type AdVenture Capitalist, TP ISIS).
NestJS 12, GraphQL **schema-first** (Apollo), TypeScript en ESM. Pas de base de données :
le monde de chaque joueur est un fichier JSON dans `userworlds/`.

## Prérequis

- Node.js ≥ 22 (`node --version`), npm.

## Lancement

```bash
npm install          # dépendances
npm run icons        # génère les 14 images unies de démonstration de public/icones/ (déjà versionnées, optionnel)
npm run start:dev    # serveur sur http://localhost:3000, rechargement à chaud
```

- Playground GraphQL : http://localhost:3000/graphql
- Images statiques : http://localhost:3000/icones/nuka-cola.png (`public/icones/`), servies avec
  `Access-Control-Allow-Origin: *` (CORS activé avant les fichiers statiques) : le frontend lit leurs
  pixels dans un canvas pour le rendu « Pip-Boy » (D35). Les images du thème (`world.png`,
  `manager-*.png`, `upgrade-*.png`, images produits, `global.png`, `bobblehead.png`) sont les sources
  couleur 512 × 512 du thème « Nuka Capitalist » (`docs/THEME.md`).
- Mondes des joueurs : `userworlds/<user>-world.json`, créé au premier `getWorld`
  (fichiers ignorés par git). Supprimer le fichier = repartir du monde initial.

Le serveur doit être lancé **depuis `backend/`** (chemins relatifs à `process.cwd()`).

## API

Schéma : `src/schema.graphql` (celui du sujet ; seul écart, `lastupdate: Float!`, D6). `src/graphql.ts` est **généré** au démarrage,
ne pas l'éditer. Toute opération prend un `user` (chaîne libre, encodée pour devenir un nom de fichier, D36), fait d'abord évoluer le monde
depuis `lastupdate` (productions terminées créditées), puis sauvegarde le fichier.
Les erreurs métier arrivent dans `errors[0].message` (en français).

| Opération | Rôle | Exemple |
|---|---|---|
| `getWorld` | Lit (et crée) le monde du joueur | `query { getWorld(user: "lucas") { name money score products { id name cout quantite timeleft managerUnlocked } } }` |
| `acheterQtProduit` | Achète `quantite` exemplaires (coût géométrique), déclenche les unlocks | `mutation { acheterQtProduit(user: "lucas", id: 1, quantite: 1) { id quantite cout } }` |
| `lancerProductionProduit` | Lance une production (`timeleft = vitesse`) | `mutation { lancerProductionProduit(user: "lucas", id: 1) { id timeleft } }` |
| `engagerManager` | Engage un manager (production automatique du produit cible) | `mutation { engagerManager(user: "lucas", name: "Cappy") { name unlocked } }` |
| `acheterCashUpgrade` | Achète un upgrade payé en argent | `mutation { acheterCashUpgrade(user: "lucas", name: "Bottle") { name unlocked } }` |
| `acheterAngelUpgrade` | Achète un upgrade payé en anges actifs | `mutation { acheterAngelUpgrade(user: "lucas", name: "Fortune Finder") { name unlocked } }` |
| `resetWorld` | Reset « prestige » : anges gagnés `150 × √(score / 10¹⁵)` − déjà gagnés, monde initial | `mutation { resetWorld(user: "lucas") { score totalangels activeangels money } }` |

Le monde initial (`src/origworld.ts`, « Nuka Capitalist ») démarre à 0 $ avec un exemplaire de
`Nuka-Cola` : lancer une production puis rappeler `getWorld` après 500 ms pour voir l'argent arriver.

Équilibrage : `node scripts/simulate-balance.mjs [--resets]` (après `npm run build`) joue une partie
avec les règles du moteur et affiche le temps de chaque jalon.

En ligne de commande (bash) :

```bash
curl -s -X POST http://localhost:3000/graphql -H 'Content-Type: application/json' -d '{"query":"{ getWorld(user: \"lucas\") { money } }"}'
```

## Vérification

```bash
npm run lint         # oxlint
npm run build        # compile dans dist/
npm test             # tests unitaires vitest (moteur du jeu : production, unlocks, upgrades, reset)
npm run test:e2e     # test HTTP → Apollo → resolver → fichier, sur un joueur jetable
```

## Organisation

```
src/schema.graphql   schéma fourni      src/origworld.ts     monde initial
src/resolver.ts      query + 6 mutations src/app.service.ts   lecture/écriture des mondes
src/world-engine.ts  règles du jeu (fonctions pures, testées)
public/icones/       images             userworlds/          un JSON par joueur
```

Règles du jeu, architecture, décisions techniques et avancement : voir [`../docs/`](../docs/)
(`GAME-RULES.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, `SPEC-backend.md`).
