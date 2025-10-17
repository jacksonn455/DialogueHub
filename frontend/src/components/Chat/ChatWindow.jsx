import React, { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { MoreVertical, Phone, Video, Search } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import TypingIndicator from '../Common/TypingIndicator';
import Avatar from '../Common/Avatar';
import './ChatWindow.css';

const ChatWindow = () => {
  const { activeChat, messages, typingUsers, loadMessages } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container.scrollTop === 0 && activeChat) {
      // Load more messages (pagination)
      // loadMessages(activeChat.id, page + 1);
    }
  };

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <div className="empty-chat">
          <h2>Selecione uma conversa</h2>
          <p>Escolha uma conversa na lista ou inicie uma nova</p>
        </div>
      </div>
    );
  }

  const typingUsersList = Object.entries(typingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== user?.id)
    .map(([userId]) => userId);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <Avatar name={activeChat.name} size={40} />
          <div>
            <h3>{activeChat.name}</h3>
            <span className="status">Online</span>
          </div>
        </div>
        
        <div className="chat-header-actions">
          <button className="btn-icon" title="Buscar">
            <Search size={20} />
          </button>
          <button className="btn-icon" title="Ligar">
            <Phone size={20} />
          </button>
          <button className="btn-icon" title="Videochamada">
            <Video size={20} />
          </button>
          <button className="btn-icon" title="Mais opções">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Nenhuma mensagem ainda</p>
            <span>Envie uma mensagem para começar a conversa</span>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              isOwn={message.sender === user?.id}
            />
          ))
        )}
        
        {typingUsersList.length > 0 && (
          <TypingIndicator users={typingUsersList} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatWindow;