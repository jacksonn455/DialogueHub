import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { DatabaseModule } from './config/mongodb/mongodb.module';
import { RedisModule } from './config/redis/redis.module';
import { RabbitMQModule } from './config/rabbitmq/rabbitmq.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NewRelicModule } from './config/newrelic/newrelic.module';
import { NewRelicInterceptor } from './config/newrelic/newrelic.interceptor';
import { NewRelicMiddleware } from './config/newrelic/newrelic.middleware';

@Module({
  imports: [
    NewRelicModule.forRoot(),
    DatabaseModule,
    RedisModule,
    RedisModule,
    RabbitMQModule,
    MessagesModule,
  ],
  controllers: [],
    providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: NewRelicInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NewRelicMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
