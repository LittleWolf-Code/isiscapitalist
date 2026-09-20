# Gabarit du prompt d'implémentation

Fichier cible : `docs/prompts/<slug>.md`. Le bloc « Prompt » est ce que l'utilisateur copiera
dans une session Claude Code vierge ; tout ce qui est au-dessus ou en dessous est de la
documentation pour le projet, pas pour le modèle qui implémentera.

Adapter les sections au besoin (une feature purement frontend n'a pas de « requête GraphQL
attendue » mais aura une « capture / comportement attendu à l'écran »). Supprimer les sections
vides plutôt que d'y écrire « N/A ».

````markdown
# Prompt — <Nom de la feature>

- Date : <AAAA-MM-JJ>
- Étape roadmap : <X.Y ou « hors roadmap »>
- Sous-projet : backend / frontend / les deux
- Score (grille Anthropic) : <n>/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « <phrase de l'utilisateur> »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22 standalone + signals, apollo-orbit).
Réponds en français ; code et commentaires selon les conventions du `CLAUDE.md`.

### Objectif

<2-4 phrases : ce que la feature apporte au joueur, ce qui existe déjà, ce qui manque.
Si étape roadmap : « Cette feature correspond à l'étape X.Y de docs/ROADMAP.md. »>

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `<backend|frontend>/CLAUDE.md`
2. `docs/GAME-RULES.md` § <section> — <pourquoi cette section compte ici>
3. `docs/DECISIONS.md` — respecter <Dn, Dm>
4. <fichiers sources concernés, chemins exacts>

### Comportement attendu

<Description précise, côté joueur et côté données. Inclure l'exemple chiffré :>

Exemple : <état initial> → <action> → <état final>, parce que <formule / règle>.

### Cas limites

- <cas> → <comportement attendu, message d'erreur exact si GraphQL>
- …

### Contraintes (et pourquoi)

- <contrainte> — <raison en une ligne>
- Ne pas modifier `backend/src/graphql.ts` (généré au démarrage).
- <si le schéma doit changer : « Modifier `schema.graphql` uniquement pour …, et ajouter une
  entrée Dn dans docs/DECISIONS.md »>

### Hors périmètre

- <ce qu'il ne faut pas faire, même si ça semble logique>

### Étapes

1. Lire les fichiers ci-dessus ; si la feature touche plus de 3 fichiers, écrire un plan en
   5 lignes avant de coder et le montrer.
2. <étape>
3. <étape>
4. Vérifier (section suivante).
5. Cocher l'étape X.Y dans `docs/ROADMAP.md` ; ajouter les décisions dans `DECISIONS.md`.

### Vérification — critères de succès

- [ ] `npm run build` (et `npm run lint`) sans erreur dans `<sous-projet>/`
- [ ] <requête> :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"<…>"}'
  ```
  Réponse attendue : `<extrait JSON>` (pas de champ `errors`).
- [ ] `backend/userworlds/<user>-world.json` contient <…>
- [ ] <test unitaire / comportement à l'écran>

### Rapport attendu

En fin de tâche : ce qui a été fait (fichiers), comment ça a été vérifié (commandes et
résultats réels), ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| … | … | … | … |

## Notation (grille Anthropic) — <n>/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| … | … | … | … |

Historique : v1 <n>/20 → v2 <n>/20.
````
