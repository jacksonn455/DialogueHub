import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, Channel, Connection } from 'amqplib';

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  private connection: Connection;
  private channel: Channel;
  private isConnected = false;

  async onModuleInit() {
    await this.startConsumer();
  }

  private async startConsumer() {
    try {
      this.connection = await connect(
        process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      );
      this.channel = await this.connection.createChannel();

      const queue = process.env.RABBITMQ_QUEUE || 'messages_queue';

      await this.channel.assertQueue(queue, { durable: true });

      await this.channel.prefetch(1);

      this.isConnected = true;

      this.channel.consume(queue, async (msg) => {
        if (msg !== null) {
          try {
            const content = msg.content.toString();
            const data = JSON.parse(content);

            await this.processMessage(data);

            this.channel.ack(msg);
          } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`);

            this.channel.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to start RabbitMQ consumer: ${error.message}`,
      );
    }
  }

  private async processMessage(data: any) {
    const pattern = data.pattern;
    const messageData = data.data;

    switch (pattern) {
      case 'message_created':
        await this.simulateMessageProcessing(messageData);
        break;

      case 'message_updated':
        break;

      case 'message_deleted':
        break;

      default:
    }
  }

  private async simulateMessageProcessing(data: any): Promise<void> {
    const steps = [
      { name: 'Sentiment Analysis', delay: 100 },
      { name: 'Content Filtering', delay: 100 },
      { name: 'Notification Sending', delay: 100 },
      { name: 'Search Indexing', delay: 100 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
