/**
 * @fileoverview Central Socket.IO Emitter.
 * Provides decoupled event dispatching from services to Socket.IO rooms.
 * Architecture §9, Rules 3.5.3, 3.5.4.
 */

import { logger } from '../config/logger.js';

let ioInstance = null;

/**
 * Register the active Socket.IO server instance.
 * @param {import('socket.io').Server} io
 */
export function setIo(io) {
  ioInstance = io;
}

/**
 * Retrieve the active Socket.IO server instance.
 * @returns {import('socket.io').Server|null}
 */
export function getIo() {
  return ioInstance;
}

/**
 * Dispatch an event to a specific Socket.IO room.
 * @param {string} room
 * @param {string} event
 * @param {Object} payload
 * @returns {boolean} Whether emission was dispatched
 */
export function emitToRoom(room, event, payload) {
  if (!ioInstance) {
    logger.debug({ room, event }, 'Socket.IO not initialized; skipping emit');
    return false;
  }
  ioInstance.to(room).emit(event, payload);
  return true;
}

/**
 * Emit an event to all viewers of an expo.
 * @param {string} expoId
 * @param {string} event
 * @param {Object} payload
 */
export function emitToExpo(expoId, event, payload) {
  return emitToRoom(`expo:${expoId}`, event, payload);
}

/**
 * Emit a private event to a specific user.
 * @param {string} userId
 * @param {string} event
 * @param {Object} payload
 */
export function emitToUser(userId, event, payload) {
  return emitToRoom(`user:${userId}`, event, payload);
}

/**
 * Emit an event to admins monitoring an expo.
 * @param {string} expoId
 * @param {string} event
 * @param {Object} payload
 */
export function emitToAdmin(expoId, event, payload) {
  return emitToRoom(`admin:${expoId}`, event, payload);
}

/**
 * Emit an event to participants of a conversation.
 * @param {string} conversationId
 * @param {string} event
 * @param {Object} payload
 */
export function emitToConversation(conversationId, event, payload) {
  return emitToRoom(`conversation:${conversationId}`, event, payload);
}
