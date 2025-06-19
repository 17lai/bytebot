import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';

// Polyfill for crypto global (required by @nestjs/schedule)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function bootstrap() {
  console.log('Starting bytebot-agent application...');

  try {
    const app = await NestFactory.create(AppModule);

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:9992', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    await app.listen(process.env.PORT ?? 9991);
  } catch (error) {
    console.error('Error starting application:', error);
  }
}
bootstrap();
