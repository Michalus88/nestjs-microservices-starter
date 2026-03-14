import { Catch, Logger, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';

export type ExceptionMapper = (
  exception: unknown,
) => { code: number; message: string } | null;

@Catch()
export class GrpcExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  constructor(private readonly mappers: ExceptionMapper[] = []) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): Observable<any> {
    // Only handle RPC context — let HTTP exceptions pass through
    if (host.getType() !== 'rpc') {
      throw exception;
    }

    if (exception instanceof RpcException) {
      return super.catch(exception, host);
    }

    const grpcStatus =
      this.runMappers(exception) ??
      (exception instanceof Error
        ? { code: status.INTERNAL, message: exception.message }
        : { code: status.UNKNOWN, message: 'Unknown error' });

    this.logger.error(
      grpcStatus.message,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(() => grpcStatus);
  }

  private runMappers(
    exception: unknown,
  ): { code: number; message: string } | null {
    for (const mapper of this.mappers) {
      const result = mapper(exception);
      if (result) return result;
    }
    return null;
  }
}
