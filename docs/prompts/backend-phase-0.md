# Prompt — Phase 0 : nettoyage du starter

- Date : 2026-09-19
- Étape roadmap : 0.1, 0.2, 0.3
- Sous-projet : backend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt (série `backend-00-index.md`)

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22, hors périmètre ici). Réponds en français ;
code et commentaires selon les conventions de `CLAUDE.md`.

Ce prompt est la **phase 0 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Aucune phase
précédente n'est requise.

### Objectif

Le backend contient encore un exercice précédent (« patients / symptômes ») qui doit disparaître
avant d'écrire le jeu, pour que le schéma GraphQL ne contienne que le domaine ISIS Capitalist.
Cette phase correspond aux étapes 0.1, 0.2 et 0.3 de `docs/ROADMAP.md`. À la fin, le backend
compile, démarre, ne parle plus de patients, et les dossiers de données du jeu existent.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/DECISIONS.md` — D1 (ESM, suffixe `.js`), D4 (patients supprimés), D5 (ObserveModule), D9 (`userworlds`)
3. `backend/src/schema.graphql`, `backend/src/resolver.ts`, `backend/src/app.service.ts`,
   `backend/src/app.module.ts`, `backend/src/patients.json`, `backend/.gitignore`

### Comportement attendu

- `backend/src/patients.json` supprimé.
- `backend/src/schema.graphql` ne contient plus `Patient`, `Symptome`, `getPatients`, `getPatient`.
  GraphQL exige un type `Query` non vide : laisser temporairement
  `type Query { ping: String! }` avec un resolver `@Query() ping() { return 'pong'; }` dans
  `GraphQlResolver` (la phase 1 remplacera tout le schéma).
- `AppService` ne contient plus `readPatients` / `getPatient` ; `getHello` reste (utilisé par
  `AppController`, conservé). L'import `path/win32` devient `import * as path from 'path'` et
  `import fs from 'fs'` devient `import * as fs from 'fs'`.
- `resolver.ts` : `@Resolver('World')`, constructeur `private service: AppService`, seule
  méthode `ping`.
- `ObserveModule` et `AppController` sont **conservés tels quels** (décision utilisateur) :
  `app.module.ts` et `main.ts` ne changent pas dans cette phase.
- `backend/userworlds/.gitkeep` et `backend/public/icones/.gitkeep` créés ; `backend/.gitignore`
  contient déjà `/userworlds/*.json` (vérifier, ne pas dupliquer).
- `docs/DECISIONS.md` : D5 passe de *(à confirmer)* à **tranché : conserver ObserveModule et
  AppController** (raison : choix de l'utilisateur, aucun impact sur le sujet).

### Cas limites

- `src/graphql.ts` est régénéré au démarrage à partir du schéma : ne pas le modifier à la main,
  mais s'attendre à ce qu'il change (les classes `Patient`/`Symptome` disparaissent).
- Si `npm run build` échoue sur l'import `{ Patient } from './graphql.js'` dans
  `app.service.ts` (type disparu), retirer cet import.

### Contraintes (et pourquoi)

- Imports relatifs avec suffixe `.js` — le backend est en ESM (D1), sinon erreur au runtime.
- Ne pas modifier `backend/src/graphql.ts` (généré au démarrage).
- Ne pas supprimer `app.controller.ts`, `app.controller.spec.ts`, `test/app.e2e-spec.ts` ni
  `@nestjs/observe` — l'utilisateur a choisi de garder le starter intact.
- Ne pas ajouter de dépendance npm.

### Hors périmètre

- Le schéma ISIS Capitalist, `origworld.ts`, `main.ts` (`useStaticAssets`) : phase 1.
- Le frontend (il contient aussi l'exercice patients ; on n'y touche pas).

### Étapes

1. Lire les fichiers ci-dessus.
2. Supprimer `patients.json`, purger le schéma, le service et le resolver comme décrit.
3. Créer les deux `.gitkeep`, vérifier `.gitignore`.
4. Mettre à jour D5 dans `docs/DECISIONS.md`.
5. Vérifier (section suivante).
6. Cocher 0.1, 0.2, 0.3 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build` et `npm run lint` sans erreur.
- [ ] `grep -ri patient backend/src backend/test` ne renvoie rien.
- [ ] Lancer la preview `backend` (`.claude/launch.json`) puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"{ ping }"}'
  ```
  Réponse attendue : `{"data":{"ping":"pong"}}`.
- [ ] `curl -s http://localhost:3000/` renvoie `Hello World!` (AppController conservé).
- [ ] `backend/userworlds/.gitkeep` et `backend/public/icones/.gitkeep` existent.
- [ ] `npm test` (vitest) passe (`app.controller.spec.ts` toujours vert).

### Rapport attendu

En fin de tâche : fichiers supprimés/modifiés, commandes de vérification exécutées avec leur
sortie réelle, ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi nettoyer, quel état final |
| 2 | Instructions séquencées | 2 | 6 étapes cochables |
| 3 | Exemples concrets | 1 | Pas d'exemple entrée→sortie hormis `ping` ; peu pertinent pour du nettoyage |
| 4 | Structure lisible | 2 | Sections du gabarit |
| 5 | Rôle et périmètre | 2 | Hors périmètre explicite (frontend, phase 1) |
| 6 | Critères mesurables | 2 | grep, curl, build, test |
| 7 | Pourquoi des contraintes | 2 | ESM, starter conservé, Query non vide |
| 8 | Raisonnement guidé | 1 | Lecture préalable, mais pas de point de plan (feature simple) |
| 9 | Format de sortie | 2 | Fichiers, DECISIONS, ROADMAP, rapport |
| 10 | Concision | 2 | — |

Historique : v1 16/20 → v2 18/20 (ajout du `ping` temporaire — sans lui le serveur ne démarre
pas avec un schéma sans `Query` — et du cas limite sur l'import `./graphql.js`).
