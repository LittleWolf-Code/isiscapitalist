---
name: next-step
description: Implémente la prochaine étape non cochée de docs/ROADMAP.md (ISIS Capitalist), la vérifie, puis coche la case. À utiliser pour avancer le projet étape par étape (/next-step, ou /next-step 3.2 pour viser une étape précise).
---

# Implémenter la prochaine étape de la roadmap

## Procédure

1. Lire `docs/ROADMAP.md` et repérer la **première case `[ ]`** (ou l'étape passée en argument,
   ex. `3.2`). Annoncer à l'utilisateur l'étape choisie en une ligne.
2. Relire les sections concernées de `docs/SPEC-backend.md` et `docs/GAME-RULES.md`, et le
   `CLAUDE.md` du sous-projet visé. Vérifier `docs/DECISIONS.md` pour les choix déjà actés
   (ESM `.js`, `process.cwd()`, `structuredClone(origworld)`, formules).
3. Lire les fichiers sources qui seront modifiés **avant** d'écrire.
4. Implémenter **uniquement** cette étape. Ne pas anticiper les suivantes, ne pas refactorer au-delà
   du nécessaire. Respecter les noms exacts du schéma GraphQL.
5. Vérifier :
   - `npm run build` (dans `backend/` ou `frontend/`) sans erreur ;
   - si l'étape touche une query/mutation : lancer la preview `backend` et exécuter la requête
     correspondante (exemples en bas de `docs/ROADMAP.md`) via le playground ou
     `curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"…"}'` ;
   - contrôler le fichier `backend/userworlds/<user>-world.json` si pertinent ;
   - si des tests existent : `npm test`.
6. Si une hypothèse a dû être tranchée (formule, comportement non spécifié), l'ajouter dans
   `docs/DECISIONS.md` (nouvelle entrée Dn) et l'utiliser de façon cohérente.
7. Cocher la case `[x]` dans `docs/ROADMAP.md`.
8. Résumer en 3-5 lignes : ce qui a été fait, comment ça a été vérifié, ce qu'il reste d'incertain.
   Ne pas committer sauf demande.

## Garde-fous

- `backend/src/graphql.ts` est généré : ne jamais l'éditer.
- Ne pas modifier `schema.graphql` sans entrée dans `DECISIONS.md`.
- Ne pas ajouter de dépendance npm sans demander.
- En cas de blocage (spec ambiguë, test fourni introuvable), poser la question plutôt que d'inventer
  silencieusement.
