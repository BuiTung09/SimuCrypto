import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { loadBinanceSymbols } from './chat/utils/symbol-extractor';
import { BinanceService } from './binance/binance.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const binanceService = app.get(BinanceService);
  await loadBinanceSymbols(binanceService);
  app.enableCors({
    origin: '*', // For development, allow all. Change this for production.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Server running at http://localhost:${port}`);
}

bootstrap();