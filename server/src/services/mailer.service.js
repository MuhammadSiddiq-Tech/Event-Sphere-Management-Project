/**
 * @fileoverview Nodemailer mail service with base templates.
 * Supports development transport (MailHog/Ethereal) and SMTP.
 * Failures are non-blocking and logged: they MUST NOT fail the user's primary action.
 * Rule 3.7.2. T-1.6.
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter;

/**
 * Get or create the Nodemailer transporter instance.
 * @returns {nodemailer.Transporter}
 */
export function getTransporter() {
  if (transporter) return transporter;

  const transportConfig = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        }
      : {}),
  };

  transporter = nodemailer.createTransport(transportConfig);
  return transporter;
}

/**
 * Set custom transporter (useful for mocking in unit tests).
 * @param {nodemailer.Transporter} customTransporter
 */
export function setTransporter(customTransporter) {
  transporter = customTransporter;
}

/**
 * Generic email sender. Never throws — logs error and returns success boolean.
 * @param {Object} options
 * @param {string} options.to - recipient email address
 * @param {string} options.subject - email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plaintext body fallback
 * @returns {Promise<boolean>}
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const client = getTransporter();
    const info = await client.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''), // fallback strip tags
    });

    logger.info({ to, subject, messageId: info.messageId }, 'Email sent successfully');
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to deliver email (non-blocking)');
    return false;
  }
}

// ─── Base HTML Email Layout Template ──────────────────────────────────────────
function baseEmailLayout({ title, content, ctaUrl, ctaText }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .cta-btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .footer { padding: 16px 24px; background: #f8fafc; font-size: 13px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EventSphere Management</h1>
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${content}
      ${ctaUrl && ctaText ? `<div style="text-align: center; margin-top: 24px;"><a href="${ctaUrl}" class="cta-btn" style="color: #ffffff;">${ctaText}</a></div>` : ''}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} EventSphere Management. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─── Specific Notification Templates ─────────────────────────────────────────

/**
 * Password reset email template
 * @param {string} to
 * @param {string} resetUrl
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const html = baseEmailLayout({
    title: 'Password Reset Request',
    content: `
      <p>Hello,</p>
      <p>We received a request to reset your password for your EventSphere account.</p>
      <p>This password reset link will expire in <strong>30 minutes</strong>.</p>
      <p>If you did not make this request, you can safely ignore this email.</p>
    `,
    ctaUrl: resetUrl,
    ctaText: 'Reset Password',
  });

  return sendEmail({
    to,
    subject: 'Reset your EventSphere Password',
    html,
  });
}

/**
 * Application approved notification template
 * @param {string} to
 * @param {string} expoTitle
 * @param {string} dashboardUrl
 * @returns {Promise<boolean>}
 */
export async function sendApplicationApprovedEmail(to, expoTitle, dashboardUrl) {
  const html = baseEmailLayout({
    title: 'Application Approved!',
    content: `
      <p>Congratulations!</p>
      <p>Your exhibitor application for <strong>${expoTitle}</strong> has been approved by the organizers.</p>
      <p>You may now access the interactive floor plan to select and reserve your booth space.</p>
    `,
    ctaUrl: dashboardUrl,
    ctaText: 'Go to Floor Plan & Reserve Booth',
  });

  return sendEmail({
    to,
    subject: `Application Approved: ${expoTitle}`,
    html,
  });
}

/**
 * Application rejected notification template
 * @param {string} to
 * @param {string} expoTitle
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
export async function sendApplicationRejectedEmail(to, expoTitle, reason) {
  const html = baseEmailLayout({
    title: 'Application Update',
    content: `
      <p>Hello,</p>
      <p>Thank you for your interest in exhibiting at <strong>${expoTitle}</strong>.</p>
      <p>After review, the organizers are unable to accept your application at this time.</p>
      <p><strong>Reason provided:</strong> ${reason}</p>
    `,
  });

  return sendEmail({
    to,
    subject: `Application Update: ${expoTitle}`,
    html,
  });
}

/**
 * Session reminder email template (~15 minutes prior)
 * @param {string} to
 * @param {string} sessionTitle
 * @param {string} startTimeFormatted
 * @param {string} location
 * @returns {Promise<boolean>}
 */
export async function sendSessionReminderEmail(to, sessionTitle, startTimeFormatted, location) {
  const html = baseEmailLayout({
    title: 'Upcoming Session Reminder',
    content: `
      <p>Reminder: A session you bookmarked or registered for is starting soon!</p>
      <p><strong>Session:</strong> ${sessionTitle}</p>
      <p><strong>Time:</strong> ${startTimeFormatted}</p>
      <p><strong>Location:</strong> ${location}</p>
    `,
  });

  return sendEmail({
    to,
    subject: `Reminder: ${sessionTitle} starts in 15 minutes`,
    html,
  });
}
