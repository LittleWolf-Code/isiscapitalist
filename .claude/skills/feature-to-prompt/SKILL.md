---
name: feature-to-prompt
description: Transforme une idée de fonctionnalité ISIS Capitalist en prompt d'implémentation prêt à l'emploi, en 4 étapes — (1) questions à l'utilisateur pour enrichir la demande, (2) comparaison avec les standards des jeux idle et des projets NestJS/Angular open source, (3) rédaction du prompt, (4) notation selon le guide de prompt engineering d'Anthropic puis amélioration jusqu'à un score satisfaisant. À utiliser dès que l'utilisateur décrit une feature, une mécanique de jeu, un écran ou une évolution à ajouter et veut un prompt (ou une spec) plutôt qu'une implémentation immédiate (/feature-to-prompt <feature>). Déclencher aussi quand il dit « écris-moi un prompt pour… », « prépare la spec de… », « comment je demanderais à Claude de faire… ».
---

# Feature → prompt d'implémentation

Objectif : partir d'une phrase vague (« ajouter les anges », « un écran de classement », « le bouton
acheter x10 ») et produire un prompt complet, sauvegardé dans `docs/prompts/<slug>.md`, qu'on peut
coller tel quel dans une nouvelle session Claude Code pour implémenter la feature sans surprise.

Le prompt final vaut ce que valent les informations récoltées : la moitié du travail est dans
l'étape 1 (questions) et l'étape 2 (standards). Ne pas les bâcler pour arriver vite à la rédaction.

Langue : tout en français (questions, prompt, rapport), sauf identifiants de code.

## Avant de commencer

Lire rapidement pour connaître l'état du projet et éviter de poser des questions dont la réponse est
déjà écrite :

- `CLAUDE.md` (racine) et le `CLAUDE.md` du sous-projet concerné (`backend/` ou `frontend/`) ;
- `docs/GAME-RULES.md` et `docs/SPEC-backend.md` si la feature touche une règle du jeu ;
- `docs/ROADMAP.md` pour situer la feature (déjà planifiée ? à quelle phase ? dépend d'étapes non
  cochées ?) ;
- `docs/DECISIONS.md` pour ne pas re-demander ce qui est déjà tranché ;
- `docs/prompts/` pour réutiliser la structure d'un prompt précédent s'il en existe.

Si la feature correspond à une étape de la roadmap, le prompt doit la citer (ex. « étape 4.1 »)
pour que la case puisse être cochée à la fin.

## Étape 1 — Enrichir la demande (questions à l'utilisateur)

Utiliser `AskUserQuestion` (2 tours maximum, 3-4 questions par tour). Le but n'est pas d'être
exhaustif mais d'éliminer les ambiguïtés qui feraient diverger deux implémentations raisonnables.
Ne poser que des questions dont on ne connaît pas la réponse après les lectures ci-dessus, et
proposer à chaque fois des options concrètes (avec l'option recommandée en premier) plutôt que des
questions ouvertes.

Thèmes à couvrir, dans cet ordre de priorité :

1. **Périmètre** : backend seul, frontend seul, les deux ? Nouvelle query/mutation GraphQL ou
   modification d'une existante ? (Rappel : le schéma est imposé par le sujet — toute modification
   est une décision à noter dans `DECISIONS.md`.)
2. **Comportement observable** : que voit/fait l'utilisateur ? Qu'est-ce qui change dans le monde
   JSON ? Exemple chiffré si la feature contient une formule (« avec 3 anges et un bonus de 2 %, le
   gain passe de 100 à 106 »).
3. **Cas limites** : argent insuffisant, produit/manager introuvable, feature déjà achetée, monde
   jamais sauvegardé (`lastupdate == 0`), reset.
4. **Critères d'acceptation** : comment on saura que c'est fini (requête playground attendue, test
   unitaire, fichier `userworlds/` attendu, capture d'écran).
5. **Hors périmètre** : ce qu'il ne faut surtout pas toucher (souvent la réponse la plus utile).
6. **Contraintes** : dépendance à une étape non cochée, deadline TP, niveau de finition (prototype
   vs. rendu final).

Après les réponses, reformuler la feature en 5-8 lignes (« Voici ce que j'ai compris… ») et
demander confirmation avant l'étape 2. C'est le moment où l'utilisateur corrige à moindre coût.

## Étape 2 — Comparer aux standards open source

But : repérer ce que le projet a intérêt à reprendre des implémentations existantes (et ce qu'il
doit consciemment faire différemment). Deux axes :

**a) Mécanique de jeu** — comment les jeux idle/clicker de référence traitent cette feature :
AdVenture Capitalist (le modèle du TP), Cookie Clicker (source ouverte), les clones open source
type `idle-game`/`incremental-game` sur GitHub. Chercher : formule utilisée, feedback visuel,
persistance, protection contre la triche/la dérive temporelle.

**b) Convention technique** — comment NestJS (schema-first GraphQL), Angular (standalone,
signals) et les guides de style associés recommandent de structurer ce type de code : où mettre
la logique, comment remonter une erreur GraphQL, comment nommer, comment tester.

