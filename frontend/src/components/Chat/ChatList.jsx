import React from 'react';
import { formatChatTime, truncateText } from '../../utils/helpers';
import Avatar from '../Common/Avatar';
import './ChatList.css';

const ChatList = ({ chats, activeChat, onSelectChat }) => {
  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma conversa ainda</p>
          <span>Clique em "Nova Conversa" para começar</span>
        </div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${
              activeChat?.id === chat.id ? 'active' : ''
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <Avatar name={chat.name} size={48} />
            
            <div className="chat-info">
              <div className="chat-header">
                <h4 className="chat-name">{chat.name}</h4>
                <span className="chat-time">
                  {chat.lastMessage?.createdAt
                    ? formatChatTime(chat.lastMessage.createdAt)
                    : ''}
                </span>
              </div>
              
              <div className="chat-preview">
                <p className="last-message">
                  {chat.lastMessage?.content
                    ? truncateText(chat.lastMessage.content, 40)
                    : 'Nenhuma mensagem'}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="unread-badge">{chat.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ChatList;
