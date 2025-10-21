import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as newrelic from 'newrelic';
import { RabbitMQService } from '../../config/rabbitmq/rabbitmq.service';
import { RedisService } from '../../config/redis/redis.service';
import { Message } from './schemas/message.schema';
import { CreateMessageDto } from './dtos/create-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';

@Injectable()
export class MessagesService {
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly rabbitMQService: RabbitMQService,
    private readonly redisService: RedisService,
  ) {}

  private validateObjectId(id: string, fieldName: string = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}`);
    }
  }

  private toObjectId(id: string, fieldName: string = 'ID'): Types.ObjectId {
    this.validateObjectId(id, fieldName);
    return new Types.ObjectId(id);
  }

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    return newrelic.startSegment('MessagesService.create', true, async () => {
      try {
        const newMessage = new this.messageModel(createMessageDto);
        const savedMessage = await newMessage.save();

        newrelic.recordMetric('Custom/Messages/Created', 1);
        newrelic.recordMetric(
          'Custom/Messages/ContentLength',
          savedMessage.content.length,
        );

        newrelic.addCustomAttributes({
          'message.id': savedMessage._id.toString(),
          'message.chat': savedMessage.chat.toString(),
          'message.sender': savedMessage.sender.toString(),
          'message.hasReply': !!savedMessage.replyTo,
        });

        await this.rabbitMQService.sendMessageCreated({
          _id: savedMessage._id.toString(),
          content: savedMessage.content,
          sender: savedMessage.sender.toString(),
          chat: savedMessage.chat.toString(),
          replyTo: savedMessage.replyTo?.toString(),
        });

        await this.updateMessageStats(savedMessage.chat?.toString());

        await this.cacheManager.del('messages_all');
        await this.cacheManager.del(`messages_chat_${savedMessage.chat}`);

        newrelic.recordCustomEvent('MessageCreated', {
          messageId: savedMessage._id.toString(),
          chatId: savedMessage.chat.toString(),
          senderId: savedMessage.sender.toString(),
          contentLength: savedMessage.content.length,
          timestamp: new Date().toISOString(),
        });

        return savedMessage;
      } catch (error) {
        newrelic.noticeError(error, {
          service: 'MessagesService',
          operation: 'create',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    });
  }

  async findAll(): Promise<Message[]> {
    return newrelic.startSegment('MessagesService.findAll', true, async () => {
      const cacheKey = 'messages_all';

      const cached = await this.cacheManager.get<Message[]>(cacheKey);
      if (cached) {
        newrelic.recordMetric('Custom/Cache/Hits', 1);
        newrelic.addCustomAttributes({
          'cache.hit': true,
          'cache.key': cacheKey,
        });
        return cached;
      }

      newrelic.recordMetric('Custom/Cache/Misses', 1);
      newrelic.addCustomAttributes({
        'cache.hit': false,
        'cache.key': cacheKey,
      });

      const messages = await this.messageModel
        .find()
        .sort({ createdAt: -1 })
        .exec();

      await this.cacheManager.set(cacheKey, messages, this.CACHE_TTL);

      newrelic.recordMetric('Custom/Messages/TotalCount', messages.length);
      newrelic.addCustomAttributes({
        'messages.count': messages.length,
      });

      return messages;
    });
  }

  private isValidChatId(id: string): boolean {
    return Types.ObjectId.isValid(id) || id.startsWith('chat-');
  }

  private validateChatId(id: string): void {
    if (!this.isValidChatId(id)) {
      throw new BadRequestException(`Invalid Chat ID: ${id}`);
    }
  }

  async findByChat(chatId: string): Promise<Message[]> {
    return newrelic.startSegment(
      'MessagesService.findByChat',
      true,
      async () => {
        this.validateChatId(chatId);

        const cacheKey = `messages_chat_${chatId}`;

        newrelic.addCustomAttributes({
          'chat.id': chatId,
          'cache.key': cacheKey,
        });

        const cached = await this.cacheManager.get<Message[]>(cacheKey);
        if (cached) {
          newrelic.recordMetric('Custom/Cache/Hits', 1);
          newrelic.addCustomAttributes({
            'cache.hit': true,
            'cached.messages.count': cached.length,
          });
          return cached;
        }

        newrelic.recordMetric('Custom/Cache/Misses', 1);
        newrelic.addCustomAttributes({
          'cache.hit': false,
        });

        const messages = await this.messageModel
          .find({ chat: chatId })
          .sort({ createdAt: 1 })
          .exec();

        await this.cacheManager.set(cacheKey, messages, this.CACHE_TTL);

        newrelic.recordMetric(
          `Custom/Chats/${chatId}/MessagesCount`,
          messages.length,
        );
        newrelic.recordMetric('Custom/Messages/ByChatCount', messages.length);

        newrelic.addCustomAttributes({
          'messages.count': messages.length,
          'chat.messages.count': messages.length,
        });

        return messages;
      },
    );
  }

  async findWithPagination(
    chatId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return newrelic.startSegment(
      'MessagesService.findWithPagination',
      true,
      async () => {
        this.validateChatId(chatId);

        const cacheKey = `messages_chat_${chatId}_page_${page}_limit_${limit}`;

        newrelic.addCustomAttributes({
          'chat.id': chatId,
          'pagination.page': page,
          'pagination.limit': limit,
          'cache.key': cacheKey,
        });

        const cached = await this.cacheManager.get<any>(cacheKey);
        if (cached) {
          newrelic.recordMetric('Custom/Cache/Hits', 1);
          newrelic.recordMetric('Custom/Pagination/CacheHits', 1);
          return cached;
        }

        newrelic.recordMetric('Custom/Cache/Misses', 1);
        newrelic.recordMetric('Custom/Pagination/CacheMisses', 1);

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
          this.messageModel
            .find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
          this.messageModel.countDocuments({
            chat: chatId,
          }),
        ]);

        const result = {
          messages,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };

        await this.cacheManager.set(cacheKey, result, 60);

        newrelic.recordMetric('Custom/Pagination/Requests', 1);
        newrelic.recordMetric(`Custom/Chats/${chatId}/PaginationRequests`, 1);
        newrelic.addCustomAttributes({
          'pagination.totalPages': result.totalPages,
          'pagination.totalItems': total,
          'pagination.returnedItems': messages.length,
        });

        return result;
      },
    );
  }

  async getChatStats(chatId: string): Promise<{
    totalMessages: number;
    lastActivity?: string;
    activeUsers: string[];
  }> {
    return newrelic.startSegment(
      'MessagesService.getChatStats',
      true,
      async () => {
        this.validateChatId(chatId);

        const cacheKey = `chat:${chatId}:stats`;

        newrelic.addCustomAttributes({
          'chat.id': chatId,
          'cache.key': cacheKey,
        });

        const cached = await this.cacheManager.get<any>(cacheKey);
        if (cached) {
          newrelic.recordMetric('Custom/Cache/Hits', 1);
          return cached;
        }

        newrelic.recordMetric('Custom/Cache/Misses', 1);

        const [totalMessages, lastMessage] = await Promise.all([
          this.messageModel.countDocuments({
            chat: chatId,
          }),
          this.messageModel
            .findOne({ chat: chatId })
            .sort({ createdAt: -1 })
            .select('createdAt')
            .exec(),
        ]);

        const activeUsers = await this.messageModel.distinct('sender', {
          chat: chatId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        const activeUsersString = activeUsers.map((userId) =>
          userId.toString(),
        );

        const stats = {
          totalMessages,
          activeUsers: activeUsersString,
        };

        await this.cacheManager.set(cacheKey, stats, 300);

        newrelic.recordMetric(
          `Custom/Chats/${chatId}/TotalMessages`,
          totalMessages,
        );
        newrelic.recordMetric(
          `Custom/Chats/${chatId}/ActiveUsers`,
          activeUsersString.length,
        );
        newrelic.recordCustomEvent('ChatStats', {
          chatId: chatId,
          totalMessages: totalMessages,
          activeUsersCount: activeUsersString.length,
          hasRecentActivity: !!lastMessage,
          timestamp: new Date().toISOString(),
        });

        return stats;
      },
    );
  }

  async findOne(id: string): Promise<Message> {
    return newrelic.startSegment('MessagesService.findOne', true, async () => {
      this.validateObjectId(id, 'Message ID');

      const cacheKey = `message_${id}`;

      newrelic.addCustomAttributes({
        'message.id': id,
        'cache.key': cacheKey,
      });

      const cached = await this.cacheManager.get<Message>(cacheKey);
      if (cached) {
        newrelic.recordMetric('Custom/Cache/Hits', 1);
        newrelic.addCustomAttributes({
          'cache.hit': true,
        });
        return cached;
      }

      newrelic.recordMetric('Custom/Cache/Misses', 1);
      newrelic.addCustomAttributes({
        'cache.hit': false,
      });

      const message = await this.messageModel.findById(id).exec();

      if (!message) {
        newrelic.recordCustomEvent('MessageNotFound', {
          messageId: id,
          timestamp: new Date().toISOString(),
        });
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      await this.cacheManager.set(cacheKey, message, this.CACHE_TTL);

      return message;
    });
  }

  async update(id: string, updateDto: UpdateMessageDto): Promise<Message> {
    return newrelic.startSegment('MessagesService.update', true, async () => {
      try {
        this.validateObjectId(id, 'Message ID');

        const message = await this.messageModel.findById(id);
        if (!message) {
          throw new NotFoundException(`Message with ID ${id} not found`);
        }

        const updated = await this.messageModel
          .findByIdAndUpdate(
            id,
            {
              ...updateDto,
              edited: true,
              editedAt: new Date(),
            },
            { new: true },
          )
          .exec();

        if (!updated) {
          throw new NotFoundException(
            `Message with ID ${id} not found after update`,
          );
        }

        newrelic.recordMetric('Custom/Messages/Updated', 1);
        newrelic.recordCustomEvent('MessageUpdated', {
          messageId: id,
          oldContentLength: message.content.length,
          newContentLength: updateDto.content?.length || 0,
          chatId: message.chat?.toString(),
          timestamp: new Date().toISOString(),
        });

        await this.rabbitMQService.sendMessageUpdated(id, {
          oldContent: message.content,
          newContent: updateDto.content,
          chatId: message.chat?.toString(),
        });

        await this.invalidateMessageCaches(id, message.chat?.toString());

        return updated;
      } catch (error) {
        newrelic.noticeError(error, {
          service: 'MessagesService',
          operation: 'update',
          messageId: id,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    return newrelic.startSegment('MessagesService.remove', true, async () => {
      try {
        this.validateObjectId(id, 'Message ID');

        const message = await this.messageModel.findById(id);
        if (!message) {
          throw new NotFoundException(`Message with ID ${id} not found`);
        }

        const result = await this.messageModel.findByIdAndDelete(id);

        if (!result) {
          throw new NotFoundException(
            `Message with ID ${id} not found for deletion`,
          );
        }

        newrelic.recordMetric('Custom/Messages/Deleted', 1);
        newrelic.recordCustomEvent('MessageDeleted', {
          messageId: id,
          chatId: message.chat?.toString(),
          contentLength: message.content.length,
          timestamp: new Date().toISOString(),
        });

        await this.rabbitMQService.sendMessageDeleted(id);

        await this.updateMessageStats(message.chat?.toString(), -1);

        await this.invalidateMessageCaches(id, message.chat?.toString());

        return { deleted: true };
      } catch (error) {
        newrelic.noticeError(error, {
          service: 'MessagesService',
          operation: 'remove',
          messageId: id,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    });
  }

  async findReplies(messageId: string): Promise<Message[]> {
    return newrelic.startSegment(
      'MessagesService.findReplies',
      true,
      async () => {
        this.validateObjectId(messageId, 'Message ID');

        const cacheKey = `replies_${messageId}`;

        newrelic.addCustomAttributes({
          'parent.message.id': messageId,
          'cache.key': cacheKey,
        });

        const cached = await this.cacheManager.get<Message[]>(cacheKey);
        if (cached) {
          newrelic.recordMetric('Custom/Cache/Hits', 1);
          newrelic.recordMetric('Custom/Messages/RepliesCount', cached.length);
          return cached;
        }

        newrelic.recordMetric('Custom/Cache/Misses', 1);

        const replies = await this.messageModel
          .find({ replyTo: messageId })
          .sort({ createdAt: 1 })
          .exec();

        await this.cacheManager.set(cacheKey, replies, this.CACHE_TTL);

        newrelic.recordMetric('Custom/Messages/RepliesCount', replies.length);
        newrelic.addCustomAttributes({
          'replies.count': replies.length,
        });

        return replies;
      },
    );
  }

  private async invalidateMessageCaches(
    messageId: string,
    chatId?: string,
  ): Promise<void> {
    return newrelic.startSegment(
      'MessagesService.invalidateCache',
      false,
      async () => {
        const promises = [
          this.cacheManager.del(`message_${messageId}`),
          this.cacheManager.del('messages_all'),
        ];

        if (chatId) {
          promises.push(this.cacheManager.del(`messages_chat_${chatId}`));
        }

        await Promise.all(promises);

        newrelic.recordMetric('Custom/Cache/Invalidations', 1);
      },
    );
  }

  private async updateMessageStats(
    chatId?: string,
    increment: number = 1,
  ): Promise<void> {
    if (!chatId) return;

    return newrelic.startSegment(
      'MessagesService.updateStats',
      false,
      async () => {
        try {
          await this.redisService.incrementCounter('total_messages');
          await this.redisService.incrementCounter(`chat:${chatId}:messages`);
          await this.redisService.set(
            `chat:${chatId}:last_activity`,
            new Date().toISOString(),
            3600,
          );

          newrelic.recordMetric('Custom/Redis/Operations', 3);
          newrelic.addCustomAttributes({
            'redis.operations': 'increment,set',
            'chat.id': chatId,
          });
        } catch (error) {
          newrelic.noticeError(error, {
            service: 'MessagesService',
            operation: 'updateStats',
            chatId: chatId,
            timestamp: new Date().toISOString(),
          });
          console.error('Error updating message stats:', error);
        }
      },
    );
  }

  async getUserMessageCount(userId: string): Promise<number> {
    return newrelic.startSegment(
      'MessagesService.getUserMessageCount',
      true,
      async () => {
        this.validateObjectId(userId, 'User ID');

        const cacheKey = `user:${userId}:message_count`;

        newrelic.addCustomAttributes({
          'user.id': userId,
          'cache.key': cacheKey,
        });

        const cached = await this.cacheManager.get<number>(cacheKey);
        if (cached !== undefined && cached !== null) {
          newrelic.recordMetric('Custom/Cache/Hits', 1);
          return cached;
        }

        newrelic.recordMetric('Custom/Cache/Misses', 1);

        const count = await this.messageModel.countDocuments({
          sender: this.toObjectId(userId, 'User ID'),
        });

        await this.cacheManager.set(cacheKey, count, 600);

        newrelic.recordMetric(`Custom/Users/${userId}/MessageCount`, count);
        newrelic.recordCustomEvent('UserMessageCount', {
          userId: userId,
          messageCount: count,
          timestamp: new Date().toISOString(),
        });

        return count;
      },
    );
  }
}
