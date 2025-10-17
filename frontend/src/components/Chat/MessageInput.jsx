import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { Send, Smile, Paperclip, Mic } from 'lucide-react';
import './MessageInput.css';

const MessageInput = () => {
  const { sendMessage, sendTyping } = useChat();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
      setIsTyping(false);
      sendTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <div className="input-actions-left">
        <button className="btn-input-action" title="Emoji">
          <Smile size={24} />
        </button>
        <button className="btn-input-action" title="Anexar">
          <Paperclip size={24} />
        </button>
      </div>

      <div className="input-wrapper">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          className="message-input"
        />
      </div>

      <div className="input-actions-right">
        {message.trim() ? (
          <button
            onClick={handleSend}
            className="btn-send"
            title="Enviar"
          >
            <Send size={24} />
          </button>
        ) : (
          <button className="btn-input-action" title="Áudio">
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
