import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";
import { Send, Smile, Paperclip, Mic } from "lucide-react";
import "./MessageInput.css";

const MessageInput = () => {
  const { sendMessage, sendTyping, activeChat } = useChat();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (activeChat) {
      if (!isTyping && value.trim()) {
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
    }
  };

  const handleSend = async () => {
    if (message.trim() && activeChat) {
      try {
        await sendMessage(message);
        setMessage("");
        setIsTyping(false);
        sendTyping(false);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        inputRef.current?.focus();
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = !activeChat;

  return (
    <div className="message-input-container">
      <div className="input-actions-left">
        <button
          className="btn-input-action"
          title="Emoji"
          disabled={isDisabled}
        >
          <Smile size={24} />
        </button>
        <button
          className="btn-input-action"
          title="Anexar"
          disabled={isDisabled}
        >
          <Paperclip size={24} />
        </button>
      </div>

      <div className="input-wrapper">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={
            isDisabled
              ? "Select a chat to start messaging..."
              : "Type a message..."
          }
          rows={1}
          className="message-input"
          disabled={isDisabled}
        />
      </div>

      <div className="input-actions-right">
        {message.trim() ? (
          <button
            onClick={handleSend}
            className="btn-send"
            title="Enviar"
            disabled={isDisabled}
          >
            <Send size={24} />
          </button>
        ) : (
          <button
            className="btn-input-action"
            title="Áudio"
            disabled={isDisabled}
          >
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
