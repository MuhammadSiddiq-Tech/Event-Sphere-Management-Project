/**
 * @fileoverview Message Mongoose Model.
 * Architecture §6.2, T-7.8. FR-EXP-06, FR-EXP-07, FR-ATT-05.
 *
 * Invariants:
 *  - conversation: ref to Conversation.
 *  - sender: ref to User (must be one of the conversation participants).
 *  - body: string <= 2000 chars.
 *  - readBy: array of User ObjectIds who have seen this message.
 */

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
