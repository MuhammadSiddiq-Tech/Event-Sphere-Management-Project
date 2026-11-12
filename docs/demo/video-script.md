# EventSphere Management — Demo Video Script & Walkthrough

> **Total Duration:** 8 minutes 30 seconds (08:30)  
> **Target Video Spec:** 1080p 60fps (1920×1080), High-definition audio, 16:9 aspect ratio  
> **Presenter:** Split Voiceover / Guided Live Demonstration  
> **Deliverable:** eProject Phase 10 — Task T-10.5 (Demo Video Script)

---

## 1. Video Production & Recording Setup

### 1.1 Prerequisites for Presenter / Recording Setup
1. **Server & Database:** Start MongoDB replica set, MailHog, and seed data:
   ```bash
   docker compose up -d
   npm run seed
   npm run dev
   ```
2. **URLs:**
   - Client App: `http://localhost:5173`
   - API & Swagger Docs: `http://localhost:5000/api/docs`
   - MailHog Web UI: `http://localhost:8025`
3. **Seed Accounts:**
   - **Admin / Organizer:** `admin@eventsphere.test` / `Admin@1234`
   - **Exhibitor:** `exhibitor@eventsphere.test` / `Exhibitor@1234`
   - **Attendee:** `attendee@eventsphere.test` / `Attendee@1234`
4. **Browser Windows:**
   - Window A (Primary): Chrome Incognito — Admin / Organizer session
   - Window B (Secondary): Edge / Chrome Profile 2 — Exhibitor session
   - Window C (Tertiary / Mobile viewport): Chrome Profile 3 — Attendee session
   - Keep Window A and Window B side-by-side during the Real-Time demo (07:00–08:00) to showcase instant Socket.IO propagation.

---

## 2. Comprehensive Video Script & Cue Sheet

