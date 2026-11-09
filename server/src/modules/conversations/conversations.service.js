/**
 * @fileoverview Conversations Service — business logic layer.
 * Architecture §6.2, T-7.8, T-7.9. FR-EXP-06, FR-EXP-07, FR-ATT-05, BR-9.
 *
 * Rules:
 *  - BR-9:
 *    * 'support': attendee/exhibitor <-> admin.
 *    * 'exhibitor-attendee': attendee <-> exhibitor.
 *    * 'exhibitor-exhibitor': exhibitor <-> exhibitor only within the same expo (both have booth or approved app).
 *  - Unique 1-on-1 conversations per (participants, type, expo).
 *  - Real-time event emissions on message send and read receipts.
 */

import mongoose from 'mongoose';
import { Conversation } from '../../models/conversation.model.js';
import { Message } from '../../models/message.model.js';
import { User } from '../../models/user.model.js';
import { Expo } from '../../models/expo.model.js';
import { Application } from '../../models/application.model.js';
import { Booth } from '../../models/booth.model.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors.js';
import { ROLES, CONVERSATION_TYPE, APPLICATION_STATUS, NOTIFICATION_TYPE } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { emitToConversation, emitToUser } from '../../sockets/emitter.js';
import { notificationsService } from '../notifications/notifications.service.js';

/**
 * Validate BR-9 messaging permissions.
 * @param {Object} senderUser - ctx.user
 * @param {Object} recipientUser - User doc
 * @param {string} type - CONVERSATION_TYPE
 * @param {string|null} expoId
 */
async function validateRoleRules(senderUser, recipientUser, type, expoId) {
  const senderRole = senderUser.role;
  const recipientRole = recipientUser.role;

  if (senderUser._id.toString() === recipientUser._id.toString()) {
    throw new ValidationError([{ path: 'recipientId', message: 'You cannot start a conversation with yourself.' }]);
  }

  if (type === CONVERSATION_TYPE.SUPPORT) {
    const hasAdmin = senderRole === ROLES.ADMIN || recipientRole === ROLES.ADMIN;
    if (!hasAdmin) {
      throw new ForbiddenError('Support conversations must include an administrator.');
    }
    return;
  }

  if (type === CONVERSATION_TYPE.EXHIBITOR_ATTENDEE) {
    const isAttExh =
      (senderRole === ROLES.ATTENDEE && recipientRole === ROLES.EXHIBITOR) ||
      (senderRole === ROLES.EXHIBITOR && recipientRole === ROLES.ATTENDEE) ||
      senderRole === ROLES.ADMIN ||
      recipientRole === ROLES.ADMIN;

    if (!isAttExh) {
      throw new ForbiddenError('This conversation type is only permitted between attendees and exhibitors.');
    }
    return;
  }

  if (type === CONVERSATION_TYPE.EXHIBITOR_EXHIBITOR) {
    if (!expoId) {
      throw new ValidationError([{ path: 'expoId', message: 'Expo ID is required for exhibitor-to-exhibitor conversations (BR-9).' }]);
    }

    const bothExhibitors =
      (senderRole === ROLES.EXHIBITOR && recipientRole === ROLES.EXHIBITOR) ||
      senderRole === ROLES.ADMIN;

    if (!bothExhibitors) {
      throw new ForbiddenError('Exhibitor-to-exhibitor messaging requires both parties to be exhibitors.');
    }

    // Verify both exhibitors participate in the same expo (approved application or booth)
    const [senderInExpo, recipientInExpo] = await Promise.all([
      checkExhibitorInExpo(senderUser._id.toString(), expoId),
      checkExhibitorInExpo(recipientUser._id.toString(), expoId),
    ]);

    if (!senderInExpo && senderRole !== ROLES.ADMIN) {
      throw new ForbiddenError('You do not have an approved booth or application in this expo.');
    }
    if (!recipientInExpo) {
      throw new ForbiddenError('The recipient does not have an approved booth or application in this expo.');
    }
    return;
  }

  throw new ValidationError([{ path: 'type', message: `Invalid conversation type: ${type}` }]);
}

/**
 * Check if an exhibitor has an approved application or allocated booth in the expo.
 */
async function checkExhibitorInExpo(userId, expoId) {
  const [appExists, boothExists] = await Promise.all([
    Application.exists({ expo: expoId, exhibitor: userId, status: APPLICATION_STATUS.APPROVED }),
    Booth.exists({ expo: expoId, $or: [{ assignedTo: userId }, { reservedBy: userId }] }),
  ]);
  return Boolean(appExists || boothExists);
}

