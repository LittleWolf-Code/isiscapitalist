import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { InMemoryCache, provideApollo, withApolloOptions } from '@apollo-orbit/angular';
import { HttpLink } from '@apollo/client/link/http';
import { SERVER } from '../server';

// Endpoint GraphQL dérivé de l'adresse du serveur (server.ts, F-34) : changer de monde ne demande
// qu'une modification. `uri` est une fonction, évaluée à chaque opération : une adresse changée
// dans Paramètres (D41) vaut dès la requête suivante, sans recharger la page.
export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideApollo(
      withApolloOptions({
        cache: new InMemoryCache(),
        link: new HttpLink({ uri: () => SERVER() + 'graphql' }),
      })
    )
  ]);
}
