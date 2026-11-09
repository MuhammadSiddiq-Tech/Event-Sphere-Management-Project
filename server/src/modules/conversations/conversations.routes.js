/**
 * @fileoverview Conversation & Messaging REST Routes.
 * Architecture §6.2, T-7.8.
 *
 * All routes require authentication.
 */

import { router } from '../../core/router.js';
import { requireAuth } from '../../middleware/auth.js';
import { conversationsController } from './conversations.controller.js';

const BASE = '/api/v1/conversations';

router.get(BASE, requireAuth, conversationsController.list);
router.post(BASE, requireAuth, conversationsController.start);
router.get(`${BASE}/:id`, requireAuth, conversationsController.getById);
router.get(`${BASE}/:id/messages`, requireAuth, conversationsController.listMessages);
router.post(`${BASE}/:id/messages`, requireAuth, conversationsController.sendMessage);
router.patch(`${BASE}/:id/read`, requireAuth, conversationsController.markRead);
