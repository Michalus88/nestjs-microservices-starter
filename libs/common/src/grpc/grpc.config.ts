import { join } from 'path';

interface GrpcServiceConfig {
  packageName: string;
  protoFilename: string;
}

const GRPC_SERVICES: Record<string, GrpcServiceConfig> = {
  auth: { packageName: 'auth', protoFilename: 'auth.proto' },
  payments: { packageName: 'payments', protoFilename: 'payments.proto' },
};

export function getGrpcServiceConfig(serviceName: string): GrpcServiceConfig {
  const config = GRPC_SERVICES[serviceName];
  if (!config) {
    throw new Error(`Unknown gRPC service: ${serviceName}`);
  }
  return config;
}

export function getProtoPath(serviceName: string): string {
  const { protoFilename } = getGrpcServiceConfig(serviceName);
  return join(process.cwd(), 'proto', protoFilename);
}
