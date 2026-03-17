import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  PAYMENTS_SERVICE,
  PAYMENTS_SERVICE_NAME,
  PaymentsServiceClient,
  ReservationStatus,
  runSaga,
  SagaStep,
  UserDto,
} from '@app/common';
import { CreateReservationDto } from '../../presentation/dto/create-reservation.dto';
import { ReservationsRepository } from '../../infrastructure/repositories/reservations.repository';
import { ClientGrpc } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';

interface CreateReservationSagaContext {
  // input
  dto: CreateReservationDto;
  email: string;
  userId: string;
  // output (populated by steps)
  reservationId?: Types.ObjectId;
  invoiceId?: string;
}

@Injectable()
export class ReservationSagasService implements OnModuleInit {
  private readonly logger = new Logger(ReservationSagasService.name);
  private paymentsService: PaymentsServiceClient;

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    @Inject(PAYMENTS_SERVICE) private readonly paymentsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.paymentsService =
      this.paymentsClient.getService<PaymentsServiceClient>(
        PAYMENTS_SERVICE_NAME,
      );
  }

  async createWithPayment(
    createReservationDto: CreateReservationDto,
    { email, _id: userId }: UserDto,
  ) {
    const context: CreateReservationSagaContext = {
      dto: createReservationDto,
      email,
      userId,
    };

    await runSaga(this.getCreateSteps(), context, this.logger);

    return this.reservationsRepository.findOne({ _id: context.reservationId });
  }

  private getCreateSteps(): SagaStep<CreateReservationSagaContext>[] {
    return [
      {
        name: 'create_reservation',
        execute: async (ctx) => {
          const reservation = await this.reservationsRepository.create({
            ...ctx.dto,
            timestamp: new Date(),
            userId: ctx.userId,
            status: ReservationStatus.PENDING,
          });
          ctx.reservationId = reservation._id;
        },
        compensate: async (ctx) => {
          await this.reservationsRepository.findOneAndDelete({
            _id: ctx.reservationId,
          });
        },
      },
      {
        name: 'charge_payment',
        execute: async (ctx) => {
          const { id } = await lastValueFrom(
            this.paymentsService.createCharge({
              ...ctx.dto.charge,
              email: ctx.email,
            }),
          );
          ctx.invoiceId = id;
        },
        compensate: async (ctx) => {
          await lastValueFrom(
            this.paymentsService.refundCharge({
              paymentIntentId: ctx.invoiceId,
            }),
          );
        },
      },
      {
        name: 'confirm_reservation',
        execute: async (ctx) => {
          await this.reservationsRepository.findOneAndUpdate(
            { _id: ctx.reservationId },
            {
              $set: {
                status: ReservationStatus.CONFIRMED,
                invoiceId: ctx.invoiceId,
              },
            },
          );
        },
      },
    ];
  }
}
