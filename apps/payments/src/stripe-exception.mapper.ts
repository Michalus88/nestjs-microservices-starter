import { status } from '@grpc/grpc-js';
import { ExceptionMapper } from '@app/common';

export const stripeExceptionMapper: ExceptionMapper = (exception: any) => {
  const type = exception?.type;

  if (type === 'StripeCardError' || type === 'StripeInvalidRequestError') {
    return { code: status.INVALID_ARGUMENT, message: exception.message };
  }

  if (type === 'StripeAuthenticationError') {
    return { code: status.UNAUTHENTICATED, message: 'Stripe authentication failed' };
  }

  return null;
};