export const conversationsService = {
  /**
   * Start or get an existing conversation.
   * @param {Object} currentUser - ctx.user
   * @param {Object} data - { recipientId, type, expoId?, initialMessage? }
   * @returns {Promise<Object>} Conversation document (populated)
   */
  async startConversation(currentUser, data) {
    const { recipientId, type, expoId, initialMessage } = data;
    const currentUserId = currentUser._id.toString();

    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.isActive) {
      throw new NotFoundError('Recipient');
    }

    // Validate BR-9 rule permissions
    await validateRoleRules(currentUser, recipient, type, expoId);

    // Sorted array of participants for consistent querying
    const participantIds = [currentUserId, recipientId].sort();

    // Query for existing conversation
    const query = {
      participants: { $all: participantIds, $size: 2 },
      type,
    };
    if (expoId) {
      query.expo = expoId;
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      const unreadMap = new Map();
      unreadMap.set(currentUserId, 0);
      unreadMap.set(recipientId, 0);

      conversation = await Conversation.create({
        participants: participantIds,
        type,
        expo: expoId || null,
        unreadCounts: unreadMap,
      });
    }

    // If an initial message was provided, send it
    if (initialMessage && initialMessage.trim()) {
      await this.sendMessage(currentUser, conversation._id.toString(), {
        body: initialMessage.trim(),
      });
      conversation = await Conversation.findById(conversation._id);
    }

    return this.getConversationById(currentUserId, conversation._id.toString());
  },

  /**
   * List conversations for the authenticated user.
   * @param {string} userId
   * @param {Object} query - { page?, limit? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listMyConversations(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = { participants: userId };

    const [docs, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', 'name email role avatarUrl')
        .populate('expo', 'title slug')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    const items = docs.map((doc) => {
      const docObj = { ...doc, id: doc._id.toString() };
      delete docObj._id;
      delete docObj.__v;

      // Calculate unread count for current user
      let unread = 0;
      if (doc.unreadCounts) {
        unread = doc.unreadCounts[userId] || doc.unreadCounts.get?.(userId) || 0;
      }
      docObj.unreadCount = unread;
      return docObj;
    });

    return {
      items,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Get single conversation by ID with participant check.
   * @param {string} userId
   * @param {string} conversationId
   * @returns {Promise<Object>}
   */
  async getConversationById(userId, conversationId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email role avatarUrl')
      .populate('expo', 'title slug startDate endDate')
      .lean();

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = conversation.participants.some(
      (p) => (p._id || p.id || p).toString() === userId
    );

    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this conversation.');
    }

    const convObj = { ...conversation, id: conversation._id.toString() };
    delete convObj._id;
    delete convObj.__v;

    let unread = 0;
    if (conversation.unreadCounts) {
      unread = conversation.unreadCounts[userId] || conversation.unreadCounts.get?.(userId) || 0;
    }
    convObj.unreadCount = unread;

    return convObj;
  },

  /**
   * List paginated messages in a conversation.
   * @param {string} userId
   * @param {string} conversationId
   * @param {Object} query - { page?, limit? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listMessages(userId, conversationId, query) {
    // Participant authorization
    await this.getConversationById(userId, conversationId);

    const { page, limit, skip } = parsePagination(query);
    const filter = { conversation: conversationId };

    const [docs, total] = await Promise.all([
      Message.find(filter)
        .populate('sender', 'name email role avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    // Reverse docs so they are in chronological order (oldest -> newest)
    const items = docs.reverse().map((d) => ({
      ...d,
      id: d._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    return {
      items,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Send a message in a conversation.
   * @param {Object} senderUser - ctx.user
   * @param {string} conversationId
   * @param {Object} bodyData - { body }
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(senderUser, conversationId, bodyData) {
    const senderId = senderUser._id.toString();
    const { body } = bodyData;

    if (!body || !body.trim()) {
      throw new ValidationError([{ path: 'body', message: 'Message text cannot be empty.' }]);
    }
    if (body.length > 2000) {
      throw new ValidationError([{ path: 'body', message: 'Message cannot exceed 2000 characters.' }]);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === senderId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You cannot send messages to a conversation you are not a part of.');
    }

    // Determine recipientId (the other participant)
    const recipientId = conversation.participants
      .find((p) => p.toString() !== senderId)
      ?.toString();

    // Create message doc
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      body: body.trim(),
      readBy: [senderId],
    });

    // Populate sender info for emission & return
    const populated = await Message.findById(message._id)
      .populate('sender', 'name email role avatarUrl')
      .lean();

    const messageResult = {
      ...populated,
      id: populated._id.toString(),
      _id: undefined,
      __v: undefined,
    };

    // Update conversation metadata & increment recipient's unreadCount
    const currentUnread = conversation.unreadCounts.get(recipientId) || 0;
    conversation.unreadCounts.set(recipientId, currentUnread + 1);
    conversation.lastMessage = {
      text: body.trim().slice(0, 150),
      sender: senderId,
      createdAt: new Date(),
    };
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Emit real-time events (T-7.9)
    emitToConversation(conversationId, 'message:new', messageResult);

    if (recipientId) {
      emitToUser(recipientId, 'message:new', {
        ...messageResult,
        conversationId,
      });

      // Dispatch real-time notification
      await notificationsService.notify(recipientId, NOTIFICATION_TYPE.NEW_MESSAGE, {
        conversationId,
        senderId,
        senderName: senderUser.name,
        preview: body.trim().slice(0, 80),
      });
    }

    return messageResult;
  },

  /**
   * Mark all messages in a conversation as read by the user.
   * @param {string} userId
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean }>}
   */
  async markAsRead(userId, conversationId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this conversation.');
    }

    // Reset current user's unread count
    conversation.unreadCounts.set(userId, 0);
    await conversation.save();

    // Add userId to readBy array for all messages
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    // Emit read receipt event to conversation room
    emitToConversation(conversationId, 'message:read', {
      conversationId,
      userId,
      readAt: new Date().toISOString(),
    });

    return { success: true };
  },
};
