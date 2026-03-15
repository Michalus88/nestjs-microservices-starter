import { status } from '@grpc/grpc-js';
import Stripe from 'stripe';
import { ExceptionMapper } from '@app/common';

export const stripeExceptionMapper: ExceptionMapper = (exception: any) => {
  if (
    exception instanceof Stripe.errors.StripeCardError ||
    exception instanceof Stripe.errors.StripeInvalidRequestError
  ) {
    return { code: status.INVALID_ARGUMENT, message: exception.message };
  }

  if (exception instanceof Stripe.errors.StripeAuthenticationError) {
    return { code: status.UNAUTHENTICATED, message: 'Stripe authentication failed' };
  }

  return null;
};
