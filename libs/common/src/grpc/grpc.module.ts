import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { getGrpcServiceConfig, getProtoPath } from './grpc.config';

@Module({})
export class GrpcModule {
  static register(name: string): DynamicModule {
    const { packageName } = getGrpcServiceConfig(name);

    return {
      module: GrpcModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name,
            useFactory: (configService: ConfigService) => ({
              transport: Transport.GRPC,
              options: {
                package: packageName,
                protoPath: getProtoPath(name),
                url: configService.getOrThrow<string>(`${name.toUpperCase()}_GRPC_URL`),
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
