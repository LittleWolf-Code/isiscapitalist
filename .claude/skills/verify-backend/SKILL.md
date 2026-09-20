---
name: verify-backend
description: Vérifie le backend ISIS Capitalist de bout en bout — build, lint, tests, démarrage, génération de graphql.ts, smoke test GraphQL (getWorld + une mutation) et contrôle du fichier userworlds. À lancer après une étape ou avant un commit (/verify-backend).
---

# Vérification complète du backend

Exécuter dans l'ordre, s'arrêter et diagnostiquer au premier échec.

1. **Statique** — dans `backend/` :
   - `npm run build`
   - `npm run lint`
   - `npm test` (ignorer si aucun test n'existe encore, le signaler).
2. **Démarrage** — lancer la preview `backend` (`.claude/launch.json`), attendre
   "Nest application successfully started" dans les logs. Vérifier qu'aucune erreur GraphQL
   (schéma invalide, resolver manquant) n'apparaît.
3. **Génération** — vérifier que `backend/src/graphql.ts` contient `class World`, `class Product`,
   `class Palier`, `enum RatioType`, `abstract class IMutation`.
4. **Static assets** — `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/icones/<une image>`
   doit renvoyer 200 (si la phase 1.4 est faite).
5. **Smoke test GraphQL** avec un utilisateur jetable `__verify` :
   ```bash
   curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"{ getWorld(user: \"__verify\") { name money lastupdate products { id quantite cout } } }"}'
   ```
   puis, si la phase 3 est faite :
   ```bash
   curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"mutation { acheterQtProduit(user: \"__verify\", id: 1, quantite: 1) { id quantite cout } }"}'
   ```
   Attendu : pas de champ `errors`, `quantite` incrémentée, `cout` augmenté.
6. **Persistance** — `backend/userworlds/__verify-world.json` existe et reflète la mutation.
   Le supprimer ensuite (`rm backend/userworlds/__verify-world.json`).
7. **Rapport** — tableau court : étape / OK-KO / détail. Proposer des correctifs pour chaque KO,
   ne pas les appliquer sans accord sauf s'ils sont triviaux (typo, import `.js` manquant).
