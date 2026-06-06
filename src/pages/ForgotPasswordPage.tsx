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
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../service/supabaseClient';

const emailPattern = /\S+@\S+\.\S+/;

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = (): boolean => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Email is required');
      return false;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setErrorMessage('');
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccess(true);
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
            <MailOutlineIcon sx={{ fontSize: 28, color: '#111111' }} />
          </Box>
          <Typography variant="h3" sx={{ color: '#111111', lineHeight: 1.2, mb: 0.75 }}>
            Reset your password
          </Typography>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Enter your email address and we’ll send you a secure link to reset your password.
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
              label="Email Address"
              type="email"
              fullWidth
              required
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              error={!!emailError}
              helperText={emailError}
              disabled={loading}
            />

            {success && (
              <Alert severity="success" sx={{ py: 0.75 }}>
                If an account exists for this email, a password reset link has been sent.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              endIcon={
                loading ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <SendIcon />
                )
              }
              sx={{ py: 1.4 }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
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

export default ForgotPasswordPage;
