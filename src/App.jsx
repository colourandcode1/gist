import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SimplifiedUpload from "@/components/SimplifiedUpload";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ProfilePage from "@/pages/ProfilePage";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import SessionsPage from "@/pages/SessionsPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import RepositoryPage from "@/pages/RepositoryPage";
import ProblemSpacesPage from "@/pages/ProblemSpacesPage";
import ProblemSpaceDetailPage from "@/pages/ProblemSpaceDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import WorkspacesPage from "@/pages/WorkspacesPage";

// Component to handle catch-all route - always redirect to dashboard
const DefaultRedirect = () => {
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="research-hub-theme">
      <AuthProvider>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <ProtectedRoute>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repository"
            element={
              <ProtectedRoute>
                <RepositoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problem-spaces"
            element={
              <ProtectedRoute>
                <ProblemSpacesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problem-spaces/:id"
            element={
              <ProtectedRoute>
                <ProblemSpaceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <WorkspacesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SimplifiedUpload />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={
            <ProtectedRoute>
              <DefaultRedirect />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;