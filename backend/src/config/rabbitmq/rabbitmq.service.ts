
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, Channel, Connection } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: Connection;
  private channel: Channel;
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      this.connection = await connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
      this.channel = await this.connection.createChannel();
      
      const queue = process.env.RABBITMQ_QUEUE || 'messages_queue';
      await this.channel.assertQueue(queue, { durable: true });
      
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ PRODUCER:', error);
      this.isConnected = false;
    }
  }

  async emit(pattern: string, data: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('RabbitMQ not connected, message not sent:', pattern);
      return;
    }

    try {
      const queue = process.env.RABBITMQ_QUEUE || 'messages_queue';
      const message = {
        pattern,
        data: {
          ...data,
          timestamp: new Date(),
        }
      };
      
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true
      });
      
     
     
    } catch (error) {
      console.error(`Error emitting pattern ${pattern}:`, error);
    }
  }

  async sendMessageCreated(message: any): Promise<void> {
    await this.emit('message_created', message);
  }

  async sendMessageUpdated(messageId: string, updateData: any): Promise<void> {
    await this.emit('message_updated', {
      id: messageId,
      ...updateData,
    });
  }

  async sendMessageDeleted(messageId: string): Promise<void> {
    await this.emit('message_deleted', {
      id: messageId,
    });
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}