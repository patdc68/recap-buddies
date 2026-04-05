import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { supabase } from '../service/supabaseClient';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }

      // Verify user exists in RB_USER (admin or staff)
      const { data } = await supabase
        .from('RB_USER')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      setAuthed(!!data);
      setChecking(false);
    };
    check();
  }, []);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0F1E' }}>
        <CircularProgress sx={{ color: '#C9973A' }} />
      </Box>
    );
  }

  return authed ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;