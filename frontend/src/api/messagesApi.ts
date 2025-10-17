import axios from './axios';

export const messagesApi = {
  createMessage: async (data: any) => {
    const response = await axios.post('/messages', data);
    return response.data;
  },

  getAllMessages: async (page = 1, limit = 50) => {
    const response = await axios.get(`/messages?page=${page}&limit=${limit}`);
    return response.data;
  },

  getMessagesByChat: async (chatId: any, page = 1, limit = 50) => {
    const response = await axios.get(
      `/messages/chat/${chatId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getChatStats: async (chatId: any) => {
    const response = await axios.get(`/messages/chat/${chatId}/stats`);
    return response.data;
  },

  getMessage: async (id: any) => {
    const response = await axios.get(`/messages/${id}`);
    return response.data;
  },

  getReplies: async (id: any) => {
    const response = await axios.get(`/messages/${id}/replies`);
    return response.data;
  },

  updateMessage: async (id: any, data: any) => {
    const response = await axios.patch(`/messages/${id}`, data);
    return response.data;
  },

  deleteMessage: async (id: any) => {
    const response = await axios.delete(`/messages/${id}`);
    return response.data;
  },

  getUserMessageCount: async (userId: any) => {
    const response = await axios.get(`/messages/user/${userId}/count`);
    return response.data;
  },
};