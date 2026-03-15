import { Test, TestingModule } from '@nestjs/testing';
import { ReservationSagasService } from './reservation-sagas.service';
import { ReservationsRepository } from '../reservations.repository';
import { PAYMENTS_SERVICE, ReservationStatus } from '@app/common';
import { Types } from 'mongoose';
import { of, throwError } from 'rxjs';
import { CreateReservationDto } from '../dto/create-reservation.dto';

describe('ReservationSagasService', () => {
  let service: ReservationSagasService;
  let reservationsRepository: jest.Mocked<
    Pick<
      ReservationsRepository,
      'create' | 'findOne' | 'findOneAndUpdate' | 'findOneAndDelete'
    >
  >;
  let paymentsService: {
    createCharge: jest.Mock;
    refundCharge: jest.Mock;
  };

  let mockReservationId: Types.ObjectId;

  const mockInvoiceId = 'pi_test_123';

  const dto: CreateReservationDto = {
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-05'),
    charge: { token: 'tok_visa', amount: 100 },
  } as CreateReservationDto;

  const user = { email: 'test@example.com', _id: 'user123' };

  beforeEach(async () => {
    mockReservationId = new Types.ObjectId();

    paymentsService = {
      createCharge: jest.fn(),
      refundCharge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationSagasService,
        {
          provide: ReservationsRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
          },
        },
        {
          provide: PAYMENTS_SERVICE,
          useValue: {
            getService: () => paymentsService,
          },
        },
      ],
    }).compile();

    service = module.get(ReservationSagasService);
    reservationsRepository = module.get(ReservationsRepository);

    // Trigger onModuleInit to set up paymentsService
    service.onModuleInit();
  });

  it('should create reservation, charge payment, and confirm (happy path)', async () => {
    const mockReservation = {
      _id: mockReservationId,
      ...dto,
      userId: user._id,
      status: ReservationStatus.PENDING,
      timestamp: expect.any(Date),
    };

    const confirmedReservation = {
      ...mockReservation,
      status: ReservationStatus.CONFIRMED,
      invoiceId: mockInvoiceId,
    };

    reservationsRepository.create.mockResolvedValue(mockReservation as any);
    paymentsService.createCharge.mockReturnValue(of({ id: mockInvoiceId }));
    reservationsRepository.findOneAndUpdate.mockResolvedValue(
      confirmedReservation as any,
    );
    reservationsRepository.findOne.mockResolvedValue(
      confirmedReservation as any,
    );

    const result = await service.createWithPayment(dto, user as any);

    expect(reservationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user._id,
        status: ReservationStatus.PENDING,
      }),
    );
    expect(paymentsService.createCharge).toHaveBeenCalledWith({
      token: dto.charge.token,
      amount: dto.charge.amount,
      email: user.email,
    });
    expect(reservationsRepository.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: mockReservationId },
      {
        $set: {
          status: ReservationStatus.CONFIRMED,
          invoiceId: mockInvoiceId,
        },
      },
    );
    expect(result).toEqual(confirmedReservation);
  });

  it('should delete reservation when payment fails', async () => {
    reservationsRepository.create.mockResolvedValue({
      _id: mockReservationId,
    } as any);
    paymentsService.createCharge.mockReturnValue(
      throwError(() => new Error('Card declined')),
    );
    reservationsRepository.findOneAndDelete.mockResolvedValue({} as any);

    await expect(service.createWithPayment(dto, user as any)).rejects.toThrow(
      'Card declined',
    );

    expect(reservationsRepository.findOneAndDelete).toHaveBeenCalledWith({
      _id: mockReservationId,
    });
    expect(reservationsRepository.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
