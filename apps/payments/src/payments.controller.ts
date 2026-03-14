import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';
import { PaymentsCreateChargeDto } from './dto/payments-create-charge.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod('PaymentsService', 'CreateCharge')
  @UsePipes(new ValidationPipe())
  async createCharge(@Payload() data: PaymentsCreateChargeDto) {
    return this.paymentsService.createCharge(data);
  }
}
