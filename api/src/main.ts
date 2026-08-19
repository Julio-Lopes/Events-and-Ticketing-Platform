import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function isAllowedOrigin(origin: string): boolean {
  const configured = process.env.APP_URL;
  if (configured && origin === configured.replace(/\/$/, '')) return true;
  if (origin === 'http://localhost:3000') return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`Origem nao permitida: ${origin}`));
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();