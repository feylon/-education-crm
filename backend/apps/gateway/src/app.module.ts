import { gatewayEnvSchema } from '@app/common/config';
import { RpcClientModule } from '@app/common/rpc';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter, JwtAuthGuard, JwtStrategy, PermissionsGuard, ResponseInterceptor } from './common';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: gatewayEnvSchema, envFilePath: ['.env', '../.env'] }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: config.get<number>('THROTTLE_TTL', 60) * 1000, limit: config.get<number>('THROTTLE_LIMIT', 120) },
      ],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RpcClientModule.register(),
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
