/**
 * @fileoverview Socket.IO Server Bootstrap, Handshake Auth, and Room Routing.
 * Architecture §9, FR-SYS-01, Rules §3.5.1, §3.5.2.
 */

import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/user.model.js';
import { Expo } from '../models/expo.model.js';
import { ROLES, EXPO_STATUS } from '../config/constants.js';
import { logger } from '../config/logger.js';
import { setIo } from './emitter.js';

/**
 * Socket.IO authentication middleware.
 * Verifies JWT token from handshake auth or headers.
 * Architecture §8.1, Rules §3.5.1.
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null);

    if (!token) {
      return next(new Error('Authentication required: missing token'));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('_id email role isActive');

    if (!user || user.isActive === false) {
      return next(new Error('User not found or account is deactivated'));
    }

    socket.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (err) {
    logger.debug({ err: err.message }, 'Socket authentication failed');
    return next(new Error('Authentication failed: invalid or expired token'));
  }
}

/**
 * Initialize Socket.IO with auth middleware, connection listeners, and room handlers.
 * @param {import('socket.io').Server} io
 */
export function initSockets(io) {
  setIo(io);

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.debug({ socketId: socket.id, userId: user.id }, 'Socket client connected');

    // Rule 3.5.2: Users automatically join their personal room
    socket.join(`user:${user.id}`);

    // ─── Room: join:expo / leave:expo ─────────────────────────────────────────
    socket.on('join:expo', async (data, callback) => {
      try {
        const expoId = typeof data === 'string' ? data : data?.expoId;
        if (!expoId) throw new Error('expoId is required');

        const expo = await Expo.findById(expoId).select('status createdBy isDeleted');
        if (!expo || expo.isDeleted) {
          throw new Error('Expo not found');
        }

        // Rule 3.5.2: Draft and cancelled expos can only be viewed by admin or creator
        if (
          expo.status === EXPO_STATUS.DRAFT ||
          expo.status === EXPO_STATUS.CANCELLED
        ) {
          const isCreator = expo.createdBy?.toString() === user.id;
          const isAdmin = user.role === ROLES.ADMIN;
          if (!isCreator && !isAdmin) {
            throw new Error('Forbidden: this expo is not public');
          }
        }

        socket.join(`expo:${expoId}`);
        logger.debug({ socketId: socket.id, expoId }, 'Joined expo room');
        if (typeof callback === 'function') callback({ success: true, room: `expo:${expoId}` });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('leave:expo', (data, callback) => {
      const expoId = typeof data === 'string' ? data : data?.expoId;
      if (expoId) {
        socket.leave(`expo:${expoId}`);
        logger.debug({ socketId: socket.id, expoId }, 'Left expo room');
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    // ─── Room: join:admin / leave:admin ───────────────────────────────────────
    socket.on('join:admin', (data, callback) => {
      try {
        if (user.role !== ROLES.ADMIN) {
          throw new Error('Forbidden: admin role required');
        }
        const expoId = typeof data === 'string' ? data : data?.expoId;
        if (!expoId) throw new Error('expoId is required');

        socket.join(`admin:${expoId}`);
        logger.debug({ socketId: socket.id, expoId }, 'Joined admin expo room');
        if (typeof callback === 'function') callback({ success: true, room: `admin:${expoId}` });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('leave:admin', (data, callback) => {
      const expoId = typeof data === 'string' ? data : data?.expoId;
      if (expoId) {
        socket.leave(`admin:${expoId}`);
        logger.debug({ socketId: socket.id, expoId }, 'Left admin expo room');
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    // ─── Room: join:conversation / leave:conversation ─────────────────────────
    socket.on('join:conversation', async (data, callback) => {
      try {
        const conversationId = typeof data === 'string' ? data : data?.conversationId;
        if (!conversationId) throw new Error('conversationId is required');

        // Note: Full participant verification is also backed by conversation model in T-7.8
        socket.join(`conversation:${conversationId}`);
        logger.debug({ socketId: socket.id, conversationId }, 'Joined conversation room');
        if (typeof callback === 'function') {
          callback({ success: true, room: `conversation:${conversationId}` });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('leave:conversation', (data, callback) => {
      const conversationId = typeof data === 'string' ? data : data?.conversationId;
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        logger.debug({ socketId: socket.id, conversationId }, 'Left conversation room');
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket client disconnected');
    });
  });

  return io;
}
