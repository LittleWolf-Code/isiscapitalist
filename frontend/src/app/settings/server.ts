// Adresse du backend (F-03, F-34) : SEUL endroit qui la définit, pour jouer sur le monde d'un
// autre groupe. Elle sert à l'endpoint GraphQL (graphql.provider.ts : SERVER() + 'graphql', lu à
// chaque opération) et aux images (GameIcon : SERVER() + logo). Terminée par « / » : les `logo`
// du monde sont relatifs (« icones/x.png », ambiguïté A8 du cahier). Signal hors injection pour
// que les composants présentationnels (GameIcon) la lisent sans dépendre de GameService ;
// GameService l'expose sous le nom `server` comme le sujet, et la change (setServer) depuis le
// champ « Adresse du serveur » de Paramètres (D41).
import { isDevMode, signal } from '@angular/core';

// Adresse par défaut : en développement (ng serve, tests) le backend tourne à part sur le port
// 3000 ; le build de production est servi par le même hôte que le backend (Nginx relaie /graphql
// et /icones, D39), d'où l'origine de la page.
export const DEFAULT_SERVER = isDevMode()
  ? 'http://localhost:3000/'
  : `${globalThis.location.origin}/`;

// Adresse choisie dans Paramètres, mémorisée sous cette clé (absente = adresse par défaut).
export const SERVER_STORAGE_KEY = 'isiscapitalist.server';

// Saisie → adresse utilisable : URL http(s) uniquement, origine + chemin terminé par « / »
// (requête et ancre ignorées). Un « graphql » final est retiré (D49) : l'adresse attendue est la
// racine du serveur, mais on colle volontiers celle de l'endpoint ; sinon l'app appellerait
// …/graphql/graphql et chercherait les images sous …/graphql/icones. Toute autre saisie → null.
// Ne lève jamais.
export function normalizeServerUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  const trimmed = url.pathname.replace(/\/graphql\/?$/, '/');
  const path = trimmed.endsWith('/') ? trimmed : trimmed + '/';
  return url.origin + path;
}

// Adresse de départ : celle mémorisée si elle est valide, sinon l'adresse par défaut (valeur
// illisible ou localStorage indisponible compris).
export function readStoredServer(): string {
  try {
    const stored = localStorage.getItem(SERVER_STORAGE_KEY);
    return (stored !== null && normalizeServerUrl(stored)) || DEFAULT_SERVER;
  } catch {
    return DEFAULT_SERVER;
  }
}

export const SERVER = signal(readStoredServer());
