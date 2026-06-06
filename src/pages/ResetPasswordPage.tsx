import React, { useEffect, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../service/supabaseClient';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

const MIN_PASSWORD_LENGTH = 6;
const MISSING_SESSION_MESSAGE = 'Password reset session is missing or expired. Please request a new reset link.';
const INVALID_LINK_MESSAGE = 'Password reset link is invalid or expired. Please request a new reset link.';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ResetPasswordForm>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeRecoverySession = async () => {
      try {
        setCheckingSession(true);
        setSessionReady(false);
        setErrorMessage('');

        console.log('Reset password href:', window.location.href);
        console.log('Reset password search:', window.location.search);
        console.log('Reset password hash:', window.location.hash);

        const searchParams = new URLSearchParams(window.location.search);
        console.log('Reset password search params:', Object.fromEntries(searchParams.entries()));
        const code = searchParams.get('code');
        console.log('Reset password code value:', code);

        if (code) {
          console.log('Recovery code found:', code);

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          console.log('exchangeCodeForSession data:', data);
          console.log('exchangeCodeForSession error:', error);

          if (error) {
            throw error;
          }
        }

        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        console.log('Reset password hash params:', Object.fromEntries(hashParams.entries()));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          console.log('Recovery hash tokens found.');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          console.log('setSession data:', data);
          console.log('setSession error:', error);

          if (error) {
            throw error;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        console.log('Final recovery session:', sessionData.session);
        console.log('Final recovery session error:', sessionError);

        if (!mounted) return;

        if (sessionData.session) {
          setSessionReady(true);
          setErrorMessage('');
        } else {
          setSessionReady(false);
          setErrorMessage(MISSING_SESSION_MESSAGE);
        }
      } catch (err) {
        console.error('Password recovery initialization failed:', err);

        if (!mounted) return;

        setSessionReady(false);
        setErrorMessage(INVALID_LINK_MESSAGE);
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    void initializeRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Reset password auth event:', event, session);

      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
        setErrorMessage('');
        setCheckingSession(false);
      }

      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true);
        setErrorMessage('');
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleTextChange =
    (field: keyof ResetPasswordForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: e.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      if (sessionReady) setErrorMessage('');
    };

  const handleUpdatePassword = async () => {
    try {
      setSubmitting(true);
      setErrorMessage('');
      setErrors({});

      if (!form.newPassword || !form.confirmPassword) {
        setErrors({
          newPassword: !form.newPassword ? 'New password is required' : undefined,
          confirmPassword: !form.confirmPassword ? 'Please confirm your new password' : undefined,
        });
        setErrorMessage('Please enter and confirm your new password.');
        setSubmitting(false);
        return;
      }

      if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
        setErrors({ newPassword: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
        setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        setSubmitting(false);
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match.' });
        setErrorMessage('Passwords do not match.');
        setSubmitting(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      console.log('Session before password update:', sessionData.session);

      if (!sessionData.session) {
        setSessionReady(false);
        setErrorMessage(MISSING_SESSION_MESSAGE);
        setSubmitting(false);
        return;
      }

      console.log('Attempting password update...');

      const { data, error } = await supabase.auth.updateUser({
        password: form.newPassword,
      });
      console.log('Password update data:', data);
      console.log('Password update error:', error);

      if (error) {
        setErrorMessage(error.message || 'Failed to update password.');
        setSubmitting(false);
        return;
      }

      setSuccessDialogOpen(true);
    } catch (err) {
      console.error('Unexpected password update error:', err);
      setErrorMessage('Something went wrong while updating your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && sessionReady && !successDialogOpen) void handleUpdatePassword();
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
          {checkingSession ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 4 }}>
              <CircularProgress size={22} />
              <Typography sx={{ color: '#666666' }}>Verifying password reset link...</Typography>
            </Box>
          ) : sessionReady ? (
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
                disabled={submitting || successDialogOpen}
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
                disabled={submitting || successDialogOpen}
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
                <Alert severity="success" sx={{ py: 0.75 }}>
                  Secure reset session ready. Enter your new password below.
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleUpdatePassword}
                disabled={submitting || successDialogOpen}
                endIcon={
                  submitting ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{ py: 1.4 }}
              >
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </Box>
          ) : (
            <Alert
              severity="error"
              action={(
                <Button color="inherit" size="small" onClick={() => navigate('/forgot-password')}>
                  Request link
                </Button>
              )}
              sx={{ py: 0.75, alignItems: 'center' }}
            >
              {errorMessage || MISSING_SESSION_MESSAGE}
            </Alert>
          )}

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

      <Dialog open={successDialogOpen} onClose={undefined} maxWidth="xs" fullWidth>
        <DialogTitle>Password updated successfully</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your password has been changed. Please sign in using your new password.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleGoToLogin} autoFocus>
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default ResetPasswordPage;
