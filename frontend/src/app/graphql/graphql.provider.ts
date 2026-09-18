import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { InMemoryCache, provideApollo, withApolloOptions } from '@apollo-orbit/angular';
import { HttpLink } from '@apollo/client/link/http';

export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideApollo(
      withApolloOptions({
        cache: new InMemoryCache(),
        link: new HttpLink({ uri: 'http://localhost:3000/graphql' }),
      })
    )
  ]);
}