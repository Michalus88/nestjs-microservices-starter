import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  NOTIFICATIONS_SERVICE,
  NotifyEmailDto,
  CreateChargeRequest,
  RefundChargeRequest,
} from '@app/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(
    this.configService.get('STRIPE_SECRET_KEY'),
  );

  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: ClientProxy,
  ) {}

  async createCharge({ token, amount, email }: CreateChargeRequest) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      payment_method: token,
      amount: amount * 100,
      confirm: true,
      payment_method_types: ['card'],
      currency: 'usd',
    });

    const notifyEmailDto: NotifyEmailDto = {
      email,
      text: `Your payment of $${amount} has completed successfully.`,
    };
    this.notificationsService.emit('notify_email', notifyEmailDto);

    return { id: paymentIntent.id };
  }

  async refundCharge({ paymentIntentId }: RefundChargeRequest) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    return { id: refund.id };
  }
}
