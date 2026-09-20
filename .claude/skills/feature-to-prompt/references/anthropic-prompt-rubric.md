# Grille de notation — standard Anthropic de prompt engineering

Dérivée du guide officiel « Prompt engineering » d'Anthropic (docs.claude.com) et des
bonnes pratiques Claude 4 (« be explicit », « add context to improve performance », « explain why »).
10 critères, chacun noté 0 / 1 / 2. Total sur 20.

Barème générique :
- **0** — absent ou contre-productif ;
- **1** — présent mais vague, incomplet, ou dilué dans le reste ;
- **2** — présent, précis, et placé là où le modèle le trouvera au bon moment.

Noter honnêtement : un prompt à 20/20 dès le premier jet est un signal que la notation est trop
gentille, pas que le prompt est parfait. Le score sert à choisir quoi améliorer, pas à décorer.

| # | Critère | Ce qu'on vérifie | Question à se poser |
|---|---|---|---|
| 1 | **Contexte et objectif** (*be clear and direct*) | Le prompt dit à quoi sert la feature, pour qui, dans quel projet, et ce qui se passe une fois fini. | Un nouveau collègue comprendrait-il pourquoi on fait ça sans poser de question ? |
| 2 | **Instructions explicites et séquencées** | Étapes numérotées, verbes d'action, aucune instruction implicite (« fais ce qu'il faut »). | Peut-on cocher chaque étape une par une ? |
| 3 | **Exemples concrets** (*multishot*) | Au moins un exemple entrée → sortie : requête GraphQL + réponse attendue, avant/après du JSON, calcul chiffré d'une formule. | L'exemple lève-t-il les ambiguïtés de formule / format que le texte laisse ouvertes ? |
| 4 | **Structure lisible** (*XML tags / sections*) | Sections nettement séparées (contexte, contraintes, étapes, critères, vérification) — en Markdown ou balises. Les données longues (schéma, extrait de spec) sont en bloc distinct, en haut. | Peut-on retrouver une contrainte précise en 5 secondes ? |
| 5 | **Rôle et périmètre** (*system prompt / role*) | Le prompt cadre le rôle (dév NestJS/Angular sur ce TP), le sous-projet visé, et surtout ce qui est **hors périmètre**. | Le modèle sait-il ce qu'il ne doit *pas* faire ? |
| 6 | **Critères de succès mesurables** (*define success criteria*) | Chaque critère est vérifiable par une commande, un test ou une observation précise — pas « fonctionne bien ». | Deux personnes pourraient-elles être en désaccord sur « c'est fini » ? Si oui → 1 max. |
| 7 | **Le « pourquoi » des contraintes** (*Claude 4 : explain motivation*) | Les contraintes non évidentes sont motivées (« appeler `updateWorld` avant, sinon… »). Pas de MUST/NEVER en rafale sans raison. | Une contrainte inexpliquée serait-elle contournée par un modèle bien intentionné ? |
| 8 | **Raisonnement guidé** (*let Claude think*) | Le prompt indique où réfléchir avant d'agir : lire tel fichier d'abord, vérifier telle hypothèse, faire un plan si la feature touche > 3 fichiers. | Y a-t-il un moment prévu pour découvrir un problème avant d'avoir tout écrit ? |
| 9 | **Format de sortie et livrables** (*prefill / output format*) | Fichiers à créer/modifier nommés, format du rapport final, ce qu'il faut mettre à jour (`ROADMAP.md`, `DECISIONS.md`). | Sait-on à quoi ressemble le résultat attendu ? |
| 10 | **Concision et absence de contradiction** | Rien d'inutile, pas de répétition, pas deux instructions incompatibles (fréquent après plusieurs tours d'amélioration). | Peut-on retirer une phrase sans perdre d'information ? Si oui, la retirer. |

## Format de restitution de la note

À inclure en tête du fichier `docs/prompts/<slug>.md`, après le prompt lui-même :

```markdown
## Notation (grille Anthropic) — <score>/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | … |
| … | … | … | … |

Historique : v1 <score>/20 → v2 <score>/20 → v3 <score>/20.
Améliorations retenues : …
```

## Pièges fréquents observés à l'étape 4

- **Améliorer le score en allongeant** : ajouter des sections fait souvent monter les critères 2-4
  et baisser le critère 10. Préférer préciser une phrase existante plutôt qu'en ajouter une.
- **Critère 3 satisfait par un exemple faux** : vérifier le calcul de l'exemple chiffré contre
  `docs/GAME-RULES.md` avant de le noter 2. Un exemple faux est pire qu'aucun exemple.
- **Critère 6 confondu avec le critère 9** : « le fichier `resolver.ts` est modifié » est un
  livrable, pas un critère de succès. Le critère de succès est « la mutation renvoie X ».
- **Critère 7 : justifier des évidences** : n'expliquer que ce qui n'est pas évident. Expliquer
  pourquoi il faut compiler dilue les vraies raisons.
