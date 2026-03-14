import { GrpcOptions, Transport } from '@nestjs/microservices';
import { getGrpcServiceConfig, getProtoPath } from './grpc.config';

export function getGrpcServerOptions(
  serviceName: string,
  url: string,
): GrpcOptions {
  const { packageName } = getGrpcServiceConfig(serviceName);

  return {
    transport: Transport.GRPC,
    options: {
      package: packageName,
      protoPath: getProtoPath(serviceName),
      url,
    },
  };
}
