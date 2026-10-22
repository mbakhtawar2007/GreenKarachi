import { apiFetch } from './catalog';

export type ConversationRefType = 'QUOTE_REQUEST' | 'ORDER' | 'SUPPLY_GAP_REQUEST' | 'PROJECT';

export type Conversation = {
  id: string;
  ref_type: ConversationRefType;
  ref_id: string;
  title: string;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export const getOrCreateConversation = (
  token: string,
  refType: ConversationRefType,
  refId: string
): Promise<{ conversation: Conversation }> =>
  apiFetch<{ conversation: Conversation }>('/api/conversations', token, {
    method: 'POST',
    body: JSON.stringify({ refType, refId })
  });

export const getMyConversations = (token: string): Promise<{ conversations: Conversation[] }> =>
  apiFetch<{ conversations: Conversation[] }>('/api/conversations/mine', token);

export const getConversation = (token: string, conversationId: string): Promise<{ conversation: Conversation }> =>
  apiFetch<{ conversation: Conversation }>(`/api/conversations/${conversationId}`, token);

export const getConversationMessages = (
  token: string,
  conversationId: string
): Promise<{ messages: ConversationMessage[] }> =>
  apiFetch<{ messages: ConversationMessage[] }>(`/api/conversations/${conversationId}/messages`, token);

export const postConversationMessage = (
  token: string,
  conversationId: string,
  body: string
): Promise<{ message: ConversationMessage }> =>
  apiFetch<{ message: ConversationMessage }>(`/api/conversations/${conversationId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
