# Prompt — Recalibrage de la formule des anges : 2 % du score

- Date : 2026-09-19
- Étape roadmap : 7.3 (nouvelle ligne à insérer en phase 7 — Reset, voir Étapes)
- Sous-projet : les deux (règle métier backend + copie d'affichage frontend)
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « j'ai beau avoir un score de 7,86M j'ai pas
  d'ange si je reset »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`).
Réponds en français ; code et commentaires selon les conventions de `CLAUDE.md`,
`backend/CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur du TP côté règles du jeu : tu
touches à une **formule** et à ce qui l'affiche, pas au schéma GraphQL ni à la structure de l'app.

### Objectif

Le joueur `lucas` a un `score` de 8 019 386 et l'onglet Anges lui annonce **0 ange** au reset. Ce
n'est pas un bug : la formule retenue en D7 est celle d'AdVenture Capitalist,
`floor(150 × √(score / 1e15)) − totalangels`, calibrée pour des scores au-delà de 1e15. Avec
l'`origworld` du TP (dernier produit à 622 080 par cycle), le premier ange demande un score ≈ 4,4e10
et le 1000ᵉ (prix d'« Angel Upgrade 3 ») ≈ 4,4e16 : injouable.

L'auteur du projet a tranché : **les anges gagnés valent 2 % du score**, soit **1 ange pour 50 de
score**, linéaire. Il sait que c'est très généreux (voir Contraintes) et l'assume. Cette
correction devient l'étape **7.3** de `docs/ROADMAP.md` et la décision **D20** de
`docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine), `backend/CLAUDE.md`, `frontend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Reset — la règle à réécrire (point 1 de la liste)
3. `docs/DECISIONS.md` — D7 (formules « hypothèse », que D20 amende), D14 (le serveur est seul
   juge), D19 (la formule est **dupliquée** dans le front sous le même nom : les deux copies
   doivent rester identiques)
4. `backend/src/world-engine.ts` — `angelsEarned` (~l. 175) et `resetWorld` (~l. 194) : seule
   `angelsEarned` change, `resetWorld` la consomme déjà
5. `frontend/src/app/game-math.ts` — `angelsEarned` (fin de fichier), copie d'affichage
6. Les tests existants : `backend/src/world-engine.spec.ts` (§« Phase 7 — reset et anges »),
   `backend/test/world.e2e-spec.ts` (test « resetWorld repart du monde initial »),
   `frontend/src/app/game-math.spec.ts` (§`angelsEarned`)
7. `frontend/src/app/side-nav.html` + `side-nav.css` — le badge `matBadge` qui affiche le nombre

### Comportement attendu

Nouvelle formule, **identique** dans `world-engine.ts` et `game-math.ts` :

```
angelsEarned(world) = max(0, floor(world.score / SCORE_PER_ANGEL) − world.totalangels)
avec SCORE_PER_ANGEL = 50   // « 2 % du score »
```

`score` reste le cumul de tout l'argent gagné depuis le tout début (jamais remis à zéro) ;
`totalangels` ce qui a déjà été distribué ; la différence est ce que la partie en cours rapporte.
`resetWorld` ne change pas : `totalangels += gagnés`, `activeangels += gagnés`, clone d'`origworld`,
`money = 0`, `score` conservé.

Exemple 1 (monde réel `lucas`) : `score = 8 019 386`, `totalangels = 0`
→ badge de l'onglet Anges et panneau Reset affichent **160 387** (`floor(8 019 386 / 50)`)
→ `resetWorld` → `totalangels = activeangels = 160 387`, `money = 0`, `score = 8 019 386`
→ multiplicateur de production du nouveau monde = `1 + 160 387 × 2 / 100 = 3 208,74`.

Exemple 2 (anges déjà dépensés) : `score = 12 000`, `totalangels = 100`, `activeangels = 60`
→ gagnés = `240 − 100 = 140` → après reset `totalangels = 240`, `activeangels = 200`.

Exemple 3 (seuils) : `score = 49` → 0 ange ; `score = 50` → 1 ; `score = 99` → 1 ; `score = 100` → 2.

### Cas limites

- `score = 0` (monde neuf) → 0 ange, reset autorisé (comportement inchangé).
- `totalangels` supérieur à `floor(score / 50)` (mondes de test créés avec l'ancienne formule :
  `frank`, `erin`, `test-tabs-*`) → 0, jamais négatif ; ces fichiers ne sont **pas** migrés.
- Second reset immédiat après un premier → 0 ange gagné, `totalangels`/`activeangels` inchangés.
- Aucune erreur GraphQL nouvelle : `resetWorld` ne refuse jamais.

### Contraintes (et pourquoi)

- Écrire `Math.floor(score / SCORE_PER_ANGEL)` avec `SCORE_PER_ANGEL = 50`, pas
  `Math.floor(score * 0.02)` : la division d'un multiple exact de 50 est exacte en IEEE 754, alors
  que `0.02` n'a pas de représentation binaire finie et oblige à raisonner sur l'arrondi de
  chaque produit. La constante est **exportée et commentée** (« 2 % du score ») dans les deux
  fichiers, seul point à changer si l'enseignant impose autre chose (esprit de D7).
- Les deux `angelsEarned` doivent produire le même nombre pour les mêmes entrées : le badge
  (client) et le résultat de `resetWorld` (serveur) sont comparés par le joueur au moment du
  `confirm()` « Vous gagnerez N ange(s) » (D19). Réutilise les mêmes cas chiffrés dans les deux
  specs pour le garantir.
- Le badge `matBadge` de `side-nav.html` doit rester lisible avec 6 chiffres (« 160387 ») : le
  rond Material de 22 px déborde. Ajouter dans `side-nav.css` un style sur `.mat-badge-content`
  (largeur auto, `padding: 0 6px`, `border-radius` en pilule) — pas de changement de la valeur
  affichée, pour que `side-nav.spec.ts` (badge « 15 ») reste vrai.
- Le test e2e « resetWorld repart du monde initial (score trop bas pour gagner des anges) » ne
  prouve plus rien : au-delà de 49 de score il y a toujours des anges. Le rendre discriminant :
  écrire `score = 5000`, `totalangels = activeangels = 0` dans le fichier du user jetable avant la
  mutation (comme le fait déjà le test d'achat avec `money = 1000`), puis attendre
  `totalangels = activeangels = 100`, `money = 0`, `score = 5000`, dans la réponse **et** dans le
  fichier relu.
- Ne pas modifier `backend/src/graphql.ts` (généré au démarrage) ni `schema.graphql` : la
  formule n'expose aucun nouveau champ.
- `origworld.ts` (dont `angelbonus = 2` et les `seuil` 10 / 100 / 1000 des angelupgrades) reste
  tel quel : le rééquilibrage éventuel est une décision séparée.

### Hors périmètre

- Pas d'affichage « prochain ange à … » ni de nouvelle info dans `AngelsPanel`.
- Pas de migration ni de suppression des fichiers `backend/userworlds/*.json` : le score étant
  conservé, le prochain reset applique la nouvelle formule de lui-même.
- Pas de refonte de `formatNumber` pour les très grands nombres (plafonné à « T »), même si le
  nouveau rythme les rend plus probables : à noter dans D20, pas à corriger ici.
- Pas de commit.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche 8 fichiers : écris un plan en 5 lignes
   (fichiers, valeurs de test choisies) et montre-le avant de coder.
2. `backend/src/world-engine.ts` : constante `SCORE_PER_ANGEL`, nouvelle `angelsEarned`, mise à
   jour du commentaire (référence D20, seuil « < 50 → 0 ange »).
3. `backend/src/world-engine.spec.ts` §Phase 7 : réécrire les `it` d'`angelsEarned` et de
   `resetWorld` avec les exemples 1 à 3 et les cas limites (garder la fonction `playedWorld`).
4. `backend/test/world.e2e-spec.ts` : rendre le test reset discriminant (voir Contraintes).
5. `frontend/src/app/game-math.ts` + `game-math.spec.ts` : même constante, même formule, mêmes
   cas chiffrés ; mettre à jour le commentaire.
6. `frontend/src/app/side-nav.css` : badge en pilule.
7. Docs : `docs/GAME-RULES.md` §Reset point 1 ; `docs/DECISIONS.md` nouvelle entrée **D20**
   (contexte : formule AdCap injouable avec l'`origworld` du TP ; décision : 2 % linéaire, choix
   assumé de l'auteur ; conséquences : boucle prestige très rapide — ×3 208 dès le premier reset
   de `lucas` —, angelupgrades achetés immédiatement, grands nombres au-delà de « T » ; D7 amendé
   par renvoi) ; `docs/ROADMAP.md` : ligne `- [x] 7.3 Formule des anges recalibrée à 2 % du score
   (D20) : world-engine.ts + game-math.ts, e2e reset discriminant.` après 7.2.
8. Vérifier (section suivante), puis rapport.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test && npm run test:e2e` : tout vert,
  et `world-engine.spec.ts` contient un `it` dont l'attendu est `160387`.
- [ ] `cd frontend && npm test && npm run build` : tout vert (le warning de
  budget `initial` existant est toléré).
- [ ] Smoke test playground sur un user jetable (backend démarré via la config `backend` de
  `.claude/launch.json`) :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"query { getWorld(user: \"angeltest\") { score totalangels } }"}'
  ```
  puis fixer le score dans le fichier :
  ```bash
  node -e "const f='backend/userworlds/angeltest-world.json';const fs=require('fs');const w=JSON.parse(fs.readFileSync(f,'utf8'));w.score=8019386;fs.writeFileSync(f,JSON.stringify(w))"
  ```
  puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"mutation { resetWorld(user: \"angeltest\") { score totalangels activeangels money } }"}'
  ```
  Réponse attendue : `{"data":{"resetWorld":{"score":8019386,"totalangels":160387,"activeangels":160387,"money":0}}}`
  (pas de champ `errors`). Un second appel identique renvoie les mêmes anges.
- [ ] `backend/userworlds/angeltest-world.json` contient `"totalangels":160387` ; supprimer ce
  fichier à la fin.
- [ ] Frontend lancé (config `frontend`), user `lucas` : le badge de l'onglet Anges affiche
  `160387` sans déborder de sa pilule (capture d'écran), et le panneau Reset « Anges gagnables :
  160387 ». **Ne pas cliquer Reset sur `lucas`** : c'est le monde réel de l'auteur.

### Rapport attendu

En fin de tâche : fichiers modifiés, commandes lancées avec leurs résultats réels (nombre de tests,
sortie du curl), capture du badge, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Connaissances du modèle, sans recherche web (la formule était déjà tranchée par l'auteur).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Courbe des anges | AdVenture Capitalist `150·√(gains/1e15)`, Cookie Clicker prestige `∛(cookies/1e12)` : sous-linéaire pour freiner la boucle prestige | **Diverge** : linéaire 2 % (choix assumé, jeu de TP) | D20 avec conséquences |
| Comptabilité cumulative | AdCap : gagnés = mérités − déjà réclamés | identique (`− totalangels`, borné 0) | reprendre |
| Constante en un seul point | Cookie Clicker : constantes de `Game.js` ; D7 | `SCORE_PER_ANGEL` dans les 2 fichiers (D19) | reprendre |
| Arithmétique flottante | Diviser par un entier plutôt que multiplier par `0.02` | `floor(score / 50)` | reprendre, expliqué |
| Estimation client / vérité serveur | AdCap affiche « anges à réclamer » côté client, serveur juge | identique (D14/D19) | rien |
| Gros nombres dans l'UI | AdCap abrège les compteurs | badge `matBadge` brut à 6 chiffres | pilule CSS, dans le périmètre |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Diagnostic (pas un bug, calibrage), chiffres du seuil actuel, décision de l'auteur et son caractère assumé. |
| 2 | Instructions séquencées | 2 | 8 étapes, un fichier ou un groupe par étape, texte exact de la ligne roadmap. |
| 3 | Exemples concrets | 2 | 3 exemples chiffrés vérifiés (`160387`, `140`, seuils 49/50/99/100) + réponse JSON exacte du curl. |
| 4 | Structure lisible | 2 | Sections du gabarit, formule en bloc isolé, cas limites séparés des contraintes. |
| 5 | Rôle et périmètre | 2 | Rôle « formule + affichage », hors périmètre explicite (migration, prochain ange, formatNumber, origworld). |
| 6 | Critères mesurables | 2 | Commandes exactes, réponse attendue octet par octet, valeur attendue dans le fichier, capture du badge. |
| 7 | Pourquoi des contraintes | 2 | `/50` vs `×0.02`, e2e non discriminant, duplication D19, badge qui déborde, ne pas reset `lucas`. |
| 8 | Raisonnement guidé | 1 | Plan demandé avant de coder, mais aucune hypothèse à vérifier n'est laissée ouverte (la feature est petite ; peu à découvrir). |
| 9 | Format de sortie et livrables | 2 | Fichiers nommés, contenu de D20 dicté, ligne roadmap, format du rapport. |
| 10 | Concision, non-contradiction | 1 | La contrainte sur l'e2e est longue et frôle la redondance avec l'étape 4 ; acceptable pour un prompt sans autre ambiguïté. |

Historique : v1 16/20 → v2 18/20.
Améliorations retenues : v1 demandait « rendre le test e2e pertinent » sans dire comment (critère 6
à 1) → valeurs `score = 5000 → 100 anges` et vérification fichier + réponse ; v1 laissait le
badge à 6 chiffres sans consigne (critère 5 à 1 : périmètre flou entre « formule seule » et
« UI ») → pilule CSS bornée, valeur affichée inchangée, spec inchangée. Le critère 8 reste à 1
volontairement : ajouter une « hypothèse à vérifier » artificielle allongerait le prompt (critère 10)
pour une feature de 2 fonctions.
