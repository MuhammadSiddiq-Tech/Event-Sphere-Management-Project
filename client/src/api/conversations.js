/**
 * @fileoverview Conversations and Messaging API client functions.
 * Architecture §6.2, T-7.8, T-7.9, T-7.10.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch the authenticated user's conversations.
 * GET /api/v1/conversations
 * @param {Object} params - { page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchConversations(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/conversations', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Start or retrieve an existing conversation.
 * POST /api/v1/conversations
 * @param {Object} data - { recipientId: string, type: string, expoId?: string, initialMessage?: string }
 * @returns {Promise<Object>} Conversation document
 */
export async function startConversation(data) {
  const res = await apiClient.post('/conversations', data);
  return res.data.data;
}

/**
 * Fetch a single conversation by ID.
 * GET /api/v1/conversations/:id
 * @param {string} conversationId
 * @returns {Promise<Object>} Conversation document
 */
export async function fetchConversation(conversationId) {
  const res = await apiClient.get(`/conversations/${conversationId}`);
  return res.data.data;
}

/**
 * Fetch paginated message history for a conversation.
 * GET /api/v1/conversations/:id/messages
 * @param {string} conversationId
 * @param {Object} params - { page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchMessages(conversationId, params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get(`/conversations/${conversationId}/messages`, { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Send a message to a conversation.
 * POST /api/v1/conversations/:id/messages
 * @param {string} conversationId
 * @param {Object} data - { body: string }
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(conversationId, data) {
  const res = await apiClient.post(`/conversations/${conversationId}/messages`, data);
  return res.data.data;
}

/**
 * Mark a conversation as read.
 * PATCH /api/v1/conversations/:id/read
 * @param {string} conversationId
 * @returns {Promise<{ success: boolean }>}
 */
export async function markConversationRead(conversationId) {
  const res = await apiClient.patch(`/conversations/${conversationId}/read`);
  return res.data.data;
}
