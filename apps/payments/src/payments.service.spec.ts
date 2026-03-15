import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATIONS_SERVICE } from '@app/common';

const mockRefundsCreate = jest.fn();
jest.mock('stripe', () => ({
  default: jest.fn(() => ({
    refunds: { create: mockRefundsCreate },
    paymentIntents: { create: jest.fn() },
  })),
  __esModule: true,
}));

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    mockRefundsCreate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('sk_test_fake'),
          },
        },
        {
          provide: NOTIFICATIONS_SERVICE,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('refundCharge', () => {
    it('should call stripe.refunds.create and return refund id', async () => {
      const mockRefund = { id: 're_test_123' };
      mockRefundsCreate.mockResolvedValue(mockRefund);

      const result = await service.refundCharge({
        paymentIntentId: 'pi_test_456',
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test_456',
      });
      expect(result).toEqual({ id: 're_test_123' });
    });
  });
});
