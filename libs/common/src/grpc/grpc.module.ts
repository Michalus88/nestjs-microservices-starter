import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

interface GrpcModuleOptions {
  name: string;
  protoPath: string;
  packageName: string;
}

@Module({})
export class GrpcModule {
  static register({ name, protoPath, packageName }: GrpcModuleOptions): DynamicModule {
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
                protoPath: join(__dirname, protoPath),
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
