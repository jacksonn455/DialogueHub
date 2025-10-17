import React, { createContext, useState, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { messagesApi } from "../api/messagesApi";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { socket } = useSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const loadChats = async () => {
    try {
      setLoading(true);
      const data = await messagesApi.getAllMessages();

      const chatGroups = data.reduce((acc, msg) => {
        const chatId = msg.chat || "general";
        if (!acc[chatId]) {
          acc[chatId] = {
            id: chatId,
            messages: [],
          };
        }
        acc[chatId].messages.push(msg);
        return acc;
      }, {});

      const chatList = Object.values(chatGroups).map((chat) => ({
        id: chat.id,
        name: `Chat ${chat.id.substring(0, 8)}`,
        lastMessage: chat.messages[chat.messages.length - 1],
        unreadCount: 0,
      }));

      setChats(chatList);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId, page = 1) => {
    try {
      setLoading(true);
      const data = await messagesApi.getMessagesByChat(chatId, page, 50);

      if (page === 1) {
        setMessages(data);
      } else {
        setMessages((prev) => [...data, ...prev]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinChat = (chat) => {
    if (activeChat && socket) {
      socket.emit("leaveChat", { chatId: activeChat.id });
    }

    setActiveChat(chat);

    if (socket) {
      socket.emit("joinChat", { chatId: chat.id });
    }

    loadMessages(chat.id);
  };

  const sendMessage = (content, type = "text") => {
    if (!socket || !activeChat) return;

    const messageData = {
      chat: activeChat.id,
      content,
      type,
    };

    socket.emit("sendMessage", messageData);
  };

  const editMessage = (messageId, content) => {
    if (!socket) return;

    socket.emit("editMessage", {
      id: messageId,
      updateDto: { content },
    });
  };

  const deleteMessage = (messageId) => {
    if (!socket) return;

    socket.emit("deleteMessage", { id: messageId });
  };

  const sendTyping = (isTyping) => {
    if (!socket || !activeChat) return;

    socket.emit("typing", {
      chatId: activeChat.id,
      isTyping,
    });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chat ? { ...chat, lastMessage: message } : chat
        )
      );
    });

    socket.on("messageEdited", (message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    });

    socket.on("messageDeleted", ({ id }) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    socket.on("userTyping", ({ userId, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));

      if (isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [userId]: false }));
        }, 3000);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("userTyping");
    };
  }, [socket]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        typingUsers,
        loading,
        loadChats,
        loadMessages,
        joinChat,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
