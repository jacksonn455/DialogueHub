import { Module, Global } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';

@Global()
@Module({
  providers: [RabbitMQService, RabbitMQConsumerService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}