/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Attendance } from './pages/Attendance';
import { Premises } from './pages/Premises';
import { Logs } from './pages/Logs';
import { Students } from './pages/Students';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('accessToken');
  const role = localStorage.getItem('userRole');
  const location = useLocation();

  if (!token || role !== 'ADMIN') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark text-on-surface">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <TopBar />
        <main className="flex-1 mt-20 p-8 sm:p-10 font-sans">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute><Overview /></ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute><Attendance /></ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute><Students /></ProtectedRoute>
          } />
          
          <Route path="/premises" element={
            <ProtectedRoute><Premises /></ProtectedRoute>
          } />
          
          <Route path="/logs" element={
            <ProtectedRoute><Logs /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}