// Adresse du backend (F-03, F-34) : SEUL endroit à modifier pour jouer sur le monde d'un autre
// groupe. Elle sert à l'endpoint GraphQL (graphql.provider.ts : SERVER() + 'graphql') et aux
// images (GameIcon : SERVER() + logo). Terminée par « / » : les `logo` du monde sont relatifs
// (« icones/x.png », ambiguïté A8 du cahier). Signal hors injection pour que les composants
// présentationnels (GameIcon) la lisent sans dépendre de GameService ; GameService l'expose sous
// le nom `server` comme le sujet.
import { signal } from '@angular/core';

export const SERVER = signal('http://localhost:3000/');
