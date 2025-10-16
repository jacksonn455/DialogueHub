import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { RedisService } from '../../config/redis/redis.service';
import { CreateMessageDto } from './dtos/create-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    const userId = client.handshake.auth.userId;
    if (userId) {
      await this.redisService.setUserOnline(userId, client.id);
      this.server.emit('userOnline', { userId });
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const userId = await this.getUserIdBySocket(client.id);
    if (userId) {
      await this.redisService.setUserOffline(userId);
      this.server.emit('userOffline', { userId });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = await this.messagesService.create(data);

      this.server.to(data.chat).emit('newMessage', message);

      client.emit('messageSent', message);

      return { success: true, data: message };
    } catch (error) {
      client.emit('error', {
        message: 'Failed to send message',
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { id: string; updateDto: UpdateMessageDto },
  ) {
    try {
      const updatedMessage = await this.messagesService.update(
        data.id,
        data.updateDto,
      );

      if (updatedMessage.chat) {
        this.server
          .to(updatedMessage.chat.toString())
          .emit('messageEdited', updatedMessage);
      }

      return { success: true, data: updatedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@MessageBody() data: { id: string }) {
    try {
      const message = await this.messagesService.findOne(data.id);
      await this.messagesService.remove(data.id);

      if (message.chat) {
        this.server
          .to(message.chat.toString())
          .emit('messageDeleted', { id: data.id });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.chatId);

    const userId = client.handshake.auth.userId;
    if (userId) {
      await this.redisService.addToRoom(userId, data.chatId);
    }

    return { success: true, chatId: data.chatId };
  }

  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.chatId);

    const userId = client.handshake.auth.userId;
    if (userId) {
    }

    return { success: true, chatId: data.chatId };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth.userId;
    if (userId) {
      client.to(data.chatId).emit('userTyping', {
        userId,
        chatId: data.chatId,
        isTyping: data.isTyping,
      });
    }
  }

  private async getUserIdBySocket(socketId: string): Promise<string | null> {
    return null;
  }
}
