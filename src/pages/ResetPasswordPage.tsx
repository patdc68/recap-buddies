import React, { useEffect, useRef, useState, type ChangeEvent } from 'react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../service/supabaseClient';
import {
  getPasswordResetLoginPath,
  getPasswordResetUserType,
} from '../utils/passwordResetUserType';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

const MIN_PASSWORD_LENGTH = 6;
const MISSING_SESSION_MESSAGE = 'Password reset session is missing or expired. Please request a new reset link.';
const MISSING_RECOVERY_CREDENTIALS_MESSAGE =
  'Password reset link is invalid or missing recovery credentials. Please request a new reset link.';
const INVALID_LINK_MESSAGE = 'Password reset link is invalid or expired. Please request a new reset link.';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userType = getPasswordResetUserType(searchParams.get('type'));
  const loginPath = getPasswordResetLoginPath(userType);
  const [form, setForm] = useState<ResetPasswordForm>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const recoveryCredentialsDetectedRef = useRef(false);
  const recoverySessionReadyRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const markRecoverySessionReady = () => {
      recoverySessionReadyRef.current = true;
      setSessionReady(true);
      setErrorMessage('');
      setCheckingSession(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' && session) {
        recoveryCredentialsDetectedRef.current = true;
        markRecoverySessionReady();
      }
    });

    const initializeRecoverySession = async () => {
      try {
        setCheckingSession(true);
        setSessionReady(false);
        setErrorMessage('');
        recoverySessionReadyRef.current = false;

        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const queryTypes = searchParams.getAll('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        const hasRecoveryCode = Boolean(code);
        const hasRecoveryTokenHash = Boolean(
          tokenHash && (queryTypes.includes('recovery') || queryTypes.includes('admin') || queryTypes.includes('renter'))
        );
        const hasRecoveryHashTokens = Boolean(accessToken && refreshToken && hashType === 'recovery');
        const hasRecoveryCredentials = hasRecoveryCode || hasRecoveryTokenHash || hasRecoveryHashTokens;

        recoveryCredentialsDetectedRef.current = hasRecoveryCredentials;

        if (!hasRecoveryCredentials) {
          if (!mounted) return;

          setSessionReady(false);
          setErrorMessage(MISSING_RECOVERY_CREDENTIALS_MESSAGE);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;
        } else if (tokenHash && hasRecoveryTokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) throw error;
        } else if (accessToken && refreshToken && hashType === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (sessionData.session) {
          markRecoverySessionReady();
        } else {
          setSessionReady(false);
          setErrorMessage(MISSING_SESSION_MESSAGE);
        }
      } catch (err) {
        if (!mounted) return;

        const message = err instanceof Error && err.message ? err.message : INVALID_LINK_MESSAGE;
        setSessionReady(false);
        setErrorMessage(message);
      } finally {
        if (mounted && !recoverySessionReadyRef.current) {
          setCheckingSession(false);
        }
      }
    };

    void initializeRecoverySession();

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

      if (!recoveryCredentialsDetectedRef.current || !recoverySessionReadyRef.current || !sessionReady) {
        setErrorMessage(MISSING_RECOVERY_CREDENTIALS_MESSAGE);
        setSubmitting(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMessage(sessionError.message);
        setSubmitting(false);
        return;
      }

      if (!sessionData.session) {
        setSessionReady(false);
        setErrorMessage(MISSING_SESSION_MESSAGE);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: form.newPassword,
      });

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
    navigate(loginPath, { replace: true });
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
                    <Button color="inherit" size="small" onClick={() => navigate(`/forgot-password?type=${userType}`)}>
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
                <Button color="inherit" size="small" onClick={() => navigate(`/forgot-password?type=${userType}`)}>
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
              onClick={() => navigate(loginPath)}
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
