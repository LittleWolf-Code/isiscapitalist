import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // CORS AVANT les fichiers statiques : avec l'adaptateur Express, useStaticAssets enregistre
  // express.static au moment de l'appel, et un middleware posé après ne le voit pas. Sans
  // Access-Control-Allow-Origin sur /icones/*, le canvas du frontend (rendu Pip-Boy des images,
  // D35) serait « tainted » et retomberait sur l'image couleur.
  app.enableCors();
  // Images servies statiquement : http://localhost:3000/icones/<nom>.png
  // process.cwd() plutôt que __dirname (indisponible en ESM, voir docs/DECISIONS.md D2).
  app.useStaticAssets(join(process.cwd(), 'public'));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
