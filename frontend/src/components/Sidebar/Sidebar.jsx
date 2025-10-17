import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { Search, LogOut, Plus } from "lucide-react";
import ChatList from "../Chat/ChatList";
import Avatar from "../Common/Avatar";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { chats, loadChats, activeChat, joinChat } = useChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChats, setFilteredChats] = useState([]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredChats(
        chats.filter((chat) =>
          chat.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredChats(chats);
    }
  }, [searchTerm, chats]);

  const handleNewChat = () => {
    const chatId = `chat-${Date.now()}`;
    const newChat = {
      id: chatId,
      name: `New Chat ${chatId.substring(5, 10)}`,
      lastMessage: null,
      unreadCount: 0,
    };
    joinChat(newChat);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">
          <Avatar name={user?.name} size={40} />
          <div className="user-details">
            <h3>{user?.name}</h3>
            <span className="user-status">Online</span>
          </div>
        </div>
        <button onClick={logout} className="btn-icon" title="Sair">
          <LogOut size={20} />
        </button>
      </div>

      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <button onClick={handleNewChat} className="btn-new-chat">
        <Plus size={20} />
        New Chat
      </button>

      <ChatList
        chats={filteredChats}
        activeChat={activeChat}
        onSelectChat={joinChat}
      />
    </div>
  );
};

export default Sidebar;
