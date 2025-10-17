import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatMessageTime = (date) => {
  if (!date) return '';
  
  const messageDate = new Date(date);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  }
  
  if (isYesterday(messageDate)) {
    return `Ontem ${format(messageDate, 'HH:mm')}`;
  }
  
  return format(messageDate, 'dd/MM/yyyy HH:mm');
};

export const formatChatTime = (date) => {
  if (!date) return '';
  
  const messageDate = new Date(date);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  }
  
  if (isYesterday(messageDate)) {
    return 'Ontem';
  }
  
  return format(messageDate, 'dd/MM/yyyy');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  });
};