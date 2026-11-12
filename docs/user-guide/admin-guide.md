# EventSphere — Administrator & Organizer Guide

> **Role:** Admin / Organizer  
> **Platform:** EventSphere Management System  
> **Version:** 1.0

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Getting Started](#2-getting-started)
3. [Admin Dashboard](#3-admin-dashboard)
4. [Managing Expos](#4-managing-expos)
5. [Floor Plan Management](#5-floor-plan-management)
6. [Exhibitor Applications](#6-exhibitor-applications)
7. [Session & Schedule Management](#7-session--schedule-management)
8. [User Management](#8-user-management)
9. [Analytics Dashboard](#9-analytics-dashboard)
10. [Notifications](#10-notifications)
11. [FAQ](#11-faq)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Role Overview

As an **Admin / Organizer** on EventSphere, you are the command-center operator of the platform. You have full access to every area of the system and are responsible for:

| Capability | Description |
|---|---|
| **Expo Lifecycle** | Create, configure, publish, and close expo events |
| **Floor Plans** | Design booth grids, assign pricing tiers, allocate booths |
| **Exhibitor Applications** | Review, approve, or reject exhibitor applications |
| **Sessions & Schedules** | Build the event program with talks, keynotes, and workshops |
| **User Management** | View, manage, and moderate all platform accounts |
| **Analytics** | Real-time telemetry across registrations, attendance, and revenue |
| **Notifications** | Broadcast announcements to exhibitors and attendees |

---

## 2. Getting Started

### 2.1 Logging In

1. Navigate to the EventSphere platform URL in your browser.
2. Click **Sign In** in the top navigation bar.
3. Enter your admin credentials:

```
Email:    admin@eventsphere.test
Password: Admin@1234
```

4. Click **Sign In**. You will be redirected to the **Admin Dashboard**.

> **Note:** If you have forgotten your password, click **Forgot Password** on the login page and follow the email reset link.

### 2.2 Navigating the Admin Area

Once logged in, the **Admin sidebar** provides access to all management sections:

| Sidebar Item | Purpose |
|---|---|
| **Dashboard** | Live KPI summary and quick-action shortcuts |
| **Expos** | Create and manage all expo events |
| **Applications** | Review exhibitor applications |
| **Floor Plans** | Configure booth layout per expo |
| **Sessions** | Build event schedules and agendas |
| **Users** | Manage attendee and exhibitor accounts |
| **Analytics** | View detailed platform reports |
| **Notifications** | Send announcements and alerts |

---

## 3. Admin Dashboard

The **Command Overview** dashboard (`/admin`) is the first screen you see after login. It surfaces live telemetry from the platform database.

### 3.1 KPI Metric Cards

Four top-level cards update in real time:

| Card | What It Shows |
|---|---|
| **Total Expos** | All expos on the platform, with a "Live" badge for published/ongoing |
| **Exhibitor Accounts** | Total verified exhibitor registrations |
| **Registered Attendees** | Total verified attendee accounts |
| **Total Platform Users** | Combined count across all roles |

### 3.2 Charts

| Chart | Description |
|---|---|
| **Platform User Growth** | Area chart showing cumulative user sign-ups over recent dates |
| **Expo Lifecycle Status** | Donut chart: Published/Live vs. Drafts vs. Completed |
| **Expos by Category** | Bar chart of expos across industry verticals |

### 3.3 Quick Command Actions

Three one-click shortcuts on the dashboard:

- **Review Exhibitor Applications** → `/admin/applications`
- **Open Floor Plan Editor** → `/admin/expos`
- **Manage Users & Roles** → `/admin/users`

---

## 4. Managing Expos

### 4.1 Viewing All Expos

1. Click **Expos** in the sidebar, or go to `/admin/expos`.
2. The table lists all expos with columns: Title, Category, Status, Start Date, End Date, Actions.
3. Use the **search bar** and **status filter** to narrow results.

### 4.2 Creating a New Expo

1. From the Admin Dashboard, click **Create New Expo** (top-right button), or navigate to `/admin/expos` and click **+ New Expo**.
2. Fill in the **Expo Details** form:

| Field | Description |
|---|---|
| **Title** | Public name of the expo (e.g., "Global Tech Expo 2027") |
| **Slug** | URL-friendly identifier, auto-generated from title |
| **Category** | Industry vertical (e.g., Technology, Healthcare, Retail) |
| **Description** | Rich-text overview shown to attendees and exhibitors |
| **Start Date / End Date** | Event dates and times |
| **Venue** | Physical or virtual venue name and address |
| **Capacity** | Maximum number of attendee registrations allowed |
| **Cover Image** | Banner image (recommended 1280×480px) |

3. Click **Save as Draft** to save without publishing.

### 4.3 Editing an Expo

1. In the Expos list, click the **Edit** (pencil) icon next to the expo.
2. Modify any fields in the form.
3. Click **Save Changes**.

> **Warning:** Editing a **published** expo will immediately update what attendees and exhibitors see. Major changes (dates, venue) should trigger a notification to registered users.

### 4.4 Publishing an Expo

1. Open the expo in edit mode.
2. In the **Status** dropdown, select **Published**.
3. Click **Save Changes**.
4. The expo becomes visible in the public Expos directory (`/expos`).

**Expo Status Lifecycle:**

```
Draft → Published → Ongoing → Completed
```

| Status | Meaning |
|---|---|
| **Draft** | Hidden from public, still being configured |
| **Published** | Visible to attendees; applications open for exhibitors |
| **Ongoing** | Event is live/in-progress |
| **Completed** | Event ended; read-only for attendees and exhibitors |

### 4.5 Deleting an Expo

1. In the Expos list, click the **Delete** (trash) icon.
2. Confirm the deletion in the dialog.

> **Caution:** Deleting an expo permanently removes all associated floor plans, applications, sessions, and registrations. This action cannot be undone.

---

## 5. Floor Plan Management

### 5.1 Opening the Floor Plan Editor

1. Navigate to `/admin/expos`.
2. Find the target expo and click **Floor Plan** (or the grid icon).
3. The interactive floor plan editor opens.

### 5.2 Creating the Booth Grid

1. In the editor, set the **Grid Dimensions** (rows × columns).
2. Each cell represents a potential booth position.
3. Click individual cells to toggle them as **available**, **unavailable**, or **reserved**.

### 5.3 Configuring Booth Details

For each booth cell, you can set:

| Property | Description |
|---|---|
| **Booth Number** | Auto-assigned or manually set identifier (e.g., A-01) |
| **Size** | Small, Medium, Large, or Custom (in sq ft / sq m) |
| **Price** | Booth rental cost displayed to exhibitor applicants |
| **Status** | Available, Reserved, Occupied, or Blocked |
| **Notes** | Internal notes (e.g., "Corner booth — premium pricing") |

### 5.4 Assigning a Booth to an Exhibitor

After approving an exhibitor application (see §6):

1. Go to **Applications** and find the approved application.
2. Click **Assign Booth**.
3. The floor plan opens in assignment mode — click the desired available booth.
4. Confirm the assignment. The exhibitor is notified automatically.

### 5.5 Saving the Floor Plan

- Click **Save Floor Plan** to persist changes.
- The floor plan is visible to approved exhibitors (their view is read-only with their booth highlighted) and to attendees in an interactive map view.

---

## 6. Exhibitor Applications

### 6.1 Viewing Pending Applications

1. Navigate to `/admin/applications` or click **Review Exhibitor Applications** from the dashboard.
2. The queue lists all applications with:
   - Exhibitor company name
   - Applied expo
   - Submission date
   - Current status (Pending / Approved / Rejected)

### 6.2 Reviewing an Application

1. Click the application row or **Review** button.
2. The detail panel shows:
   - **Company profile** (name, description, logo, website, social links)
   - **Booth preferences** (size, special requirements)
   - **Supporting documents** (if uploaded)
   - **Application message** from the exhibitor

### 6.3 Approving an Application

1. After reviewing, click **Approve Application**.
2. Optionally add an **internal note** (not shown to exhibitor).
3. Confirm. The application status changes to **Approved**.
4. The exhibitor receives an email and in-app notification.
5. You can then **Assign a Booth** directly from this screen (see §5.4).

### 6.4 Rejecting an Application

1. Click **Reject Application**.
2. Enter a **rejection reason** (required — this is sent to the exhibitor).
3. Confirm. The exhibitor receives an email explaining the decision.

> **Tip:** Use polite, specific rejection reasons (e.g., "Booth capacity for this category is full — please apply to our Q3 event") to maintain good exhibitor relations.

### 6.5 Application Status Reference

| Status | Description |
|---|---|
| **Pending** | Submitted, awaiting admin review |
| **Approved** | Accepted; exhibitor may proceed to booth setup |
| **Rejected** | Declined; exhibitor notified with reason |
| **Withdrawn** | Exhibitor cancelled before decision |

---

## 7. Session & Schedule Management

### 7.1 Accessing Sessions

1. Click **Sessions** in the sidebar, or navigate to `/admin/sessions`.
2. Filter by expo to see that event's program.

### 7.2 Creating a Session

1. Click **+ New Session**.
2. Fill in the form:

| Field | Description |
|---|---|
| **Title** | Session name (e.g., "Keynote: Future of AI in Manufacturing") |
| **Expo** | Select the parent expo |
| **Type** | Keynote, Workshop, Panel, Demo, Networking |
| **Speaker(s)** | Name and bio of presenter(s) |
| **Start Time / End Time** | Date and time of the session |
| **Room / Stage** | Physical location within the venue |
| **Capacity** | Seat limit (leave blank for unlimited) |
| **Description** | Full session abstract visible to attendees |
| **Tags** | Searchable topic tags |

3. Click **Save Session**.

### 7.3 Editing a Session

1. In the Sessions list, click **Edit** next to the session.
2. Update any field.
3. Click **Save Changes**.

> **Note:** Attendees who have added this session to their agenda will receive a notification if the time, room, or speaker changes.

### 7.4 Deleting a Session

1. Click **Delete** (trash icon) next to the session.
2. Confirm in the dialog.

### 7.5 Viewing the Full Schedule

Navigate to `/admin/schedule` for a **calendar/timeline view** of all sessions across all expos, with drag-and-drop reordering support.

---

## 8. User Management

### 8.1 Accessing the User List

1. Navigate to `/admin/users` or click **Manage Users & Roles** from the dashboard.
2. The table displays all registered users with:
   - Name, email, role, registration date, status

### 8.2 Filtering Users

Use the filter bar to search by:
- **Name or email** (text search)
- **Role**: Admin, Exhibitor, Attendee
- **Status**: Active, Suspended

### 8.3 Viewing a User Profile

Click any row to open the **User Detail** panel, which shows:
- Personal information
- Registration history (for attendees)
- Application history (for exhibitors)
- Account activity log

### 8.4 Suspending / Reactivating a User

1. Open the User Detail panel.
2. Click **Suspend Account** to block the user from logging in.
3. To reactivate, click **Reactivate Account**.

> **Caution:** Suspending a user immediately ends any active sessions and prevents login. The user will see an "Account suspended" message on next login attempt.

### 8.5 Changing a User's Role

1. Open the User Detail panel.
2. Use the **Role** dropdown to change between Attendee, Exhibitor, or Admin.
3. Click **Save**. The user's access level changes immediately on their next page load.

### 8.6 Deleting a User

1. Open the User Detail panel.
2. Click **Delete Account** at the bottom.
3. Type the user's email to confirm.
4. Click **Confirm Delete**.

> **Caution:** Deleting a user permanently removes all their data including registrations, applications, and messages. This is irreversible.

---

## 9. Analytics Dashboard

### 9.1 Accessing Full Analytics

Navigate to `/admin/analytics` or click **Full Analytics** from the main dashboard.

### 9.2 Available Reports

| Report | Metrics |
|---|---|
| **User Growth** | Daily/weekly/monthly registrations by role |
| **Expo Performance** | Registrations per expo, capacity utilization |
| **Exhibitor Funnel** | Applications submitted → approved → booths filled |
| **Session Engagement** | Session saves, attendance check-in rates |
| **Category Breakdown** | Expos and registrations by industry category |
| **Revenue Overview** | Booth fees collected (if payment integration active) |

### 9.3 Filtering Analytics Data

- **Date Range Picker**: Select custom start and end dates.
- **Expo Filter**: Scope all metrics to a single expo.
- **Role Filter**: View metrics specific to attendees or exhibitors.

### 9.4 Exporting Data

1. Navigate to any report.
2. Click **Export CSV** or **Export PDF** (top-right of each chart).
3. The file downloads immediately.

---

## 10. Notifications

### 10.1 Sending a Platform Announcement

1. Navigate to `/admin/notifications`.
2. Click **+ New Notification**.
3. Configure the notification:

| Field | Description |
|---|---|
| **Title** | Short subject line (max 80 characters) |
| **Message** | Full notification body (supports markdown) |
| **Target Audience** | All Users, Attendees Only, Exhibitors Only, Specific Expo |
| **Delivery Channel** | In-App, Email, or Both |
| **Schedule** | Send Now or Schedule for a specific date/time |

4. Click **Preview** to review before sending.
5. Click **Send Notification**.

### 10.2 Notification History

The **Notification Log** shows all past announcements with:
- Send date/time
- Target audience
- Open rate (email notifications)
- Delivery status

### 10.3 Automated Notifications

EventSphere sends the following notifications automatically:

| Trigger | Recipients |
|---|---|
| Application approved | Exhibitor (email + in-app) |
| Application rejected | Exhibitor (email + in-app) |
| Booth assigned | Exhibitor (email + in-app) |
| Expo published | All registered exhibitors/attendees for that expo |
| Session time changed | Attendees who saved that session |
| Expo date reminder | All registered attendees (3 days before) |

---

## 11. FAQ

**Q1: How do I add another admin to the platform?**  
A: Go to **Users** → find the user → open their profile → change their role from Exhibitor/Attendee to **Admin** → Save. Alternatively, invite a new user via email (Users → Invite User) and assign them the Admin role in the invitation.

**Q2: Can I unpublish an expo after it goes live?**  
A: Yes. Open the expo in edit mode, change the Status from Published back to **Draft**, and save. This immediately hides it from the public directory. Active registrations are preserved — use this sparingly and send a notification to affected users.

**Q3: What happens to exhibitor applications if I delete an expo?**  
A: All applications, booths, sessions, and registrations associated with the expo are permanently deleted. Exhibitors and attendees are not automatically notified, so it is strongly recommended to send a notification before deleting a live or published expo.

**Q4: How do I bulk-approve exhibitor applications?**  
A: In the Applications list, check the checkboxes next to multiple pending applications, then click **Bulk Actions → Approve Selected**. You can enter a shared internal note that applies to all.

**Q5: Can attendees see the floor plan before registering?**  
A: The floor plan is visible to all users once the expo is published. Booth numbers and exhibitor names are shown; pricing is hidden from attendees (visible only to exhibitors and admins).

**Q6: How do I reset a user's password?**  
A: Go to **Users** → open the user's profile → click **Send Password Reset Email**. The user will receive a reset link valid for 24 hours.

**Q7: What does the "Ongoing" expo status mean?**  
A: "Ongoing" means the event's start date has passed but the end date has not yet arrived. The system can automatically transition expos from Published → Ongoing → Completed based on dates, or you can set it manually.

---

## 12. Troubleshooting

### Dashboard shows "No data" for charts
- **Cause:** No users or expos exist in the database yet.
- **Fix:** Create at least one expo and have a user register to seed the charts.

### Cannot publish an expo
- **Cause:** Required fields (Venue, Start Date, End Date, Cover Image) may be missing.
- **Fix:** Open the expo in edit mode — required fields are highlighted in red. Complete them all before publishing.

### Exhibitor application stuck in "Pending"
- **Cause:** No admin has reviewed it, or there was a notification error.
- **Fix:** Navigate to `/admin/applications`, locate the application, and manually review it. Check the notification log if the exhibitor claims they never received a decision email.

### Floor plan not visible to exhibitors
- **Cause:** The expo is still in Draft status, or the floor plan has not been saved.
- **Fix:** Confirm the expo is Published (`/admin/expos`), then open the floor plan editor and click **Save Floor Plan** even if no changes were made.

### User cannot log in
- **Cause:** Account may be suspended, or they are using incorrect credentials.
- **Fix:** Go to **Users** → find the account → check Status. If suspended, click **Reactivate**. If credentials are wrong, click **Send Password Reset Email**.

### Session time conflict
- **Cause:** Two sessions in the same room overlap in time.
- **Fix:** Go to `/admin/schedule` (timeline view) to visually identify conflicts. Edit one of the sessions to shift its time or change the room assignment.

---

*For additional support, contact the EventSphere technical team or raise a ticket in the internal support portal.*
