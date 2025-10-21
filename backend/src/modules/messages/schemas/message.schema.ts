import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @ApiProperty({ description: 'Message ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Message content' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ description: 'Message type (text, image, file, etc.)' })
  @Prop({ default: 'text' })
  type: string;

  @ApiProperty({ description: 'User ID who sent the message' })
  @Prop({ type: Types.ObjectId, required: true })
  sender: Types.ObjectId;

  @ApiProperty({ description: 'Chat ID - can be custom string or ObjectId' })
  @Prop({ type: String, required: true, index: true })
  chat: string;

  @ApiProperty({ description: 'Parent message ID for replies' })
  @Prop({ type: Types.ObjectId, required: false })
  replyTo?: Types.ObjectId;

  @ApiProperty({ description: 'Whether the message has been edited' })
  @Prop({ default: false })
  edited: boolean;

  @ApiProperty({ description: 'When the message was edited' })
  @Prop()
  editedAt?: Date;

  @ApiProperty({ description: 'Message metadata' })
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Message creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Message last update date' })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ replyTo: 1 });