import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  PAYMENTS_SERVICE,
  PAYMENTS_SERVICE_NAME,
  PaymentsServiceClient,
  ReservationStatus,
  UserDto,
} from '@app/common';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationsRepository } from '../reservations.repository';
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
    const reservation = await this.reservationsRepository.create({
      ...createReservationDto,
      timestamp: new Date(),
      userId,
      status: ReservationStatus.PENDING,
    });

    try {
      const invoiceId = await this.chargePayment(createReservationDto, email);
      return await this.confirmReservation(reservation._id, invoiceId);
    } catch (error) {
      await this.failReservation(reservation._id);
      throw error;
    }
  }

  private async chargePayment(
    createReservationDto: CreateReservationDto,
    email: string,
  ): Promise<string> {
    const { id } = await lastValueFrom(
      this.paymentsService.createCharge({
        ...createReservationDto.charge,
        email,
      }),
    );
    return id;
  }

  private async confirmReservation(
    reservationId: Types.ObjectId,
    invoiceId: string,
  ) {
    try {
      return await this.reservationsRepository.findOneAndUpdate(
        { _id: reservationId },
        { $set: { status: ReservationStatus.CONFIRMED, invoiceId } },
      );
    } catch (error) {
      this.logger.error(
        `Failed to confirm reservation ${reservationId} after successful charge ${invoiceId}. Initiating refund.`,
        error,
      );
      await this.refundPayment(reservationId, invoiceId);
      throw error;
    }
  }

  private async refundPayment(
    reservationId: Types.ObjectId,
    invoiceId: string,
  ) {
    try {
      await lastValueFrom(
        this.paymentsService.refundCharge({ paymentIntentId: invoiceId }),
      );
    } catch (refundError) {
      this.logger.error(
        `Critical: refund failed for charge ${invoiceId}, reservation ${reservationId}. Manual intervention required.`,
        refundError,
      );
    }
  }

  private async failReservation(reservationId: Types.ObjectId) {
    try {
      await this.reservationsRepository.findOneAndUpdate(
        { _id: reservationId },
        { $set: { status: ReservationStatus.FAILED } },
      );
    } catch (updateError) {
      this.logger.error(
        `Failed to mark reservation ${reservationId} as FAILED. Manual intervention required.`,
        updateError,
      );
    }
  }
}
