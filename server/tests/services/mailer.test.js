/**
 * @fileoverview Unit tests for mailer service.
 * Verifies template rendering, delivery status, non-blocking error handling,
 * and integration with custom transporter mocks.
 * Rule 3.7.2, T-1.6.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  setTransporter,
  sendEmail,
  sendPasswordResetEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendSessionReminderEmail,
} from '../../src/services/mailer.service.js';

describe('services/mailer.service.js — Mailer Service & Templates', () => {
  let mockSendMail;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-12345' });
    setTransporter({
      sendMail: mockSendMail,
    });
  });

  describe('sendEmail', () => {
    it('sends email successfully with subject, to, and html content', async () => {
      const ok = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Welcome to EventSphere</p>',
      });

      expect(ok).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Welcome',
          html: '<p>Welcome to EventSphere</p>',
          text: 'Welcome to EventSphere',
        })
      );
    });

    it('does NOT throw when transporter fails (non-blocking rule 3.7.2)', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Connection Refused'));

      const ok = await sendEmail({
        to: 'user@example.com',
        subject: 'Failed email',
        html: '<p>Error test</p>',
      });

      // Must not throw, returns false
      expect(ok).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('renders password reset layout with CTA button', async () => {
      const ok = await sendPasswordResetEmail('user@test.com', 'http://localhost:5173/reset-password?token=abc');
      expect(ok).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Reset your EventSphere Password',
          html: expect.stringContaining('http://localhost:5173/reset-password?token=abc'),
        })
      );
    });
  });

  describe('sendApplicationApprovedEmail', () => {
    it('renders approval email with dashboard link', async () => {
      const ok = await sendApplicationApprovedEmail('exhibitor@test.com', 'Tech Expo 2026', 'http://localhost:5173/exhibitor/booths');
      expect(ok).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'exhibitor@test.com',
          subject: 'Application Approved: Tech Expo 2026',
          html: expect.stringContaining('Tech Expo 2026'),
        })
      );
    });
  });

  describe('sendApplicationRejectedEmail', () => {
    it('renders rejection email including reason provided', async () => {
      const ok = await sendApplicationRejectedEmail('exhibitor@test.com', 'Tech Expo 2026', 'Booth capacity full');
      expect(ok).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'exhibitor@test.com',
          subject: 'Application Update: Tech Expo 2026',
          html: expect.stringContaining('Booth capacity full'),
        })
      );
    });
  });

  describe('sendSessionReminderEmail', () => {
    it('renders upcoming session reminder with time and location', async () => {
      const ok = await sendSessionReminderEmail('attendee@test.com', 'Keynote: AI in 2026', '10:00 AM UTC', 'Hall A');
      expect(ok).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'attendee@test.com',
          subject: 'Reminder: Keynote: AI in 2026 starts in 15 minutes',
          html: expect.stringContaining('Hall A'),
        })
      );
    });
  });
});
