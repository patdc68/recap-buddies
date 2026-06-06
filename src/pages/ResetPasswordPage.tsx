import React, { useState, type ChangeEvent } from 'react';
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

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

const MIN_PASSWORD_LENGTH = 8;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ResetPasswordForm>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

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
      setErrorMessage('');
    };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.updateUser({
      password: form.newPassword,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessOpen(true);

    window.setTimeout(() => {
      void (async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      })();
    }, 1500);
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
              disabled={loading}
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
              disabled={loading}
            />

            <Alert severity="info" sx={{ py: 0.75 }}>
              This page only works after opening the secure reset link from your email.
            </Alert>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || successOpen}
              endIcon={
                loading ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{ py: 1.4 }}
            >
              {loading ? 'Updating…' : 'Update password'}
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

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default ResetPasswordPage;
