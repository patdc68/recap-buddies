import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/Theme';
import RenterRegistration      from './registration/RenterRegistration';
import RenterForm              from './registration/RenterForm';
import Returnee                from './registration/Returnee';
import ForgotPasswordPage      from './pages/ForgotPasswordPage';
import ResetPasswordPage       from './pages/ResetPasswordPage';
import AdminLogin              from './admin/AdminLogin';
import AdminRegistration       from './admin/AdminRegistration';
import AdminDashboard          from './admin/AdminDashBoard';
import RenterVerificationPage  from './admin/RenterVerificationPage';
import AdminRevenueAnalyticsPage from './admin/AdminRevenueAnalyticsPage';
import AdminProtectedRoute     from './components/AdminProtectedRoute';
import LandingPage             from './pages/LandingPage';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        {/* ── Public / renter ── */}
        <Route path="/"                   element={<LandingPage />} />
        <Route path="/renter"             element={<RenterRegistration />} />
        <Route path="/returnee"           element={<Returnee />} />
        <Route path="/renterForm"         element={<RenterForm />} />
        <Route path="/login"              element={<Navigate to="/renter" replace />} />
        <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
        <Route path="/reset-password"     element={<ResetPasswordPage />} />
        <Route path="/renterRegistration" element={<Navigate to="/renter" replace />} />

        {/* ── Protected renter ── */}
        <Route path="/dashboard" element={<Navigate to="/renter" replace />} />

        {/* ── Admin / staff ── */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin/register"  element={<AdminRegistration />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminRevenueAnalyticsPage /></AdminProtectedRoute>} />
        <Route path="/admin/verify/:rentalId" element={<AdminProtectedRoute><RenterVerificationPage /></AdminProtectedRoute>} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
