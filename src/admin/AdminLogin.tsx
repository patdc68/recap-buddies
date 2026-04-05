import React, { useState, type ChangeEvent } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Paper, Chip,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true); setError('');

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError('Incorrect email or password.'); setLoading(false); return; }

    // Verify this user is in RB_USER
    const { data: { user } } = await supabase.auth.getUser();
    const { data: rbUser } = await supabase
      .from('RB_USER').select('*').eq('auth_user_id', user?.id).single();

    if (!rbUser) {
      await supabase.auth.signOut();
      setError('This account does not have admin or staff access.');
      setLoading(false);
      return;
    }

    navigate('/admin/dashboard');
  };

  return (
    <PageLayout>
      <Box sx={{ maxWidth: 420, mx: 'auto', py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 68, height: 68, borderRadius: '18px', mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg, rgba(201,151,58,0.18), rgba(201,151,58,0.06))',
            border: '1px solid rgba(201,151,58,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(201,151,58,0.12)',
          }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 32, color: '#C9973A' }} />
          </Box>
          <Chip
            label="ADMIN PORTAL"
            size="small"
            sx={{ background: 'rgba(201,151,58,0.12)', color: '#9A6F24', border: '1px solid rgba(201,151,58,0.25)', fontFamily: '"Sora", sans-serif', letterSpacing: '0.1em', mb: 1.5 }}
          />
          <Typography variant="h3" sx={{ color: '#1A1008', mb: 0.5 }}>Staff Sign In</Typography>
          <Typography variant="body2" sx={{ color: '#7A6040' }}>
            Access the Recap Buddies management portal.
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: '1px solid rgba(201,151,58,0.15)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}>
            <TextField
              label="Email Address" type="email" fullWidth
              value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(''); }}
            />
            <TextField
              label="Password" type="password" fullWidth
              value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(''); }}
            />
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
            <Button
              variant="contained" size="large" fullWidth onClick={handleLogin} disabled={loading}
              endIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <LoginIcon />}
              sx={{ py: 1.4 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="text" size="small" startIcon={<PersonAddIcon />}
            onClick={() => navigate('/admin/register')}
            sx={{ color: '#9A6F24', fontFamily: '"Sora", sans-serif', fontSize: '0.8rem' }}
          >
            Register new staff account
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default AdminLogin;