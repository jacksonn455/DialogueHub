import React, { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { Edit2, Trash2, Check, CheckCheck } from 'lucide-react';
import { formatMessageTime } from '../../utils/formatDate';
import './MessageItem.css';

const MessageItem = ({ message, isOwn }) => {
  const { editMessage, deleteMessage } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message._id, editContent);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Deseja realmente deletar esta mensagem?')) {
      deleteMessage(message._id);
    }
  };

  return (
    <div
      className={`message-item ${isOwn ? 'own' : 'other'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isEditing ? (
        <div className="message-edit">
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={handleEdit} className="btn-save">
              Salvar
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="message-bubble">
            <p className="message-content">{message.content}</p>
            <div className="message-meta">
              <span className="message-time">
                {formatMessageTime(message.createdAt)}
              </span>
              {isOwn && (
                <span className="message-status">
                  {message.read ? (
                    <CheckCheck size={16} color="#53bdeb" />
                  ) : (
                    <Check size={16} color="#667781" />
                  )}
                </span>
              )}
            </div>
          </div>

          {showActions && isOwn && (
            <div className="message-actions">
              <button
                onClick={() => setIsEditing(true)}
                className="btn-action"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="btn-action"
                title="Deletar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageItem;