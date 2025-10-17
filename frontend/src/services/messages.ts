import axios from './api';

export const messagesApi = {
  // Criar mensagem
  createMessage: async (data: any) => {
    const response = await axios.post('/messages', data);
    return response.data;
  },

  // Buscar todas as mensagens
  getAllMessages: async (page = 1, limit = 50) => {
    const response = await axios.get(`/messages?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Buscar mensagens por chat
  getMessagesByChat: async (chatId: any, page = 1, limit = 50) => {
    const response = await axios.get(
      `/messages/chat/${chatId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Buscar estatísticas do chat
  getChatStats: async (chatId: any) => {
    const response = await axios.get(`/messages/chat/${chatId}/stats`);
    return response.data;
  },

  // Buscar mensagem específica
  getMessage: async (id: any) => {
    const response = await axios.get(`/messages/${id}`);
    return response.data;
  },

  // Buscar respostas
  getReplies: async (id: any) => {
    const response = await axios.get(`/messages/${id}/replies`);
    return response.data;
  },

  // Atualizar mensagem
  updateMessage: async (id: any, data: any) => {
    const response = await axios.patch(`/messages/${id}`, data);
    return response.data;
  },

  // Deletar mensagem
  deleteMessage: async (id: any) => {
    const response = await axios.delete(`/messages/${id}`);
    return response.data;
  },

  // Contar mensagens do usuário
  getUserMessageCount: async (userId: any) => {
    const response = await axios.get(`/messages/user/${userId}/count`);
    return response.data;
  },
};