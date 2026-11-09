/**
 * @fileoverview Main Application Component.
 * Configures TanStack Query, AuthProvider, React Router with role-based routing,
 * layouts per role (Public, Admin, Exhibitor, Attendee), and ProtectedRoute.
 * T-2.10, T-2.11.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';
import { ToastProvider } from '../components/ui/index.js';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';

// Layouts
import PublicLayout from '../layouts/PublicLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ExhibitorLayout from '../layouts/ExhibitorLayout.jsx';
import AttendeeLayout from '../layouts/AttendeeLayout.jsx';

// Pages
import HomePage from '../pages/HomePage.jsx';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx';
import ProfilePage from '../pages/account/ProfilePage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminExposPage from '../pages/admin/AdminExposPage.jsx';
import AdminFloorPlanEditorPage from '../pages/admin/AdminFloorPlanEditorPage.jsx';
import AdminApplicationsPage from '../pages/admin/AdminApplicationsPage.jsx';
import AdminSchedulePage from '../pages/admin/AdminSchedulePage.jsx';
import ExhibitorDashboardPage from '../pages/exhibitor/ExhibitorDashboardPage.jsx';
import ExhibitorProfilePage from '../pages/exhibitor/ExhibitorProfilePage.jsx';
import ApplicationWizardPage from '../pages/exhibitor/ApplicationWizardPage.jsx';
import ExhibitorApplicationsPage from '../pages/exhibitor/ExhibitorApplicationsPage.jsx';
import ExhibitorBoothsPage from '../pages/exhibitor/ExhibitorBoothsPage.jsx';
import AttendeeDashboardPage from '../pages/attendee/AttendeeDashboardPage.jsx';
import AttendeeAgendaPage from '../pages/attendee/AttendeeAgendaPage.jsx';
import AttendeeRegistrationsPage from '../pages/attendee/AttendeeRegistrationsPage.jsx';
import ExhibitorsPage from '../pages/exhibitor/ExhibitorsPage.jsx';
import PublicExhibitorProfilePage from '../pages/exhibitor/PublicExhibitorProfilePage.jsx';
import ExposListPage from '../pages/expos/ExposListPage.jsx';
import ExpoDetailPage from '../pages/expos/ExpoDetailPage.jsx';
import NotificationsPage from '../pages/notifications/NotificationsPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
          <Routes>
            {/* Public Layout Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/expos" element={<ExposListPage />} />
              <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
              <Route path="/expos/:idOrSlug/apply" element={<ApplicationWizardPage />} />
              <Route path="/exhibitors" element={<ExhibitorsPage />} />
              <Route path="/exhibitors/:id" element={<PublicExhibitorProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/403" element={<ForbiddenPage />} />
            </Route>

            {/* Authenticated Profile Route */}
            <Route element={<ProtectedRoute />}>
              <Route element={<PublicLayout />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="expos" element={<AdminExposPage />} />
                <Route path="expos/:id/floor-plan" element={<AdminFloorPlanEditorPage />} />
                <Route path="expos/:id/schedule" element={<AdminSchedulePage />} />
                <Route path="applications" element={<AdminApplicationsPage />} />
                <Route path="schedule" element={<AdminSchedulePage />} />
                <Route path="analytics" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminDashboardPage />} />
                <Route path="settings" element={<AdminDashboardPage />} />
              </Route>
            </Route>

            {/* Exhibitor Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['exhibitor']} />}>
              <Route path="/exhibitor" element={<ExhibitorLayout />}>
                <Route index element={<ExhibitorDashboardPage />} />
                <Route path="profile" element={<ExhibitorProfilePage />} />
                <Route path="applications" element={<ExhibitorApplicationsPage />} />
                <Route path="apply/:idOrSlug" element={<ApplicationWizardPage />} />
                <Route path="booths" element={<ExhibitorBoothsPage />} />
                <Route path="messages" element={<ExhibitorDashboardPage />} />
              </Route>
            </Route>

            {/* Attendee Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['attendee']} />}>
              <Route path="/attendee" element={<AttendeeLayout />}>
                <Route index element={<AttendeeDashboardPage />} />
                <Route path="agenda" element={<AttendeeAgendaPage />} />
                <Route path="registrations" element={<AttendeeRegistrationsPage />} />
                <Route path="exhibitors" element={<ExhibitorsPage />} />
                <Route path="messages" element={<AttendeeDashboardPage />} />
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route element={<PublicLayout />}>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
);
}
