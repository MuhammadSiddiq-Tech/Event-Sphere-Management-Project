/**
 * @fileoverview Toast Notification Context and Provider.
 * Allows triggering accessible feedback toasts across the application.
 * T-2.12. Design §6, §6.1.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, variant = 'primary', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, variant, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = {
    show: addToast,
    addToast,
    success: (message, title = 'Success') => addToast({ title, message, variant: 'success' }),
    error: (message, title = 'Error') => addToast({ title, message, variant: 'danger' }),
    info: (message, title = 'Information') => addToast({ title, message, variant: 'info' }),
    warning: (message, title = 'Warning') => addToast({ title, message, variant: 'warning' }),
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 1100 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => removeToast(toast.id)}
            delay={toast.duration}
            autohide
            bg={toast.variant}
            className="text-white shadow-sm border-0 mb-2"
          >
            {toast.title && (
              <Toast.Header closeButton className="text-dark">
                <strong className="me-auto">{toast.title}</strong>
              </Toast.Header>
            )}
            <Toast.Body className={toast.title ? 'text-dark bg-white rounded-bottom' : ''}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      addToast: () => {},
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
