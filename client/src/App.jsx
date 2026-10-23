import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Landing Page
import LandingPage from './pages/LandingPage';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Dashboard Views
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import CreateTradePage from './pages/dashboard/CreateTradePage';
import TradeHistoryPage from './pages/dashboard/TradeHistoryPage';
import TradeDetailPage from './pages/dashboard/TradeDetailPage';
import CurrencyRiskPage from './pages/dashboard/CurrencyRiskPage';
import ForwardContractsPage from './pages/dashboard/ForwardContractsPage';
import TradeRoutePage from './pages/dashboard/TradeRoutePage';
import WeatherReportsPage from './pages/dashboard/WeatherReportsPage';
import FreightAnalysisPage from './pages/dashboard/FreightAnalysisPage';
import DocumentationPage from './pages/dashboard/DocumentationPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import SettingsPage from './pages/dashboard/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="create-trade" element={<CreateTradePage />} />
          <Route path="trades" element={<TradeHistoryPage />} />
          <Route path="trades/:id" element={<TradeDetailPage />} />
          <Route path="currency-risk" element={<CurrencyRiskPage />} />
          <Route path="forward-contracts" element={<ForwardContractsPage />} />
          <Route path="routes" element={<TradeRoutePage />} />
          <Route path="weather" element={<WeatherReportsPage />} />
          <Route path="freight" element={<FreightAnalysisPage />} />
          <Route path="documents" element={<DocumentationPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
