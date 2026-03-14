import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { Observable, catchError } from 'rxjs';

const GRPC_TO_HTTP: Record<number, (message: string) => never> = {
  [status.INVALID_ARGUMENT]: (msg) => {
    throw new BadRequestException(msg);
  },
  [status.UNAUTHENTICATED]: (msg) => {
    throw new UnauthorizedException(msg);
  },
  [status.PERMISSION_DENIED]: (msg) => {
    throw new ForbiddenException(msg);
  },
  [status.NOT_FOUND]: (msg) => {
    throw new NotFoundException(msg);
  },
};

@Injectable()
export class GrpcToHttpInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GrpcToHttpInterceptor.name);

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        const code = err?.code ?? err?.error?.code;
        const message =
          err?.details ?? err?.error?.message ?? err?.message ?? 'Internal server error';

        this.logger.error(`gRPC error [code=${code}]: ${message}`);

        const thrower = GRPC_TO_HTTP[code];
        if (thrower) {
          thrower(message);
        }

        throw new InternalServerErrorException(message);
      }),
    );
  }
}