Méthode : si `WebSearch`/`WebFetch` sont disponibles, faire 2-4 recherches ciblées (pas plus,
c'est une aide à la décision, pas une revue de littérature). Sinon s'appuyer sur les connaissances
du modèle en le disant explicitement. Dans tous les cas, **`docs/GAME-RULES.md` et le sujet du TP
priment sur tout standard externe** : le but est de s'aligner sur le standard là où le sujet est
silencieux, jamais de contredire le sujet.

Produire un court tableau (5-8 lignes max) :

| Point | Standard observé | Ce que fait / fera le projet | Action |
|---|---|---|---|
| … | … | identique / diverge (pourquoi) | reprendre / ignorer / décision à noter |

Les lignes « décision à noter » deviennent des instructions du prompt (« ajouter une entrée Dn
dans `DECISIONS.md` expliquant… »). Si le tableau révèle une question nouvelle, la poser
maintenant (un seul tour supplémentaire), pas après la rédaction.

## Étape 3 — Rédiger le prompt

Suivre le gabarit de `references/prompt-template.md` (le lire avant d'écrire). Le prompt est
destiné à une session Claude Code **vierge** qui n'a pas ce contexte : tout ce qui a été appris
aux étapes 1 et 2 et qui influence l'implémentation doit y figurer, mais rien de plus (un prompt
trop long dilue les contraintes importantes).

Principes qui comptent le plus pour ce projet :

- Lister les fichiers à lire d'abord (chemins exacts) et ceux à ne pas toucher (`graphql.ts`).
- Donner les critères d'acceptation sous forme vérifiable (requête curl + réponse attendue,
  test à faire passer), pas sous forme d'adjectifs.
- Inclure l'exemple chiffré de l'étape 1 : c'est ce qui lève 90 % des ambiguïtés de formule.
- Expliquer le *pourquoi* des contraintes non évidentes (ex. « appeler `updateWorld` avant la
  mutation, sinon le gain calculé ignore le temps écoulé depuis `lastupdate` »).
- Terminer par la procédure de vérification et le rappel de cocher la roadmap.

Écrire le fichier dans `docs/prompts/<slug>.md` (slug en kebab-case, ex. `angel-upgrades.md`),
avec en tête un bloc de métadonnées (date, étape roadmap, score — rempli à l'étape 4).

## Étape 4 — Noter puis améliorer

Lire `references/anthropic-prompt-rubric.md` et noter le prompt critère par critère, **avec une
justification d'une ligne par critère** (une note sans justification ne permet pas d'améliorer).
Score sur 20.

Puis boucle d'amélioration :

1. Prendre les 2-3 critères les moins bien notés et réécrire les passages concernés. Ne pas
   toucher au reste (chaque réécriture globale risque de casser ce qui marchait).
2. Re-noter. Continuer tant que le score progresse et reste < 17/20, avec **3 tours maximum** —
   au-delà, les gains sont cosmétiques et il vaut mieux montrer le résultat.
3. Si un critère reste bas parce qu'il manque une information (pas une formulation), poser la
   question à l'utilisateur plutôt que d'inventer.

Mettre à jour le bloc de métadonnées du fichier avec le score final et la grille de notation
(version courte, un tableau critère → note → remarque). Garder le prompt et la grille dans le
même fichier : la grille explique les choix de rédaction à qui relira le prompt plus tard.

## Rapport final à l'utilisateur

En 6-10 lignes :

- chemin du fichier produit ;
- score initial → score final, et les 2-3 améliorations qui ont le plus compté ;
- les décisions prises aux étapes 1-2 qu'il doit connaître (surtout les divergences avec le
  standard) ;
- ce qui reste incertain, s'il y a lieu ;
- la commande pour enchaîner : ouvrir une nouvelle session et coller le prompt, ou
  `/next-step X.Y` si la feature correspond à une étape.

Ne pas implémenter la feature : ce skill produit un prompt, pas du code. Si l'utilisateur veut
enchaîner tout de suite, le lui proposer explicitement plutôt que de le faire d'office.
