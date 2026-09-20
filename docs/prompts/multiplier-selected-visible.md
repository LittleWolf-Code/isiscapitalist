# Prompt — Multiplicateur d'achat : état sélectionné lisible (vidéo inversée + halo, survol, focus)

- Date : 2026-09-19
- Étape roadmap : 9.15 (nouvelle ligne, voir Étapes) — suppose 9.14 (D29) dans le code
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « quand je selectionne *1 *10 *100 ou max
  c'est pas assez visible celui que j'ai choissi »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22 standalone + signals, apollo-orbit,
Angular Material 22.1 avec un thème « écran cathodique » vert monochrome). Tu interviens en
développeur Angular sur le **frontend uniquement**. Réponds en français ; code et commentaires
selon les conventions de `CLAUDE.md` et `frontend/CLAUDE.md`.

### Objectif

Dans la barre du haut, le joueur choisit la quantité d'achat avec un
`mat-button-toggle-group` à quatre boutons **x1 / x10 / x100 / max** (D17). Le bouton
sélectionné est aujourd'hui presque indiscernable des autres : le thème M3 monochrome (D22)
impose `secondary-container: #062211` (fond du toggle sélectionné) sur un fond de page
`#001609` — contraste ≈ 1,2:1 — et la coche Material est masquée
(`hideSingleSelectionIndicator`, sans Material Icons dans le projet). Le joueur ne sait pas
dans quel mode il achète.

