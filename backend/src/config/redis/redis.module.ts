import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisClientOptions } from 'redis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        socket: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
        password: configService.get('REDIS_PASSWORD'),
        database: configService.get('REDIS_DB', 0),
        ttl: configService.get('REDIS_TTL', 3600),
        max: configService.get('REDIS_MAX_ITEMS', 1000),
        retry_delay: 1000,
        retry_attempts: 3,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
