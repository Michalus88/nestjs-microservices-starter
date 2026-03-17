import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ReservationsService } from './application/reservations.service';
import { ReservationsController } from './presentation/reservations.controller';
import {
  DatabaseModule,
  LoggerModule,
  AUTH_SERVICE,
  PAYMENTS_SERVICE,
  GrpcModule,
  HealthModule,
} from '@app/common';
import { ReservationsRepository } from './infrastructure/repositories/reservations.repository';
import { ReservationSagasService } from './application/sagas';
import {
  ReservationDocument,
  ReservationSchema,
} from './domain/models/reservation.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: ReservationDocument.name, schema: ReservationSchema },
    ]),
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        PORT: Joi.number().required(),
        AUTH_GRPC_URL: Joi.string().required(),
        PAYMENTS_GRPC_URL: Joi.string().required(),
      }),
    }),
    GrpcModule.register(AUTH_SERVICE),
    GrpcModule.register(PAYMENTS_SERVICE),
    HealthModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository, ReservationSagasService],
})
export class ReservationsModule {}
