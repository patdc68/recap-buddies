import React, { useEffect, useState, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Link,
  Snackbar,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginForm {
  email: string;
  password: string;
}

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

// ─── Component ────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm]       = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors]   = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState('');
  const [resetSuccessOpen, setResetSuccessOpen] = useState(
    Boolean((location.state as { passwordResetSuccess?: boolean } | null)?.passwordResetSuccess)
  );

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setCheckingSession(false);
        return;
      }

      const { data: rbUser } = await supabase
        .from('RB_USER')
        .select('role')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (rbUser?.role === 'admin' || rbUser?.role === 'staff') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    };

    void redirectIfAuthenticated();
  }, [navigate]);

  const onText =
    (field: keyof LoginForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((err) => ({ ...err, [field]: undefined }));
      setAuthError('');
    };

  const validate = (): boolean => {
    const e: LoginErrors = {};
    if (!form.email.trim())
      e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password)
      e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setAuthError(
        error.message.includes('Invalid login')
          ? 'Incorrect email or password. Please try again.'
          : error.message
      );
      setLoading(false);
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <PageLayout>
      {checkingSession ? (
        <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 440,
          mx: 'auto',
          py: 4,
        }}
      >
        {/* Icon badge */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(201,151,58,0.18), rgba(201,151,58,0.06))',
              border: '1px solid rgba(201,151,58,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 4px 20px rgba(201,151,58,0.12)',
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 28, color: '#111111' }} />
          </Box>
          <Typography
            variant="h3"
            sx={{ color: '#111111', lineHeight: 1.2, mb: 0.75 }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Sign in to view your rentals and manage your account.
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            background: '#FFFFFF',
            border: '1px solid rgba(201,151,58,0.15)',
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            boxShadow: '0 4px 24px rgba(201,151,58,0.08)',
          }}
        >
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            onKeyDown={handleKeyDown}
          >
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              autoComplete="email"
              value={form.email}
              onChange={onText('email')}
              error={!!errors.email}
              helperText={errors.email}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              autoComplete="current-password"
              value={form.password}
              onChange={onText('password')}
              error={!!errors.password}
              helperText={errors.password}
            />

            <Box sx={{ textAlign: 'right', mt: -1.5 }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => navigate('/forgot-password')}
                sx={{ color: '#111111', fontSize: '0.875rem', fontWeight: 700 }}
              >
                Forgot password?
              </Link>
            </Box>

            {authError && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {authError}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              endIcon={
                loading ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <LoginIcon />
                )
              }
              sx={{ mt: 0.5, py: 1.4 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(201,151,58,0.12)' }}>
            <Typography sx={{ color: '#666666', fontSize: '0.75rem', px: 1 }}>
              Don't have an account?
            </Typography>
          </Divider>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<PersonAddIcon />}
            onClick={() => navigate('/renterRegistration')}
            sx={{ py: 1.2 }}
          >
            Create Account
          </Button>
        </Box>

        {/* Footer note */}
        <Typography
          sx={{
            textAlign: 'center',
            mt: 3,
            fontSize: '0.75rem',
            color: '#666666',
            fontFamily: '"Sora", sans-serif',
          }}
        >
          By signing in, you agree to our rental terms and conditions.
        </Typography>
      </Box>
      )}
      <Snackbar
        open={resetSuccessOpen}
        autoHideDuration={6000}
        onClose={() => setResetSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setResetSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Password updated successfully. Please sign in again.
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default LoginPage;
