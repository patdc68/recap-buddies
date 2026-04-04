import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../src/theme/Theme'
import RenterRegistration from '../src/registration/RenterRegistration';
import RenterForm from '../src/registration/RenterForm';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/renterRegistration" element={<RenterRegistration />} />
        <Route path="/renterForm" element={<RenterForm />} />
        <Route path="*" element={<Navigate to="/renterRegistration" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;