# EventSphere — Exhibitor Guide

> **Role:** Exhibitor  
> **Platform:** EventSphere Management System  
> **Version:** 1.0

---

## Table of Contents
1. [Role Overview](#1-role-overview)
2. [Getting Started](#2-getting-started)
3. [Exhibitor Dashboard](#3-exhibitor-dashboard)
4. [Applying to Expos](#4-applying-to-expos)
5. [Booth Reservation](#5-booth-reservation)
6. [Floor Plan View](#6-floor-plan-view)
7. [Managing Booth Profile](#7-managing-booth-profile)
8. [Messaging](#8-messaging)
9. [Session & Schedule](#9-session--schedule)
10. [Notifications](#10-notifications)
11. [FAQ](#11-faq)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Role Overview

As an **Exhibitor** you represent a company or organization that showcases products/services at an expo. Your main responsibilities include:

| Capability | Description |
|---|---|
| **Apply to Expos** | Submit an application for each expo you wish to attend |
| **Booth Reservation** | Choose and reserve a booth location and size |
| **Profile Management** | Edit your exhibitor profile, branding assets, and product listings |
| **Messaging** | Communicate with attendees and the expo organizer |
| **Session Participation** | Add speaking sessions or demos to the expo agenda |
| **Notifications** | Receive updates about application status, booth assignments, and schedule changes |

---

## 2. Getting Started

### 2.1 Logging In
1. Open the EventSphere URL in a browser.
2. Click **Sign In**.
3. Enter your exhibitor credentials:
```
Email:    exhibitor@eventsphere.test
Password: Exhibitor@1234
```
4. Click **Sign In** – you will land on the **Exhibitor Dashboard**.

### 2.2 Navigating the Exhibitor Area
The left sidebar provides quick links:

| Sidebar Item | Purpose |
|---|---|
| **Dashboard** | Overview of your applications, booths, and messages |
| **Expos** | Browse available expos and submit applications |
| **Booths** | Manage reserved booths and floor‑plan view |
| **Profile** | Edit branding, product catalog, and contact info |
| **Messaging** | Chat with attendees and organizers |
| **Sessions** | Propose talks, demos, or webinars |
| **Notifications** | View system alerts |

---

## 3. Exhibitor Dashboard

The dashboard (`/exhibitor`) shows three summary cards:

| Card | What It Shows |
|---|---|
| **Pending Applications** | Number of expos you have applied to awaiting approval |
| **Reserved Booths** | Count of confirmed booth reservations |
| **Messages** | Unread messages from attendees or organizers |

Click any card to jump directly to the relevant screen.

---

## 4. Applying to Expos

1. From the sidebar select **Expos** or navigate to `/exhibitor/expos`.
2. Browse the list or use the search bar to find a suitable expo.
3. Click **Apply** next to the expo of interest.
4. Fill the **Application Form**:
   - Company name
   - Brief description
   - Desired booth size (Standard, Premium, Custom)
   - Special requirements (e.g., power, internet)
5. Click **Submit**.
6. You will receive a notification when the organizer reviews your request.

---

## 5. Booth Reservation

After your application is approved:

1. Open **Booths** from the sidebar or go to `/exhibitor/booths`.
2. Select the expo for which you received approval.
3. The floor‑plan grid displays available booths.
4. Click a **Available** booth cell to open the reservation modal.
5. Choose the **Booth Type** (Standard, Premium, Custom) and confirm pricing.
6. Click **Reserve** – the booth status changes to **Reserved**.

> **Tip:** Premium booths are highlighted in gold; they include extra branding space.

---

## 6. Floor Plan View

The floor‑plan viewer lets you visualise your location:

1. In **Booths**, click **View Floor Plan**.
2. Use the zoom controls (`+` / `–`) to focus on your area.
3. Hover over a booth to see details (size, price, status).
4. Use the **Legend** toggle to display key icons (reserved, occupied, unavailable).

---

## 7. Managing Booth Profile

Each reserved booth has an associated profile page:

1. Click the **Edit** icon on the booth tile.
2. Upload branding assets (logo, banner image, video). Recommended size: 1280×720px.
3. Add a **Booth Description** – concise, 150‑250 characters.
4. Set **Contact Info** (phone, email, website).
5. Save changes – updates appear instantly on the public expo floor‑plan.

---

## 8. Messaging

Communicate with attendees and organizers via the built‑in chat:

1. Open **Messaging** from the sidebar or go to `/exhibitor/messages`.
2. Select a conversation (Attendee, Organizer, or Group).
3. Type your message and press **Enter**.
4. Use the attachment icon to share PDFs, images, or links.
5. Unread messages are highlighted in bold on the dashboard.

---

## 9. Session & Schedule

You can add sessions (talks, demos) to the expo agenda:

1. Go to **Sessions** → **Add Session**.
2. Fill the form:
   - Title
   - Description
   - Date & Time (must fall within expo dates)
   - Location (choose your booth or a main stage)
3. Click **Submit** – the organizer will review and publish.
4. Once approved, the session appears on the **Attendee Schedule** and your dashboard.

---

## 10. Notifications

All important events trigger a notification badge:

- **Application status** (approved / rejected)
- **Booth reservation confirmation**
- **New messages**
- **Session approval**
- **System alerts** (e.g., floor‑plan changes)

Open the **Notifications** panel (`/exhibitor/notifications`) to see a chronological list.

---

## 11. FAQ

| Q | A |
|---|---|
| **How do I change my booth size after reservation?** | Navigate to **Booths**, select the booth, and click **Edit**. Changing the size may affect pricing; confirm the new cost before saving. |
| **Can I add multiple sessions?** | Yes, repeat the **Add Session** flow for each talk or demo you wish to host. |
| **What if my application is rejected?** | Review the rejection reason in the **Notifications** panel and resubmit with corrected information. |
| **How do I export my exhibitor data?** | In **Profile**, click **Export CSV** – the file includes your contact info, booth assignment, and session list. |
| **Who do I contact for technical issues?** | Use the **Messaging** tab to reach the Expo Organizer, or email support@eventsphere.test. |

---

## 12. Troubleshooting

- **Unable to see the floor‑plan grid** – Refresh the page; clear browser cache if the issue persists.
- **Reservation button disabled** – Ensure the expo status is **Published** and you have an approved application.
- **Missing notifications** – Verify that email notifications are enabled in **Profile → Settings**.
- **File upload fails** – Accepted formats are JPG, PNG, PDF, MP4; keep each file under 5 MB.
- **Chat messages not delivering** – Check your internet connection; reload the **Messaging** page and resend.

---

*End of Exhibitor Guide*