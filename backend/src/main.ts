import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // Images servies statiquement : http://localhost:3000/icones/<nom>.png
  // process.cwd() plutôt que __dirname (indisponible en ESM, voir docs/DECISIONS.md D2).
  app.useStaticAssets(join(process.cwd(), 'public'));
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
