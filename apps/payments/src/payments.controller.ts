import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';
import { CreateChargeRequest, GrpcExceptionFilter } from '@app/common';
import { stripeExceptionMapper } from './stripe-exception.mapper';

@UseFilters(new GrpcExceptionFilter([stripeExceptionMapper]))
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod('PaymentsService', 'CreateCharge')
  async createCharge(@Payload() data: CreateChargeRequest) {
    return this.paymentsService.createCharge(data);
  }
}
