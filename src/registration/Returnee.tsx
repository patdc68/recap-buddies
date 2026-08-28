import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CameraCapture from '../components/CameraCapture';
import { createReturneeFlow } from '../services/publicBookingService';

const normalizePhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('63')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits);
};

const Returnee: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => {
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
  }, [selfiePreview]);

  const handleContinue = async () => {
    const trimmedName = fullName.trim().replace(/\s+/g, ' ');
    if (trimmedName.split(' ').length < 2) {
      setError('Please enter your complete first and last name.');
      return;
    }
    if (!normalizePhone(contactNumber)) {
      setError('Enter a valid Philippine contact number, such as 0917 123 4567.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!selfie) {
      setError('Selfie verification is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      payload.set('fullName', trimmedName);
      payload.set('contactNumber', contactNumber);
      payload.set('email', email.trim().toLowerCase());
      payload.set('selfie_verification_img', selfie, 'returnee-selfie.jpg');
      await createReturneeFlow(payload);
      navigate('/renterForm');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <Box sx={{ maxWidth: 620, mx: 'auto', py: { xs: 3, md: 7 } }}>
        <Chip icon={<ReplayIcon />} label="RETURNING RENTER" size="small" sx={{ mb: 1.5, fontWeight: 700, letterSpacing: '0.08em' }} />
        <Typography variant="h3" sx={{ mb: 1 }}>Welcome back, Buddy.</Typography>
        <Typography sx={{ color: '#666', mb: 3 }}>
          Enter the name and contact number you used before, then provide an email and a current verification selfie. Previous rentals that predate this system can still continue without the full new-renter document flow.
        </Typography>

        <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid rgba(17,17,17,0.12)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Full Name" required value={fullName} onChange={(event) => { setFullName(event.target.value); setError(''); }} placeholder="Juan Dela Cruz" autoComplete="name" />
            <TextField label="Contact Number" required value={contactNumber} onChange={(event) => { setContactNumber(event.target.value); setError(''); }} placeholder="0917 123 4567" inputMode="tel" autoComplete="tel" />
            <TextField label="Email Address" type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} autoComplete="email" helperText="Used for updates about this booking." />
            <Alert severity="info"><strong>Selfie guidance:</strong> use good lighting, keep your face clear, and do not wear a mask, shades, cap, or any face obstruction.</Alert>
            <CameraCapture
              label="Selfie Verification"
              facingMode="user"
              onCapture={(blob) => {
                setSelfie(blob);
                setSelfiePreview(blob ? URL.createObjectURL(blob) : null);
                setError('');
              }}
              capturedUrl={selfiePreview}
              hint="Center your full, unobstructed face in the frame."
              variant="lightVerification"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" size="large" onClick={handleContinue} disabled={submitting} endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}>
              {submitting ? 'Checking…' : 'Continue to Rental Form'}
            </Button>
          </Box>
        </Paper>

        <Button startIcon={<PersonAddIcon />} onClick={() => navigate('/renter')} sx={{ mt: 2, textTransform: 'none' }}>
          First time renting? Start as a new renter
        </Button>
      </Box>
    </PageLayout>
  );
};

export default Returnee;
