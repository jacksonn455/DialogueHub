export interface User {
  id: string;
  name: string;
  token?: string;
}

export interface Message {
  _id: string;
  chat: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  createdAt: string;
  updatedAt?: string;
  read?: boolean;
  parentMessage?: string;
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface CreateMessageDto {
  chat: string;
  sender?: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio';
  parentMessage?: string;
}

export interface UpdateMessageDto {
  content?: string;
  read?: boolean;
}