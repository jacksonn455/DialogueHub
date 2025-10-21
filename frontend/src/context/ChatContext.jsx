import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSocket } from "../hooks/useSocket";
import { messagesApi } from "../api/messagesApi";
import { useAuth } from "../hooks/useAuth";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  const loadedChatsRef = useRef(new Set());
  const previousUserRef = useRef();
  const previousSocketRef = useRef();

  useEffect(() => {
    if (socket && connected && activeChat) {
      const socketChanged = previousSocketRef.current !== socket;
      const userChanged = previousUserRef.current !== user?.id;

      if (socketChanged || userChanged) {
        console.log(
          "Socket or user changed, reloading messages. Socket changed:",
          socketChanged,
          "User changed:",
          userChanged
        );

        setMessages([]);
        setTypingUsers({});
        loadedChatsRef.current.clear();

        socket.emit("joinChat", { chatId: activeChat.id });
        loadMessages(activeChat.id, 1);
      }

      previousSocketRef.current = socket;
      previousUserRef.current = user?.id;
    }
  }, [socket, connected, activeChat, user?.id]);

  const loadChats = useCallback(async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const data = await messagesApi.getAllMessages(1, 100);

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
      loadingRef.current = false;
    }
  }, []);

  const loadMessages = useCallback(
    async (chatId, page = 1) => {
      if (!chatId) return;

      const cacheKey = `${chatId}-${page}-${user?.id}`;
      if (loadingRef.current || loadedChatsRef.current.has(cacheKey)) {
        return;
      }

      try {
        loadingRef.current = true;
        loadedChatsRef.current.add(cacheKey);
        setLoading(true);

        console.log("Loading messages for user:", user?.id, "in chat:", chatId);
        const data = await messagesApi.getMessagesByChat(chatId, page, 50);

        const messagesArray = data.messages || data;
        console.log("Loaded messages:", messagesArray.length);

        if (page === 1) {
          setMessages(messagesArray);
        } else {
          setMessages((prev) => [...messagesArray, ...prev]);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        loadedChatsRef.current.delete(cacheKey);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [user?.id]
  );

  const joinChat = useCallback(
    (chat) => {
      if (!chat) return;

      if (activeChat && socket && activeChat.id !== chat.id) {
        socket.emit("leaveChat", { chatId: activeChat.id });
      }

      if (!activeChat || activeChat.id !== chat.id) {
        setActiveChat(chat);
        setMessages([]);
        setTypingUsers({});
        loadedChatsRef.current.clear();

        if (socket && connected) {
          console.log("Joining chat:", chat.id, "as user:", user?.id);
          socket.emit("joinChat", { chatId: chat.id });
        }

        loadMessages(chat.id, 1);
      }
    },
    [activeChat, socket, connected, loadMessages, user?.id]
  );

  const canSendMessage = useCallback(() => {
    return socket && connected && activeChat && user?.id;
  }, [socket, connected, activeChat, user?.id]);

  const sendMessage = useCallback(
    (content, type = "text") => {
      if (!canSendMessage() || !content.trim()) {
        console.log("sendMessage blocked:", {
          canSend: canSendMessage(),
          hasContent: !!content.trim(),
          socket: !!socket,
          connected: !!connected,
          activeChat: !!activeChat,
          user: !!user?.id,
        });
        return;
      }

      const messageData = {
        chat: activeChat.id,
        content: content.trim(),
        type,
        sender: user.id,
      };

      console.log("Sending message as user:", user.id, messageData);
      socket.emit("sendMessage", messageData);
    },
    [socket, activeChat, user, canSendMessage]
  );

  const editMessage = useCallback(
    (messageId, content) => {
      if (!socket || !content.trim()) return;

      socket.emit("editMessage", {
        id: messageId,
        updateDto: { content: content.trim() },
      });
    },
    [socket]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      if (!socket) return;

      socket.emit("deleteMessage", { id: messageId });
    },
    [socket]
  );

  const sendTyping = useCallback(
    (isTyping) => {
      if (!socket || !activeChat || !user?.id) return;

      socket.emit("typing", {
        chatId: activeChat.id,
        isTyping,
        userId: user.id,
      });
    },
    [socket, activeChat, user]
  );

  const loadMoreMessages = useCallback(
    (page) => {
      if (activeChat) {
        loadMessages(activeChat.id, page);
      }
    },
    [activeChat, loadMessages]
  );

  useEffect(() => {
    if (!socket || !connected) {
      console.log("Socket not ready, skipping event listeners");
      return;
    }

    console.log("Setting up socket event listeners for user:", user?.id);

    const handleNewMessage = (message) => {
      console.log("New message received:", message);

      if (activeChat && message.chat === activeChat.id) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m._id === message._id ||
              (m.content === message.content &&
                m.sender === message.sender &&
                Math.abs(
                  new Date(m.createdAt || Date.now()) -
                    new Date(message.createdAt || Date.now())
                ) < 1000)
          );

          if (exists) {
            console.log("Message already exists, skipping");
            return prev;
          }

          console.log("Adding new message to state");
          return [...prev, message];
        });
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chat ? { ...chat, lastMessage: message } : chat
        )
      );
    };

    const handleMessageEdited = (message) => {
      console.log("Message edited:", message);
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    const handleMessageDeleted = ({ id }) => {
      console.log("Message deleted:", id);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    };

    const handleUserTyping = ({ userId, isTyping, chatId }) => {
      console.log("User typing:", userId, isTyping, "in chat:", chatId);

      if (!activeChat || chatId !== activeChat.id) return;

      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));

      if (isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        }, 3000);
      }
    };

    const handleError = (error) => {
      console.error("Socket error:", error);
    };

    socket.off("newMessage", handleNewMessage);
    socket.off("messageEdited", handleMessageEdited);
    socket.off("messageDeleted", handleMessageDeleted);
    socket.off("userTyping", handleUserTyping);
    socket.off("error", handleError);

    socket.on("newMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("userTyping", handleUserTyping);
    socket.on("error", handleError);

    return () => {
      console.log("Cleaning up socket event listeners");
      socket.off("newMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("userTyping", handleUserTyping);
      socket.off("error", handleError);
    };
  }, [socket, connected, activeChat, user?.id]);

  useEffect(() => {
    loadChats();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        typingUsers,
        loading,
        loadChats,
        loadMessages: loadMoreMessages,
        joinChat,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping,
        socketReady: connected,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
