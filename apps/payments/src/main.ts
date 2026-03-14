import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PAYMENTS_SERVICE, getGrpcServerOptions } from '@app/common';
import { Logger } from 'nestjs-pino';
import { PaymentsModule } from './payments.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice(
    getGrpcServerOptions(PAYMENTS_SERVICE, configService.getOrThrow('GRPC_URL')),
  );
  app.useLogger(app.get(Logger));
  await app.startAllMicroservices();
}
bootstrap();
