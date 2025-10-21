import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Message type', default: 'text' })
  @IsString()
  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'video', 'audio'])
  type?: string;

  @ApiProperty({ description: 'User ID who is sending the message' })
  @IsString()
  @IsNotEmpty()
  sender: string | Types.ObjectId;

  @ApiProperty({ 
    description: 'Chat ID - can be custom string or MongoDB ObjectId',
    example: 'chat-1761084352930' 
  })
  @IsString()
  @IsNotEmpty()
  chat: string;

  @ApiPropertyOptional({ description: 'Parent message ID for replies' })
  @IsString()
  @IsOptional()
  replyTo?: string | Types.ObjectId;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}