import { ApplicationConfig } from '@angular/core';
import { provideGraphQL } from './graphql/graphql.provider';

// Page unique, sans routeur (F-05) : seul Apollo est fourni.
export const appConfig: ApplicationConfig = {
  providers: [provideGraphQL()],
};
