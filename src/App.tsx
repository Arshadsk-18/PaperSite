import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar, Footer, SupabaseBanner } from './components/ui';
import {
  LandingPage,
  LoginPage,
  DashboardPage,
  EditorPage,
  BookingsPage,
  PublicSitePage,
  DesignSystemPage,
} from './pages';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-white text-[#14221B] font-sans antialiased selection:bg-[#D6F26B] selection:text-[#1F3D33]">
          {/* Unconfigured environment banner */}
          <SupabaseBanner />

          {/* Navigation header */}
          <Navbar />

          {/* Main content routes */}
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected user areas */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor"
                element={
                  <ProtectedRoute>
                    <EditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/:id"
                element={
                  <ProtectedRoute>
                    <EditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <BookingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Public customer-facing website */}
              <Route path="/site/:slug" element={<PublicSitePage />} />

              {/* Design system showcase */}
              <Route path="/design" element={<DesignSystemPage />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
