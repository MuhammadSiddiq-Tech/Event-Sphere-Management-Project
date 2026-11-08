import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-vh-100 d-flex flex-column">
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
            <span className="navbar-brand fw-bold">EventSphere</span>
          </nav>
          <main className="container my-5 flex-grow-1">
            <Routes>
              <Route
                path="/"
                element={
                  <div className="p-5 mb-4 bg-light rounded-3 shadow-sm text-center">
                    <h1 className="display-5 fw-bold text-primary">EventSphere Management</h1>
                    <p className="fs-5 text-muted">
                      Premier Expo & Trade-Show Management Platform.
                    </p>
                  </div>
                }
              />
            </Routes>
          </main>
          <footer className="footer py-3 bg-light text-center border-top">
            <span className="text-muted small">&copy; 2026 EventSphere Management</span>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