| Timestamp | Scene | Narration | UI Action |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:12** | **Title Card & Opening Hook** | "Welcome to EventSphere Management — the modern, real-time enterprise platform engineered to streamline large-scale expos, conferences, and trade shows." | Display high-res title splash card featuring EventSphere logo, Swiss-grid typography, and primary color scheme: Deep Navy (`#0A1128`), Electric Cobalt (`#0057FF`), and Accent Lime (`#D9F95B`). |
| **0:12 - 0:30** | **Architectural & Stack Overview** | "Designed to address the fragmented communication, manual booth allocation, and disconnected attendee experiences of traditional events, EventSphere is built with React 18, Bootstrap 5.3, Vite, and TanStack Query on the frontend, paired with a custom native Node.js HTTP core, MongoDB, and Socket.IO on the backend." | Smooth camera pan over the EventSphere landing page hero section showing statistics badges: 100% Pass Rate on 644 tests (510 Jest backend tests, 134 Vitest frontend tests), zero external framework overhead, and sub-second live state synchronisation. |
| **0:30 - 0:50** | **Admin Journey: Authentication & Security** | "We begin the demonstration with the Administrator and Organizer journey. Admins access the portal through a secure JWT-based authentication system featuring cryptographic bcrypt hashing and rolling refresh tokens." | Navigate to `/login`. Fill in `admin@eventsphere.test` and `Admin@1234`. Show password visibility toggle. Click **Sign In**. Smooth redirect to `/admin/dashboard`. |
| **0:50 - 1:25** | **Admin Journey: Executive Dashboard & Metrics** | "Upon login, the Organizer is greeted by an executive dashboard displaying key operational metrics: active expos, total registered exhibitors, attendee ticket volumes, and total booth capacity utilisation. Interactive Recharts visualizations illustrate revenue and registration velocity in real time." | Hover over dashboard KPI cards and interactive charts: Revenue Breakdown, Daily Registrations, and Booth Occupancy Gauges. Highlight crisp Swiss-grid layout and responsive cards. |
| **1:25 - 2:05** | **Admin Journey: Expo Creation & Configuration** | "Creating an expo is instantaneous. Let's create 'TechSphere Global Expo 2026'. Organizers configure venue locations, date ranges, ticketing tiers, and publish status with comprehensive Zod input validation guarding every field." | Click **Create New Expo**. Enter title, slug, venue name, start/end dates, description, and capacity. Click **Publish Expo**. Show toast notification confirmation: 'Expo published successfully' and see the newly created expo immediately appear in the admin expo roster. |
| **2:05 - 2:35** | **Admin Journey: Interactive Floor Plan Management** | "EventSphere features an interactive, accessible SVG-based floor plan engine. Organizers can configure hall zones, booth dimensions, pricing tiers, and booth designations without heavy, proprietary canvas plugins." | Navigate to the Expo Floor Plan editor. Click on booths to inspect properties (Booth A-101, B-204). Toggle status between Available, Reserved, and Allocated. Demonstrate grid snapping and real-time dimension recalculation. |
| **2:35 - 3:00** | **Admin Journey: Application Approval & Analytics** | "When exhibitors apply for booths, organizers review profiles, verify corporate credentials, and approve or reject applications with atomic database consistency. Detailed audit trails and exportable CSV reports ensure full regulatory compliance." | Navigate to **Applications** tab. Review pending application from 'Quantum AI Labs'. Click **Approve**. Confirm status badge updates to 'Approved' with an animated green status pill. Open Analytics tab to view attendance projections. |
| **3:00 - 3:30** | **Exhibitor Journey: Login & Profile Portal** | "Now let's switch to the Exhibitor journey. Exhibitors access a dedicated workspace tailored to manage their booth presence, company collateral, booth staff, and customer interactions." | Switch to Exhibitor window. Login as `exhibitor@eventsphere.test` / `Exhibitor@1234`. Arrive at Exhibitor Dashboard. Review profile card, company brochure upload section, and current participation status. |
| **3:30 - 4:15** | **Exhibitor Journey: Expo Discovery & Application** | "Exhibitors browse upcoming expos, review hall schematics, and submit participation proposals directly to the event organizers. Form validations ensure business tax IDs, required booth power, and booth size preferences are captured accurately." | Navigate to **Discover Expos**. Select 'TechSphere Global Expo 2026'. Click **Apply to Exhibit**. Fill out booth size requirement, company description, and category. Submit application and observe instantaneous 'Under Review' status. |
| **4:15 - 4:45** | **Exhibitor Journey: Atomic Booth Reservation** | "Once approved by the organizer, the exhibitor can select their exact booth on the interactive floor plan. EventSphere guarantees atomic booth reservation via MongoDB transactions to eliminate double-booking even under peak concurrent traffic." | Open Floor Plan view as Exhibitor. Select available Premium Booth P-01. Click **Reserve Booth**. Modal confirms pricing and terms. Click **Confirm Reservation**. Booth immediately highlights as 'Reserved by You' with Cobalt blue styling. |
| **4:45 - 5:00** | **Exhibitor Journey: Direct In-App Messaging** | "Exhibitors can communicate directly with event organizers and neighboring exhibitors within their hall zone to coordinate logistics and co-marketing promotions." | Open the **Messages** pane. Send a message to the Organizer: 'Booth setup team arriving at 8:00 AM for Hall A setup.' Display delivered checkmark and conversational thread view. |
| **5:00 - 5:35** | **Attendee Journey: Registration & Personalization** | "Next, we explore the Attendee experience. Attendees register with password-strength checking and explicit GDPR/privacy consent compliance." | Open third window. Demonstrate attendee self-registration at `/register`. Toggle consent checkbox. Login as `attendee@eventsphere.test` / `Attendee@1234`. Arrive at Attendee Home. |
| **5:35 - 6:15** | **Attendee Journey: Expo Search, Filter & Ticket Pass** | "Attendees browse an extensive catalog of expos with instant multi-facet filtering by category, date range, and location. Registering for an expo generates a verifiable digital pass with unique ticket identifier." | Browse expos directory. Use live search bar for 'TechSphere'. Click **Register for Expo**. Confirmation modal issues Ticket Code `#ES-2026-9481`. Ticket pass renders with downloadable badge and QR code placeholder. |
| **6:15 - 6:45** | **Attendee Journey: Session Agendas, Bookmarks & Reminders** | "Attendees can explore multi-track schedules, filter keynotes, speaker panels, and workshops. Sessions can be bookmarked to a personalized itinerary with automatic conflict detection and countdown reminders." | Navigate to **Agenda / Sessions**. Filter by Track: 'Artificial Intelligence'. Click bookmark ribbon on 'Opening Keynote: Next-Gen AI Architecture'. View personalized 'My Schedule' tab showing synced session. |
| **6:45 - 7:00** | **Attendee Journey: Exhibitor Directory & Feedback** | "Attendees can browse the exhibitor directory, bookmark company profiles, and provide verified feedback and ratings for sessions attended." | Search exhibitor directory for 'Quantum AI Labs'. View booth location link that cross-highlights on the floor plan map. Open feedback drawer and submit 5-star rating with review comment. |
| **7:00 - 7:35** | **Real-Time Synergy: Live Socket.IO Updates** | "Here we demonstrate the real-time power of EventSphere. With the Admin window on the left and the Attendee window on the right, observe what happens when an organizer broadcasts an emergency schedule announcement." | Place Admin and Attendee browser windows side-by-side. In Admin portal, broadcast an announcement: 'Room Change: Keynote moved to Main Hall B'. Watch the toast notification and badge counter appear in the Attendee window instantaneously without page reload. |
| **7:35 - 8:00** | **Real-Time Synergy: Concurrent Floor Plan Sync** | "Similarly, when an exhibitor reserves a booth, all connected floor plan viewers across the globe receive instant WebSocket state updates, disabling the booth in real time to prevent race conditions." | Exhibitor reserves Booth C-12 on screen A. On screen B (Attendee/Public viewer), Booth C-12 instantly flips color from Lime (Available) to Coral/Grey (Reserved) with subtle pulse animation. |
| **8:00 - 8:30** | **Outro: Technical Excellence & Project Conclusion** | "EventSphere delivers an end-to-end, high-performance expo management platform designed for scale. Featuring zero Express dependencies, 100% automated test coverage across 644 tests, responsive Swiss-grid UI, and enterprise-grade real-time synchronization. Thank you for watching!" | Transition to Closing Slide showing GitHub repository link: `https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project`, contributors credits, documentation links, and final tech badges. Fade to black. |

---

## 3. Post-Production Notes & Editing Guide
- **B-Roll Captures:** Include split-screen closeups during 07:00–08:00 to highlight instant Socket.IO message delivery.
- **Lower Thirds:** Add lower-third graphic overlays displaying current role (`Admin View`, `Exhibitor View`, `Attendee View`).
- **Audio Track:** Ambient corporate tech electronic backing track ducked to -24dB underneath clear voiceover narration.
- **Captions:** Include embedded closed captions (.srt) synchronized with narration timestamps.
