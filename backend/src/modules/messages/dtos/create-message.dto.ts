import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hello world!', description: 'Message content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Sender ID',
  })
  @IsNotEmpty()
  @IsMongoId()
  sender: string;

  @ApiProperty({ example: '664f8d7a9e6f8a3d4c9b1a2b', description: 'Chat ID' })
  @IsNotEmpty()
  @IsMongoId()
  chat: string;

  @ApiProperty({
    example: '664f8d7a9e6f8a3d4c9b1a2c',
    description: 'Optional ID of the message being replied to',
  })
  @IsOptional()
  @IsMongoId()
  replyTo?: string;
}
