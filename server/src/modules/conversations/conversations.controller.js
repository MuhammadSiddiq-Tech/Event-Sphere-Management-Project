/**
 * @fileoverview Conversations Controller.
 * Architecture §6.2, T-7.8.
 *
 * Routes:
 *   GET    /api/v1/conversations
 *   POST   /api/v1/conversations
 *   GET    /api/v1/conversations/:id
 *   GET    /api/v1/conversations/:id/messages
 *   POST   /api/v1/conversations/:id/messages
 *   PATCH  /api/v1/conversations/:id/read
 */

import { conversationsService } from './conversations.service.js';

export const conversationsController = {
  /**
   * List all conversations for the authenticated user.
   */
  async list(ctx) {
    const result = await conversationsService.listMyConversations(
      ctx.user._id.toString(),
      ctx.query
    );
    ctx.json(200, result.items, result.meta);
  },

  /**
   * Start a new conversation or retrieve existing.
   */
  async start(ctx) {
    const conversation = await conversationsService.startConversation(
      ctx.user,
      ctx.body
    );
    ctx.json(201, conversation);
  },

  /**
   * Get conversation details by ID.
   */
  async getById(ctx) {
    const conversation = await conversationsService.getConversationById(
      ctx.user._id.toString(),
      ctx.params.id
    );
    ctx.json(200, conversation);
  },

  /**
   * List paginated message history.
   */
  async listMessages(ctx) {
    const result = await conversationsService.listMessages(
      ctx.user._id.toString(),
      ctx.params.id,
      ctx.query
    );
    ctx.json(200, result.items, result.meta);
  },

  /**
   * Send a new message to a conversation.
   */
  async sendMessage(ctx) {
    const message = await conversationsService.sendMessage(
      ctx.user,
      ctx.params.id,
      ctx.body
    );
    ctx.json(201, message);
  },

  /**
   * Mark conversation as read.
   */
  async markRead(ctx) {
    const result = await conversationsService.markAsRead(
      ctx.user._id.toString(),
      ctx.params.id
    );
    ctx.json(200, result);
  },
};
