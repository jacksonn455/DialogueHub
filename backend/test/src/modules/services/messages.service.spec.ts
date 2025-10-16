import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { MessagesService } from '../../../../src/modules/messages/messages.service';
import { Message } from '../../../../src/modules/messages/schemas/message.schema';
import { RabbitMQService } from '../../../../src/config/rabbitmq/rabbitmq.service';
import { RedisService } from '../../../../src/config/redis/redis.service';
import { CreateMessageDto } from '../../../../src/modules/messages/dtos/create-message.dto';
import { UpdateMessageDto } from '../../../../src/modules/messages/dtos/update-message.dto';

// Mock do New Relic antes de importar qualquer coisa
jest.mock('newrelic', () => ({
  startSegment: jest.fn((name, record, handler) => handler()),
  recordMetric: jest.fn(),
  recordCustomEvent: jest.fn(),
  addCustomAttributes: jest.fn(),
  noticeError: jest.fn(),
}));

describe('MessagesService', () => {
  let service: MessagesService;
  let mockMessageModel: any;
  let mockCacheManager: any;
  let mockRabbitMQService: any;
  let mockRedisService: any;

  const mockMessage = {
    _id: '507f1f77bcf86cd799439011',
    content: 'Test message',
    sender: '507f1f77bcf86cd799439012',
    chat: '507f1f77bcf86cd799439013',
    edited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    toString: () => '507f1f77bcf86cd799439011',
  };

  beforeEach(async () => {
    mockMessageModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: mockMessage._id,
      save: jest.fn().mockResolvedValue({
        ...mockMessage,
        ...dto,
      }),
    }));

    Object.assign(mockMessageModel, {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findByIdAndDelete: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      countDocuments: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    });

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockRabbitMQService = {
      sendMessageCreated: jest.fn().mockResolvedValue(true),
      sendMessageUpdated: jest.fn().mockResolvedValue(true),
      sendMessageDeleted: jest.fn().mockResolvedValue(true),
    };

    mockRedisService = {
      incrementCounter: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const createDto: CreateMessageDto = {
        content: 'Test message',
        sender: '507f1f77bcf86cd799439012',
        chat: '507f1f77bcf86cd799439013',
      };

      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(createDto.content);
      expect(mockRabbitMQService.sendMessageCreated).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all messages from cache if available', async () => {
      const messages = [mockMessage];
      mockCacheManager.get.mockResolvedValue(messages);

      const result = await service.findAll();

      expect(result).toEqual(messages);
      expect(mockCacheManager.get).toHaveBeenCalledWith('messages_all');
      expect(mockMessageModel.find).not.toHaveBeenCalled();
    });

    it('should fetch messages from database if cache is empty', async () => {
      const messages = [mockMessage];
      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(messages);

      const result = await service.findAll();

      expect(result).toEqual(messages);
      expect(mockMessageModel.find).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('findByChat', () => {
    it('should return messages for a specific chat', async () => {
      const chatId = '507f1f77bcf86cd799439013';
      const messages = [mockMessage];

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(messages);

      const result = await service.findByChat(chatId);

      expect(result).toEqual(messages);
      expect(mockMessageModel.find).toHaveBeenCalledWith({ chat: chatId });
    });
  });

  describe('findOne', () => {
    it('should return a single message by id', async () => {
      const messageId = '507f1f77bcf86cd799439011';

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(mockMessage);

      const result = await service.findOne(messageId);

      expect(result).toEqual(mockMessage);
      expect(mockMessageModel.findById).toHaveBeenCalledWith(messageId);
    });

    it('should throw NotFoundException if message not found', async () => {
      const messageId = 'nonexistent';

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(null);

      await expect(service.findOne(messageId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a message', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const updateDto: UpdateMessageDto = {
        content: 'Updated message',
      };

      const updatedMessage = { ...mockMessage, content: 'Updated message', edited: true };

      mockMessageModel.findById.mockResolvedValue(mockMessage);
      mockMessageModel.exec.mockResolvedValue(updatedMessage);
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.update(messageId, updateDto);

      expect(result).toBeDefined();
      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockRabbitMQService.sendMessageUpdated).toHaveBeenCalled();
    });

    it('should throw NotFoundException if message to update not found', async () => {
      const messageId = 'nonexistent';
      const updateDto: UpdateMessageDto = {
        content: 'Updated message',
      };

      mockMessageModel.findById.mockResolvedValue(null);

      await expect(service.update(messageId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a message', async () => {
      const messageId = '507f1f77bcf86cd799439011';

      mockMessageModel.findById.mockResolvedValue(mockMessage);
      mockMessageModel.findByIdAndDelete.mockResolvedValue(mockMessage);
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.remove(messageId);

      expect(result).toEqual({ deleted: true });
      expect(mockMessageModel.findByIdAndDelete).toHaveBeenCalledWith(messageId);
      expect(mockRabbitMQService.sendMessageDeleted).toHaveBeenCalled();
    });

    it('should throw NotFoundException if message to delete not found', async () => {
      const messageId = 'nonexistent';

      mockMessageModel.findById.mockResolvedValue(null);

      await expect(service.remove(messageId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findReplies', () => {
    it('should return replies for a message', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const replies = [mockMessage];

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(replies);

      const result = await service.findReplies(messageId);

      expect(result).toEqual(replies);
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        replyTo: messageId,
      });
    });
  });

  describe('getUserMessageCount', () => {
    it('should return message count for a user', async () => {
      const userId = '507f1f77bcf86cd799439012';
      const count = 10;

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.countDocuments.mockResolvedValue(count);

      const result = await service.getUserMessageCount(userId);

      expect(result).toBe(count);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getChatStats', () => {
    it('should return statistics for a chat', async () => {
      const chatId = '507f1f77bcf86cd799439013';

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.countDocuments.mockResolvedValue(100);
      mockMessageModel.exec.mockResolvedValue(mockMessage);
      mockMessageModel.distinct.mockResolvedValue(['user1', 'user2']);

      const result = await service.getChatStats(chatId);

      expect(result.totalMessages).toBe(100);
      expect(result.activeUsers).toHaveLength(2);
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated messages', async () => {
      const chatId = '507f1f77bcf86cd799439013';
      const page = 1;
      const limit = 50;
      const messages = [mockMessage];
      const total = 100;

      mockCacheManager.get.mockResolvedValue(null);
      mockMessageModel.exec.mockResolvedValue(messages);
      mockMessageModel.countDocuments.mockResolvedValue(total);

      const result = await service.findWithPagination(chatId, page, limit);

      expect(result.messages).toEqual(messages);
      expect(result.total).toBe(total);
      expect(result.page).toBe(page);
      expect(result.totalPages).toBe(Math.ceil(total / limit));
    });
  });
});