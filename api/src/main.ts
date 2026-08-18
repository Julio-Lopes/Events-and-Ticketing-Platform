import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * O front (Next) roda na 3000, entao a API fica na 3001.
   * APP_URL aponta para o front e e a mesma origem liberada aqui:
   * uma variavel so, sem lista de origens espalhada pelo codigo.
   */
  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();