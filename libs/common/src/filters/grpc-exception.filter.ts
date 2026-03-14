import { Catch, Logger } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';

@Catch()
export class GrpcExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: unknown, host: any): Observable<any> {
    if (exception instanceof RpcException) {
      return super.catch(exception, host);
    }

    const grpcStatus = exception instanceof Error
      ? { code: status.INTERNAL, message: exception.message }
      : { code: status.UNKNOWN, message: 'Unknown error' };

    this.logger.error(
      grpcStatus.message,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(() => grpcStatus);
  }
}
