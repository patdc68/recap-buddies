import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/Theme';
import RenterRegistration      from './registration/RenterRegistration';
import RenterForm              from './registration/RenterForm';
import LoginPage               from './registration/LoginPage';
import ForgotPasswordPage      from './pages/ForgotPasswordPage';
import ResetPasswordPage       from './pages/ResetPasswordPage';
import Dashboard               from './registration/Dashboard';
import AdminLogin              from './admin/AdminLogin';
import AdminRegistration       from './admin/AdminRegistration';
import AdminDashboard          from './admin/AdminDashBoard';
import RenterVerificationPage  from './admin/RenterVerificationPage';
import AdminRevenueAnalyticsPage from './admin/AdminRevenueAnalyticsPage';
import ProtectedRoute          from './components/ProtectedRoute';
import AdminProtectedRoute     from './components/AdminProtectedRoute';
import PublicFooter            from './components/PublicFooter';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        {/* ── Public / renter ── */}
        <Route path="/login"              element={<><LoginPage /><PublicFooter /></>} />
        <Route path="/forgot-password"    element={<><ForgotPasswordPage /><PublicFooter /></>} />
        <Route path="/reset-password"     element={<><ResetPasswordPage /><PublicFooter /></>} />
        <Route path="/renterRegistration" element={<><RenterRegistration /><PublicFooter /></>} />

        {/* ── Protected renter ── */}
        <Route path="/dashboard"  element={<ProtectedRoute><><Dashboard /><PublicFooter /></></ProtectedRoute>} />
        <Route path="/renterForm" element={<ProtectedRoute><><RenterForm /><PublicFooter /></></ProtectedRoute>} />

        {/* ── Admin / staff ── */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin/register"  element={<AdminRegistration />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminRevenueAnalyticsPage /></AdminProtectedRoute>} />
        <Route path="/admin/verify/:rentalId" element={<AdminProtectedRoute><RenterVerificationPage /></AdminProtectedRoute>} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
