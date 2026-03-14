import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';
import { CreateChargeRequest } from '@app/common';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod('PaymentsService', 'CreateCharge')
  async createCharge(@Payload() data: CreateChargeRequest) {
    return this.paymentsService.createCharge(data);
  }
}
