import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppContent from './components/AppContent';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  );
}