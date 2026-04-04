import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../src/theme/Theme';
import RenterRegistration from '../src/registration/RenterRegistration';
import RenterForm from '../src/registration/RenterForm';
import LoginPage from '../src/registration/Loginpage';
import Dashboard from '../src/registration/Dashboard';
import ProtectedRoute from '../src/components/ProtectedRoute';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/renterRegistration" element={<RenterRegistration />} />

        {/* Protected routes — redirect to /login if not authed */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/renterForm"
          element={
            <ProtectedRoute>
              <RenterForm />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;