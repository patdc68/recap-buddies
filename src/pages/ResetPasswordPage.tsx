import React, { useEffect, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../service/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

const MIN_PASSWORD_LENGTH = 8;
const MISSING_SESSION_MESSAGE = 'Password reset session is missing or expired. Please request a new reset link.';
const INVALID_LINK_MESSAGE = 'Password reset link is invalid or expired.';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ResetPasswordForm>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [recoverySession, setRecoverySession] = useState<Session | null>(null);


  useEffect(() => {
    let isActive = true;

    const initializeRecoverySession = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Failed to exchange recovery code:', error);
            if (isActive) setErrorMessage(INVALID_LINK_MESSAGE);
            return;
          }

          if (isActive) setRecoverySession(data.session ?? null);
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const resetType = hashParams.get('type');

        if (accessToken && refreshToken && resetType === 'recovery') {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Failed to initialize recovery session from URL tokens:', error);
            if (isActive) setErrorMessage(INVALID_LINK_MESSAGE);
            return;
          }

          if (isActive) setRecoverySession(data.session ?? null);
        }

        const { data } = await supabase.auth.getSession();

        if (!isActive) return;

        setRecoverySession(data.session ?? null);

        if (!data.session) {
          setErrorMessage(MISSING_SESSION_MESSAGE);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void initializeRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setRecoverySession(session);
        setErrorMessage('');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const validate = (): boolean => {
    const nextErrors: ResetPasswordErrors = {};

    if (!form.newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTextChange =
    (field: keyof ResetPasswordForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: e.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      if (recoverySession) setErrorMessage('');
    };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setRecoverySession(null);
        setErrorMessage(MISSING_SESSION_MESSAGE);
        return;
      }

      setRecoverySession(data.session);

      const { error } = await supabase.auth.updateUser({
        password: form.newPassword,
      });

      if (error) {
        console.error('Failed to update password from recovery session:', error);
        setErrorMessage('Unable to update your password. Please request a new reset link and try again.');
        return;
      }

      setSuccessOpen(true);
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit();
  };

  return (
    <PageLayout>
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
            <LockResetIcon sx={{ fontSize: 30, color: '#111111' }} />
          </Box>
          <Typography variant="h3" sx={{ color: '#111111', lineHeight: 1.2, mb: 0.75 }}>
            Create a new password
          </Typography>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Choose a strong password to secure your Recap Buddies account.
          </Typography>
        </Box>

        <Box
          sx={{
            background: '#FFFFFF',
            border: '1px solid rgba(201,151,58,0.15)',
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            boxShadow: '0 4px 24px rgba(201,151,58,0.08)',
          }}
          onKeyDown={handleKeyDown}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              required
              autoComplete="new-password"
              value={form.newPassword}
              onChange={handleTextChange('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword ?? `Use at least ${MIN_PASSWORD_LENGTH} characters.`}
              disabled={loading || successOpen || !recoverySession}
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleTextChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading || successOpen || !recoverySession}
            />

            {errorMessage ? (
              <Alert
                severity="error"
                action={(
                  <Button color="inherit" size="small" onClick={() => navigate('/forgot-password')}>
                    Request link
                  </Button>
                )}
                sx={{ py: 0.75, alignItems: 'center' }}
              >
                {errorMessage}
              </Alert>
            ) : (
              <Alert severity={recoverySession ? 'success' : 'info'} sx={{ py: 0.75 }}>
                {recoverySession
                  ? 'Secure reset session ready. Enter your new password below.'
                  : 'This page only works after opening the secure reset link from your email.'}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || successOpen || !recoverySession}
              endIcon={
                loading ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{ py: 1.4 }}
            >
              {loading ? 'Preparing…' : 'Update password'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => navigate('/login')}
              sx={{
                color: '#111111',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} />
              Back to login
            </Link>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={successOpen}
        autoHideDuration={1500}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Password updated successfully. Redirecting to login…
        </Alert>
      </Snackbar>

    </PageLayout>
  );
};

export default ResetPasswordPage;