Après cette tâche : le toggle sélectionné est en **vidéo inversée** (fond vert phosphore,
texte noir — même langage que le bandeau d'erreur et le bouton Reset), avec un **halo** vert
quand le réglage CRT « halo » est actif ; les toggles non sélectionnés ont une **surbrillance
légère au survol** et un **anneau de focus** visible au clavier. Aucune règle de jeu, aucune
donnée, aucune requête GraphQL ne change. C'est l'étape **9.15** de `docs/ROADMAP.md`,
décision **D30** dans `docs/DECISIONS.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` (section « Conventions » : couleurs via
   tokens, peau dans `styles.css`, mise en page dans les CSS de composants).
2. `docs/DECISIONS.md` — respecter **D17** (multiplicateur, `$event.value` transmis tel
   quel), **D22** (thème : `material-theme.scss` seul fichier avec des couleurs en dur, effets
   CRT conditionnés aux classes `crt-*` de `app-root`), **D26** (style de l'onglet actif :
   `box-shadow: inset 0 0 0 1px var(--mat-sys-primary)` dans `styles.css`, motif à réutiliser
   pour le focus).
3. `frontend/src/material-theme.scss` — bloc `$overrides` (token `secondary-container` et
   son commentaire « Fond des états sélectionnés (toggle du multiplicateur) ») et l'appel
   `mat.progress-bar-overrides(...)` en fin de `html { … }` : c'est le modèle à suivre.
4. `frontend/src/styles.css` — règles `.pip-frame`, `app-root.crt-glow .pip-frame` (halo à
   reproduire), `.mat-mdc-tab-link.mdc-tab--active`.
5. `frontend/src/app/app.html` (lignes 9-21 : le `mat-button-toggle-group.multiplier`),
   `frontend/src/app/app.ts` (`multipliers`, `onMultiplierChange`), `frontend/src/app/app.css`,
   `frontend/src/app/app.spec.ts` (stub `GameService` avec `multiplier: signal(1)`,
   `MATERIAL_ANIMATIONS` désactivées).
6. Tokens disponibles pour le toggle (vérifie dans
   `frontend/node_modules/@angular/material/button-toggle/_m3-button-toggle.scss`) :
   `selected-state-background-color`, `selected-state-text-color`, `state-layer-color`,
   `hover-state-layer-opacity`, `focus-state-layer-opacity`. Le groupe Material a
   `overflow: hidden` et le bouton interne `.mat-button-toggle-button` a `outline: none`
   (voir `fesm2022/button-toggle.mjs`) : deux points qui contraignent la solution ci-dessous.

### Comportement attendu

Côté joueur, dans la barre du haut :

| État du toggle | Avant | Après |
|---|---|---|
| Sélectionné (ex. x10) | fond `#062211`, texte vert, contraste ≈ 1,2:1 avec la page | fond `var(--mat-sys-primary)` (`#1aff80`), texte `var(--mat-sys-on-primary)` (`#001609`), contraste > 15:1 ; sous `app-root.crt-glow`, halo `0 0 0.5rem color-mix(in srgb, var(--mat-sys-primary) 35%, transparent)` (même valeur que `.pip-frame`) |
| Non sélectionné, survol souris | state layer `on-surface` à 8 % (invisible sur noir) | state layer `var(--mat-sys-primary)` à 12 % : légère teinte verte |
| Non sélectionné, focus clavier | state layer à 10 % + pas d'outline | state layer à 24 % **et** anneau `outline: 1px solid currentColor; outline-offset: -2px` sur le bouton interne (vert sur fond noir, noir sur fond vert si le toggle focalisé est aussi le sélectionné) |
| Groupe | contour Material | inchangé (pas de `.pip-frame`) |
| Halo désactivé dans Paramètres | — | aucun halo sur le toggle (comme `.pip-frame`) |

Côté code, trois retouches et rien d'autre :

1. **`frontend/src/material-theme.scss`** — après `mat.progress-bar-overrides(...)`, dans le
   même bloc `html { … }` :
   ```scss
   // Toggle du multiplicateur : sélectionné en vidéo inversée (secondary-container serait
   // invisible sur le fond), survol / focus teintés en vert (D30).
   @include mat.button-toggle-overrides(
     (
       selected-state-background-color: var(--mat-sys-primary),
       selected-state-text-color: var(--mat-sys-on-primary),
       state-layer-color: var(--mat-sys-primary),
       hover-state-layer-opacity: 0.12,
       focus-state-layer-opacity: 0.24,
     )
   );
   ```
   Le token `secondary-container` reste (Material s'en sert pour d'autres composants) ; mets
   à jour son commentaire (« chips sélectionnés Material ; le toggle du multiplicateur est
   traité par `button-toggle-overrides` »).
2. **`frontend/src/styles.css`** — sous la règle `app-root.crt-glow .pip-frame`, deux règles
   globales (le halo est un effet CRT, donc dans la peau, pas dans `app.css`) :
   ```css
   /* Toggle du multiplicateur sélectionné (D30) : halo comme les cadres. Le groupe Material
      est en overflow: hidden (angles arrondis) ; nos angles sont à 0, on libère le halo. */
   .multiplier.mat-button-toggle-group { overflow: visible; }
   app-root.crt-glow .multiplier .mat-button-toggle-checked {
     box-shadow: 0 0 0.5rem color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
   }
   /* Focus clavier : anneau en currentColor (lisible sur fond noir comme sur fond vert) ;
      Material met outline: none sur le bouton interne. */
   .multiplier .mat-button-toggle-button:focus-visible {
     outline: 1px solid currentColor;
     outline-offset: -2px;
   }
   ```
   Si `overflow: visible` fait déborder le halo sur le champ user ou les stats à 360 px de
   large, garde-le mais réduis le rayon ; ne remets pas `hidden` (le halo disparaîtrait).
3. **`frontend/src/app/app.spec.ts`** — un test « le toggle du multiplicateur courant est le
   seul coché, et cliquer un autre met à jour le service » : le stub `multiplier` à `10` →
   après `detectChanges` / `whenStable`, parmi les 4 `mat-button-toggle`, seul celui dont le
   texte est `x10` porte la classe `mat-button-toggle-checked` ; puis clic sur le `button`
   interne du toggle `x100` → `stub.multiplier()` vaut `100` (nombre, pas chaîne — D17).

Exemple : le joueur sélectionne **x100** → le bouton `x100` devient vert plein à texte noir,
les trois autres restent noirs à texte vert ; il passe la souris sur `max` → `max` se teinte
légèrement de vert sans devenir plein ; il presse Tab jusqu'au groupe → le toggle focalisé
montre un liseré 1 px à l'intérieur ; il décoche « halo » dans Paramètres → le bouton `x100`
reste vert plein mais sans rayonnement.

### Cas limites

- **Aucun monde chargé** (user vide ou backend arrêté) : le groupe est affiché quand même
  (il ne dépend pas de `world`), l'état sélectionné doit être visible dès le premier rendu
  (`multiplier` vaut `1` par défaut → `x1` inversé).
- **`prefers-reduced-motion`** : rien à faire, aucune animation ajoutée.
- **Toggle sélectionné + focalisé** : l'anneau `currentColor` est noir sur vert — c'est voulu,
  ne pas forcer `var(--mat-sys-primary)` (il serait invisible).
- **Largeur 360 px** : la barre du haut ne doit pas déborder horizontalement à cause du halo
  (`box-shadow` ne prend pas de place dans le flux ; vérifie quand même qu'aucun `overflow`
  parent n'introduit de barre de défilement).

### Contraintes (et pourquoi)

- **Aucune couleur en dur hors `material-theme.scss`** : les nouvelles règles passent par
  `var(--mat-sys-primary)` / `var(--mat-sys-on-primary)` — sinon le thème cesse d'être la
  seule source de vérité (D22) et un futur changement de palette oublierait ce toggle.
- **Ne pas changer le token global `secondary-container`** pour obtenir l'inversion : il est
  lu par d'autres composants Material (chips sélectionnés, etc.) ; l'override ciblé
  `button-toggle-overrides` n'affecte que les toggles.
- **Ne pas retirer `hideSingleSelectionIndicator`** ni ajouter `mat-icon` / Material Icons : le
  projet n'embarque volontairement que VT323 (D22) ; la coche apparaîtrait comme un carré vide.
- **Ne rien changer à `GameService.multiplier`, `onMultiplierChange`, ni au `[value]` /
  `(change)`** : D17 repose sur la transmission de `$event.value` tel quel (nombre ou `'max'`).
- **Effets CRT dans `styles.css`, conditionnés à `app-root.crt-glow`** : le panneau Paramètres
  promet que « halo » se désactive ; un halo inconditionnel trahirait ce réglage.
- Ne pas modifier `backend/`, `schema.graphql`, `types.ts` / `operations.ts` (générés).

### Hors périmètre

- Pas de bouton cyclique unique « Buy x10 » à la AdCap, pas de mode « next unlock » : le groupe
  de 4 toggles est une décision prise (D17).
- Pas de cadre `.pip-frame` autour du groupe, pas de changement de libellés (`x1`, `x10`,
  `x100`, `max`), pas de déplacement du groupe dans la barre.
- Pas de retouche des autres composants Material (boutons Produire / Acheter, onglets, chips,
  slide-toggles) même si la même logique de contraste pourrait s'y appliquer.
- Pas de nouveau réglage dans Paramètres.

### Étapes

1. Lire les fichiers ci-dessus. Vérifier dans `_m3-button-toggle.scss` que les cinq tokens
   cités existent bien sous ces noms dans la version installée ; s'ils diffèrent, adapter et le
   dire dans le rapport.
2. Éditer `material-theme.scss` (override + commentaire du token `secondary-container`).
3. Éditer `styles.css` (overflow du groupe, halo sous `crt-glow`, anneau de focus).
4. Ajouter le test dans `app.spec.ts`.
5. Vérifier (section suivante) — d'abord les tests, puis la capture.
6. Documentation : dans `docs/ROADMAP.md`, remplacer la ligne « `- [ ] 9.15 … (à compléter …)` »
   par une ligne cochée « 9.15 Multiplicateur : toggle sélectionné en vidéo inversée + halo
   sous `crt-glow`, survol / focus teintés (D30) : … » (résumé des fichiers, même style que
   9.14), puis rajouter la ligne d'attente « 9.16 … (à compléter quand `frontend.pdf` sera
   disponible). ». Ajouter **D30** dans `docs/DECISIONS.md` (Contexte / Décision /
   Conséquences comme D26–D29 : pourquoi `secondary-container` ne suffisait pas, pourquoi
   `button-toggle-overrides` plutôt que le token global, pourquoi `overflow: visible` et
   `currentColor`). Mettre à jour `frontend/CLAUDE.md` (phrase « Depuis 9.15, … » dans
   l'introduction ; ligne `app.ts/.html/.css` du tableau : mention du toggle inversé ; section
   « Stack » : `button-toggle-overrides` à côté de `progress-bar-overrides`) et la ligne
   « État actuel » de `CLAUDE.md` racine (« Depuis 9.15, … »).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning de budget.
- [ ] `cd frontend && npx ng test --watch=false` : tous les tests verts, dont le nouveau test
      d'`app.spec.ts` (le toggle `x10` seul coché ; clic sur `x100` → `multiplier()` = `100`).
- [ ] Lancer la preview `frontend` de `.claude/launch.json` (le backend n'est pas nécessaire :
      le groupe s'affiche sans monde). Dans le navigateur :
  - [ ] `getComputedStyle` du `mat-button-toggle.mat-button-toggle-checked` :
        `background-color` = `rgb(26, 255, 128)` et `color` = `rgb(0, 22, 9)` ; les trois
        autres toggles ont un `background-color` transparent ou égal au fond.
  - [ ] Cliquer `x100` : la classe `mat-button-toggle-checked` passe sur `x100` seul.
  - [ ] Survoler `max` : `.mat-button-toggle-focus-overlay` de ce toggle a une `opacity`
        calculée de `0.12`.
  - [ ] Onglet Paramètres, « halo » désactivé → `box-shadow` calculé du toggle coché = `none` ;
        réactivé → `box-shadow` non `none`.
  - [ ] Fenêtre à 360 px de large : pas de barre de défilement horizontale sur la page.
  - [ ] **Capture d'écran** de la barre du haut avec `x10` sélectionné et le halo actif.

### Rapport attendu

En fin de tâche : fichiers modifiés (avec les valeurs de tokens réellement utilisées), sortie
réelle de `npm run build` et de `ng test` (nombre de tests), capture d'écran, ce qui reste
incertain (ex. rendu du halo à 360 px). Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Indication du mode d'achat | AdVenture Capitalist : un seul bouton cyclique dont le libellé dit le mode (« Buy x10 ») — l'état est toujours lisible | 4 toggles côte à côte (D17), l'état choisi doit être lisible par lui-même | Reprendre l'exigence de lisibilité, pas le bouton cyclique |
| État sélectionné M3 | `secondary-container` / `on-secondary-container` + coche | Thème monochrome : `secondary-container` ≈ fond ; coche masquée (pas d'icônes) | `mat.button-toggle-overrides` avec `selected-state-*` ; token global intact |
| Survol / focus M3 | State layer `on-surface` 8 % / 10 % | Invisible sur noir | `state-layer-color: primary`, opacités 0.12 / 0.24 |
| Focus clavier (WCAG 2.4.7) | Anneau visible, contraste ≥ 3:1 | Material : `outline: none` sur le bouton interne ; onglet actif = inset 1 px (D26) | Anneau `outline` en `currentColor` (lisible sur les deux fonds) |
| Effets conditionnés au réglage | — | `.pip-frame` : halo seulement sous `app-root.crt-glow` (D22) | Identique ; `overflow: visible` sur le groupe car Material rogne le halo |
| Couleurs par tokens | Guide Angular Material : overrides via mixins `*-overrides`, valeurs `var(--mat-sys-*)` | D22, déjà appliqué pour la progress bar | Identique — décision à noter (D30) |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Cause chiffrée (`#062211` sur `#001609`, coche masquée), état final décrit, étape 9.15 / D30. |
| 2 | Instructions séquencées | 2 | 6 étapes numérotées, chaque retouche localisée (fichier + emplacement dans le fichier). |
| 3 | Exemples concrets | 2 | Tableau avant / après par état, extraits SCSS / CSS, scénario joueur x100 → max → Tab → halo off. |
| 4 | Structure | 2 | Sections du gabarit, tokens et contraintes Material isolés dans « À lire » point 6. |
| 5 | Rôle et périmètre | 2 | Frontend seul, hors périmètre explicite (bouton cyclique, cadre, libellés, autres composants). |
| 6 | Critères mesurables | 2 | Valeurs `getComputedStyle` attendues (`rgb(26, 255, 128)`, opacité 0.12, `box-shadow: none`), test nommé, capture. |
| 7 | Pourquoi des contraintes | 2 | Chaque contrainte motivée (token partagé, icônes absentes, D17, réglage halo). |
| 8 | Raisonnement guidé | 1 | Vérification des noms de tokens en étape 1, mais pas de plan préalable demandé (3 fichiers + docs : à la limite du seuil). |
| 9 | Format de sortie | 2 | Fichiers nommés, ROADMAP / DECISIONS / deux CLAUDE.md précisés, rapport avec sorties réelles. |
| 10 | Concision | 1 | Le halo (valeur, condition `crt-glow`) apparaît dans le tableau, le bloc CSS et les contraintes ; redondance acceptée pour la lisibilité mais réelle. |

Historique : v1 16/20 → v2 18/20.
Améliorations retenues : (critère 6) remplacement de « vérifier visuellement » par des valeurs
`getComputedStyle` attendues et un test précis ; (critère 3) ajout du tableau avant / après et
du scénario joueur ; (critère 7) motivation de `overflow: visible`, `currentColor` et du
maintien de `hideSingleSelectionIndicator`. Le critère 8 reste à 1 : imposer un plan pour trois
règles CSS serait de la cérémonie.
