import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RPC_CLIENT } from '../constants';
import { RpcClientService } from './rpc-client.service';

@Global()
@Module({})
export class RpcClientModule {
  static register(): DynamicModule {
    return {
      module: RpcClientModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: RPC_CLIENT,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.REDIS,
              options: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
                password: config.get<string>('REDIS_PASSWORD') || undefined,
                retryAttempts: 10,
                retryDelay: 2000,
              },
            }),
          },
        ]),
      ],
      providers: [RpcClientService],
      exports: [RpcClientService, ClientsModule],
    };
  }
}
