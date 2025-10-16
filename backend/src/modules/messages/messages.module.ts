import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { Message, MessageSchema } from './schemas/message.schema';
import { RabbitMQService } from '../../config/rabbitmq/rabbitmq.service';
import { RedisService } from '../../config/redis/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, RabbitMQService, RedisService],
  exports: [MessagesService],
})
export class MessagesModule {}
