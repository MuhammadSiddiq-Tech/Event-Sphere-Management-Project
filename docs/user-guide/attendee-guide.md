# EventSphere — Attendee Guide

> **Role:** Attendee  
> **Platform:** EventSphere Management System  
> **Version:** 1.0

---

## Table of Contents
1. [Role Overview](#1-role-overview)
2. [Getting Started](#2-getting-started)
3. [Attendee Dashboard](#3-attendee-dashboard)
4. [Browsing & Searching Expos](#4-browsing--searching-expos)
5. [Registering for an Expo](#5-registering-for-an-expo)
6. [Bookmarking Exhibitors](#6-bookmarking-exhibitors)
7. [Session Agenda & Schedule](#7-session-agenda--schedule)
8. [Reminders & Notifications](#8-reminders--notifications)
9. [Providing Feedback](#9-providing-feedback)
10. [Privacy & Data Export](#10-privacy--data-export)
11. [FAQ](#11-faq)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Role Overview

As an **Attendee** you are the end‑user who discovers expos, registers, visits booths, and participates in sessions. Your primary actions are:

| Capability | Description |
|---|---|
| **Explore Expos** | Search and browse upcoming events by industry, date, or location |
| **Register & Attend** | Create an account, sign up for expos, and receive tickets |
| **Bookmark Exhibitors** | Save favorite booths for quick access during the event |
| **Build a Personal Agenda** | Add sessions to a personal schedule and receive reminders |
| **Give Feedback** | Rate sessions, booths, and overall event experience |
| **Control Your Data** | Export personal data or delete your account |

---

## 2. Getting Started

### 2.1 Logging In / Registering
1. Open the EventSphere URL in a browser.
2. Click **Sign Up** if you do not have an account, or **Sign In** if you already do.
3. Fill the registration form:
```
Email:    attendee@eventsphere.test
Password: Attendee@1234
Name:     Your Full Name
```
4. Verify your email via the link sent to your inbox.
5. After verification, you are redirected to the **Attendee Dashboard**.

### 2.2 Navigating the Attendee Area
The sidebar provides quick links:

| Sidebar Item | Purpose |
|---|---|
| **Dashboard** | Overview of your registrations, bookmarks, and agenda |
| **Expos** | Browse all public expos |
| **Bookmarks** | Manage saved exhibitors and booths |
| **Agenda** | View your personal session schedule |
| **Feedback** | Submit ratings and comments |
| **Settings** | Account, privacy, and data export options |

---

## 3. Attendee Dashboard

The dashboard (`/attendee`) shows three summary cards:

| Card | What It Shows |
|---|---|
| **Registered Expos** | Number of expos you are signed up for |
| **Bookmarked Exhibitors** | Count of saved booths |
| **Upcoming Sessions** | Sessions added to your agenda in the next 7 days |

Click a card to jump to the relevant view.

---

## 4. Browsing & Searching Expos

1. Click **Expos** in the sidebar or go to `/attendee/expos`.
2. Use the **search bar** to type keywords (e.g., "Technology", "2027").
3. Apply filters:
   - **Date Range**
   - **Location** (city or virtual)
   - **Industry Category**
4. Click an expo tile to view details, including schedule, exhibitors, and registration status.

---

## 5. Registering for an Expo

1. On the expo detail page, click **Register**.
2. Choose a ticket type if the expo offers multiple (Free, Standard, VIP).
3. Confirm your registration – you will receive an email with a QR‑code ticket.
4. The expo appears in your **Dashboard → Registered Expos** list.

> **Note:** Some expos may require approval; you will be notified when the organizer confirms your registration.

---

## 6. Bookmarking Exhibitors

1. While browsing an expo, click the **heart** icon on an exhibitor’s booth card.
2. The booth is added to **Bookmarks** (`/attendee/bookmarks`).
3. From the **Bookmarks** page you can:
   - View exhibitor profiles
   - Open the floor‑plan directly to the bookmarked booth
   - Export your list as CSV for offline reference

---

## 7. Session Agenda & Schedule

1. Open **Agenda** from the sidebar.
2. The agenda lists all sessions you have added.
3. To add a session:
   - Go to an expo’s **Schedule** view.
   - Click **Add to My Agenda** on any session card.
4. The session appears in your agenda with a **Remind Me** toggle.
5. You can drag sessions to reorder or remove them with the **Delete** icon.

---

## 8. Reminders & Notifications

The platform sends notifications for:
- Registration confirmation
- Session start reminders (15 min before)
- Changes to sessions you have saved
- Booth updates for bookmarked exhibitors

Open **Notifications** (`/attendee/notifications`) to see a chronological list, or enable **Email** alerts in **Settings → Preferences**.

---

## 9. Providing Feedback

After attending a session or visiting a booth:
1. Open the **Feedback** tab.
2. Select the expo, then the session or exhibitor.
3. Fill the rating (1‑5 stars) and optional comment.
4. Click **Submit** – organizers can view aggregated feedback in the analytics dashboard.

---

## 10. Privacy & Data Export

### 10.1 Exporting Your Data
1. Go to **Settings → Data Export**.
2. Click **Generate Export** – the system creates a ZIP containing:
   - Account profile (JSON)
   - Registration history
   - Bookmarked exhibitors list
   - Session agenda
3. Download the ZIP when ready (email notification sent).

### 10.2 Deleting Your Account
1. In **Settings**, click **Delete Account**.
2. Confirm by typing your email address.
3. Your data will be permanently removed after a 7‑day grace period.

---

## 11. FAQ

| Q | A |
|---|---|
| **How do I change my password?** | Open **Settings → Security**, click **Change Password**, enter current and new password, then save. |
| **Can I register for multiple expos at once?** | Yes. Each expo has its own **Register** button; you can sign up for as many as you like. |
| **What if I lose my QR ticket?** | In **Dashboard → Registered Expos**, click **Resend Ticket** to receive a new email with the QR code. |
| **How do I share my agenda with colleagues?** | Export your agenda as CSV via **Agenda → Export CSV**, then share the file. |
| **Do I receive notifications on my mobile?** | Install the EventSphere mobile app (available on iOS and Android) and enable push notifications in **Settings → Preferences**. |

---

## 12. Troubleshooting

- **Cannot register for an expo** – Ensure you have verified your email and that the expo is not at capacity. Contact support if the issue persists.
- **Session not appearing in agenda** – Refresh the page; ensure you are viewing the correct expo date range.
- **Bookmarks not saving** – Check that cookies are enabled in your browser; clear site data and retry.
- **QR code not loading** – Verify your internet connection; try opening the ticket in a different browser.
- **Feedback submission fails** – Accepted comment length is up to 500 characters; shorten if necessary and retry.

---

*End of Attendee Guide*