import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dtos/create-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';
import { Message } from './schemas/message.schema';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({
    status: 201,
    description: 'Message successfully created',
    type: Message,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: [Message],
  })
  findAll(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.messagesService.findAll();
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Get messages by chat ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of messages in chat',
    type: [Message],
  })
  findByChat(
    @Param('chatId') chatId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.messagesService.findWithPagination(chatId, page, limit);
  }

  @Get('chat/:chatId/stats')
  @ApiOperation({ summary: 'Get chat statistics' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'Chat statistics' })
  getChatStats(@Param('chatId') chatId: string) {
    return this.messagesService.getChatStats(chatId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific message by ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message found', type: Message })
  @ApiResponse({ status: 404, description: 'Message not found' })
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get all replies to a message' })
  @ApiParam({ name: 'id', description: 'Parent message ID' })
  @ApiResponse({ status: 200, description: 'List of replies', type: [Message] })
  findReplies(@Param('id') id: string) {
    return this.messagesService.findReplies(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated', type: Message })
  @ApiResponse({ status: 404, description: 'Message not found' })
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }

  @Get('user/:userId/count')
  @ApiOperation({ summary: 'Get message count for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Message count' })
  getUserMessageCount(@Param('userId') userId: string) {
    return this.messagesService.getUserMessageCount(userId);
  }
}
