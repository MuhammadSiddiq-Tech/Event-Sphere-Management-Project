/**
 * @fileoverview Conversation Mongoose Model.
 * Architecture §6.2, T-7.8. FR-EXP-06, FR-EXP-07, FR-ATT-05, BR-9.
 *
 * Invariants:
 *  - participants: Exactly 2 users.
 *  - type: 'support', 'exhibitor-attendee', or 'exhibitor-exhibitor'.
 *  - expo: Optional reference to an Expo (required for exhibitor-exhibitor).
 *  - unreadCounts: Map of userId -> count.
 */

import mongoose from 'mongoose';
import { CONVERSATION_TYPE } from '../config/constants.js';

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: [
        (val) => Array.isArray(val) && val.length === 2,
        'A conversation must have exactly two participants.',
      ],
      required: true,
      index: true,
    },
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPE),
      required: true,
      index: true,
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      createdAt: { type: Date, default: null },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.unreadCounts instanceof Map) {
          ret.unreadCounts = Object.fromEntries(ret.unreadCounts);
        }
        return ret;
      },
    },
  }
);

conversationSchema.index({ participants: 1, type: 1, expo: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
