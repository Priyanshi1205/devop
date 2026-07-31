import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use cookie parser
  app.use(cookieParser());

  // Enable CORS
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://seo-ai-os-frontend.onrender.com',
    'https://devopps-a8y.pages.dev',
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Accept,Authorization',
});
  
  // Register Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable Global Validation Pipes (using class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('SEO AI OS API')
    .setDescription('Complete enterprise SaaS API for Technical SEO, GEO, and LLM Visibility audits.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Log loaded Google environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  const first20Chars = clientId ? clientId.substring(0, 20) : '';
  console.log('==================================================');
  console.log('[Google OAuth Startup Config]');
  console.log(`- GOOGLE_CLIENT_ID (First 20 chars): ${first20Chars}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${clientSecret ? 'PRESENT (Masked)' : 'MISSING'}`);
  console.log(`- GOOGLE_REDIRECT_URI: ${redirectUri || 'MISSING'}`);

  if (!clientId || clientId.toLowerCase().startsWith('mock') || clientId.toLowerCase().includes('dummy')) {
    console.error('==================================================');
    console.error('FATAL ERROR: GOOGLE_CLIENT_ID starts with or is a mock value!');
    console.error('Real Google OAuth credentials are required in .env.production.local.');
    console.error('==================================================');
    throw new Error('FATAL: GOOGLE_CLIENT_ID cannot be a mock value. Server startup aborted.');
  }

  console.log(`- OAuth Mode: REAL (Persistent credentials loaded successfully)`);
  console.log('==================================================');

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available on: http://localhost:${port}/docs`);
}
bootstrap();
