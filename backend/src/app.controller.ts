import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  // La racine redirige vers le playground GraphQL (Apollo Sandbox).
  @Get()
  @Redirect('/graphql', 302)
  root() {}
}
