import React, { useMemo, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FaceIcon from '@mui/icons-material/Face';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonIcon from '@mui/icons-material/Person';
import ReplayIcon from '@mui/icons-material/Replay';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CameraCapture from '../components/CameraCapture';
import FileUpload, { type FileUploadResult } from '../components/FileUpload';
import { supabase } from '../service/supabaseClient';
import { createNewRenterFlow } from '../services/publicBookingService';

interface RenterDetails {
  renter_fname: string;
  renter_lname: string;
  mobile_no: string;
  emergency_contact_no: string;
  emergency_contact_person: string;
  emergency_contact_relationship: string;
  email: string;
}

type CaptureField = 'primary_id_front' | 'primary_id_back' | 'secondary_id_front' | 'secondary_id_back' | 'selfie_verification_img';
type Captures = Record<CaptureField, Blob | null>;
type Previews = Record<CaptureField, string | null>;

const EMPTY_DETAILS: RenterDetails = {
  renter_fname: '',
  renter_lname: '',
  mobile_no: '',
  emergency_contact_no: '',
  emergency_contact_person: '',
  emergency_contact_relationship: '',
  email: '',
};

const EMPTY_CAPTURES: Captures = {
  primary_id_front: null,
  primary_id_back: null,
  secondary_id_front: null,
  secondary_id_back: null,
  selfie_verification_img: null,
};

const EMPTY_PREVIEWS: Previews = {
  primary_id_front: null,
  primary_id_back: null,
  secondary_id_front: null,
  secondary_id_back: null,
  selfie_verification_img: null,
};

const STEPS = ['Personal Information', 'Primary ID', 'Secondary ID', 'Proof of Billing', 'Selfie Verification'];

const isValidPhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('63')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits);
};

const CapturePair: React.FC<{
  title: string;
  description: string;
  frontField: CaptureField;
  backField: CaptureField;
  previews: Previews;
  onCapture: (field: CaptureField, blob: Blob | null) => void;
}> = ({ title, description, frontField, backField, previews, onCapture }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 0.5 }}>{title}</Typography>
    <Typography sx={{ color: '#666', mb: 2 }}>{description}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <CameraCapture label="Front" facingMode="environment" onCapture={(blob) => onCapture(frontField, blob)} capturedUrl={previews[frontField]} hint="Keep all text visible and in focus." />
      <CameraCapture label="Back" facingMode="environment" onCapture={(blob) => onCapture(backField, blob)} capturedUrl={previews[backField]} hint="Capture the full back side clearly." />
    </Box>
  </Box>
);

const RenterRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [details, setDetails] = useState<RenterDetails>(EMPTY_DETAILS);
  const [captures, setCaptures] = useState<Captures>(EMPTY_CAPTURES);
  const [previews, setPreviews] = useState<Previews>(EMPTY_PREVIEWS);
  const [billingFile, setBillingFile] = useState<FileUploadResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [termsLoading, setTermsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [done, setDone] = useState(false);

  const setField = (field: keyof RenterDetails) => (event: ChangeEvent<HTMLInputElement>) => {
    setDetails((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const onCapture = (field: CaptureField, blob: Blob | null) => {
    setCaptures((current) => ({ ...current, [field]: blob }));
    setPreviews((current) => {
      if (current[field]) URL.revokeObjectURL(current[field]!);
      return { ...current, [field]: blob ? URL.createObjectURL(blob) : null };
    });
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};
    if (activeStep === 0) {
      if (!details.renter_fname.trim()) nextErrors.renter_fname = 'First name is required.';
      if (!details.renter_lname.trim()) nextErrors.renter_lname = 'Last name is required.';
      if (!isValidPhone(details.mobile_no)) nextErrors.mobile_no = 'Enter a valid Philippine contact number.';
      if (!isValidPhone(details.emergency_contact_no)) nextErrors.emergency_contact_no = 'Enter a valid emergency contact number.';
      if (!details.emergency_contact_person.trim()) nextErrors.emergency_contact_person = 'Emergency contact person is required.';
      if (!details.emergency_contact_relationship.trim()) nextErrors.emergency_contact_relationship = 'Relationship is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) nextErrors.email = 'Enter a valid email address.';
    }
    if (activeStep === 1) {
      if (!captures.primary_id_front) nextErrors.primary_id_front = 'Primary ID front is required.';
      if (!captures.primary_id_back) nextErrors.primary_id_back = 'Primary ID back is required.';
    }
    if (activeStep === 2) {
      if (!captures.secondary_id_front) nextErrors.secondary_id_front = 'Secondary ID front is required.';
      if (!captures.secondary_id_back) nextErrors.secondary_id_back = 'Secondary ID back is required.';
    }
    if (activeStep === 3 && !billingFile) nextErrors.proof_of_billing = 'Proof of billing is required.';
    if (activeStep === 4 && !captures.selfie_verification_img) nextErrors.selfie_verification_img = 'Selfie verification is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const stepError = useMemo(() => Object.values(errors).find(Boolean), [errors]);

  const loadTerms = async () => {
    setTermsLoading(true);
    const { data, error } = await supabase.storage.from('terms_and_condition').download('agreement.md');
    setTermsContent(error || !data ? 'The agreement could not be loaded. Please try again.' : await data.text());
    setTermsLoading(false);
  };

  const openReview = () => {
    if (!validateStep()) return;
    setAcceptedTerms(false);
    setTermsOpen(true);
    if (!termsContent) void loadTerms();
  };

  const submit = async () => {
    if (!acceptedTerms || !billingFile || !captures.primary_id_front || !captures.primary_id_back || !captures.secondary_id_front || !captures.secondary_id_back || !captures.selfie_verification_img) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = new FormData();
      Object.entries(details).forEach(([key, value]) => payload.set(key, value.trim()));
      payload.set('primary_id_front', captures.primary_id_front, 'primary-id-front.jpg');
      payload.set('primary_id_back', captures.primary_id_back, 'primary-id-back.jpg');
      payload.set('secondary_id_front', captures.secondary_id_front, 'secondary-id-front.jpg');
      payload.set('secondary_id_back', captures.secondary_id_back, 'secondary-id-back.jpg');
      payload.set('proof_of_billing', billingFile.blob, billingFile.fileName);
      payload.set('selfie_verification_img', captures.selfie_verification_img, 'selfie-verification.jpg');
      await createNewRenterFlow(payload);
      setTermsOpen(false);
      setDone(true);
    } catch (error) {
      setTermsOpen(false);
      setSubmitError(error instanceof Error ? error.message : 'Unable to save your renter application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageLayout>
        <Box sx={{ maxWidth: 620, mx: 'auto', py: 8, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: '#2E7D32', mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 1 }}>Verification details saved</Typography>
          <Typography sx={{ color: '#666', mb: 3 }}>No account was created. Continue to complete your booking request.</Typography>
          <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/renterForm')}>Continue to Rental Form</Button>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ mb: 4 }}>
        <Chip icon={<HowToRegIcon />} label="NEW RENTER" size="small" sx={{ mb: 1.5, fontWeight: 700, letterSpacing: '0.08em' }} />
        <Typography variant="h3" sx={{ mb: 0.75 }}>Start your renter application</Typography>
        <Typography sx={{ color: '#666' }}>Complete your verification once, then submit your camera booking. No renter login or password is required.</Typography>
        <Button startIcon={<ReplayIcon />} onClick={() => navigate('/returnee')} sx={{ mt: 1, textTransform: 'none' }}>Already rented with us? Use the returnee flow</Button>
      </Box>

      <LinearProgress variant="determinate" value={((activeStep + 1) / STEPS.length) * 100} sx={{ mb: 2, height: 5, borderRadius: 3 }} />
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, display: { xs: 'none', md: 'flex' } }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, border: '1px solid rgba(17,17,17,0.12)', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
          {activeStep === 0 ? <PersonIcon /> : activeStep === 4 ? <FaceIcon /> : <BadgeIcon />}
          <Typography variant="h6">{STEPS[activeStep]}</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {activeStep === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label="First Name" required value={details.renter_fname} onChange={setField('renter_fname')} error={Boolean(errors.renter_fname)} helperText={errors.renter_fname} />
            <TextField label="Last Name" required value={details.renter_lname} onChange={setField('renter_lname')} error={Boolean(errors.renter_lname)} helperText={errors.renter_lname} />
            <TextField label="Email Address" type="email" required value={details.email} onChange={setField('email')} error={Boolean(errors.email)} helperText={errors.email ?? 'Used for booking updates; no account will be created.'} />
            <TextField label="Contact Number" required value={details.mobile_no} onChange={setField('mobile_no')} error={Boolean(errors.mobile_no)} helperText={errors.mobile_no} placeholder="0917 123 4567" />
            <TextField label="Emergency Contact Number" required value={details.emergency_contact_no} onChange={setField('emergency_contact_no')} error={Boolean(errors.emergency_contact_no)} helperText={errors.emergency_contact_no} />
            <TextField label="Emergency Contact Person" required value={details.emergency_contact_person} onChange={setField('emergency_contact_person')} error={Boolean(errors.emergency_contact_person)} helperText={errors.emergency_contact_person} />
            <TextField label="Emergency Contact Relationship" required value={details.emergency_contact_relationship} onChange={setField('emergency_contact_relationship')} error={Boolean(errors.emergency_contact_relationship)} helperText={errors.emergency_contact_relationship} sx={{ gridColumn: { sm: '1 / -1' } }} />
          </Box>
        )}
        {activeStep === 1 && <CapturePair title="Primary Government-Issued ID" description="Take live photos of the front and back. Keep every detail visible." frontField="primary_id_front" backField="primary_id_back" previews={previews} onCapture={onCapture} />}
        {activeStep === 2 && <CapturePair title="Secondary ID" description="Take live photos of the front and back of your secondary ID." frontField="secondary_id_front" backField="secondary_id_back" previews={previews} onCapture={onCapture} />}
        {activeStep === 3 && (
          <FileUpload label="Proof of Billing" result={billingFile} onFile={(file) => { setBillingFile(file); setErrors({}); }} defaultTab="upload" facingMode="environment" hint="Upload an image or PDF dated within the last three months, showing your name and address." />
        )}
        {activeStep === 4 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}><strong>Selfie guidance:</strong> use good lighting, keep your face clear, and do not wear a mask, shades, cap, or any face obstruction.</Alert>
            <CameraCapture label="Selfie Verification" facingMode="user" onCapture={(blob) => onCapture('selfie_verification_img', blob)} capturedUrl={previews.selfie_verification_img} hint="Center your full, unobstructed face in the frame." variant="lightVerification" />
          </Box>
        )}

        {stepError && <Alert severity="error" sx={{ mt: 2 }}>{stepError}</Alert>}
        {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} disabled={activeStep === 0 || submitting} onClick={() => setActiveStep((step) => step - 1)}>Back</Button>
        {activeStep < STEPS.length - 1
          ? <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => { if (validateStep()) setActiveStep((step) => step + 1); }}>Continue</Button>
          : <Button variant="contained" endIcon={<CheckCircleIcon />} onClick={openReview}>Review and Continue</Button>}
      </Box>

      <Dialog open={termsOpen} onClose={() => !submitting && setTermsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Official Rental Contract Agreement</DialogTitle>
        <DialogContent dividers>
          {termsLoading ? <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box> : <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{termsContent}</Typography>}
          <FormControlLabel sx={{ mt: 2 }} control={<Checkbox checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />} label="I have read and agree to the rental contract." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!acceptedTerms || submitting} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}>
            {submitting ? 'Saving…' : 'Accept and Continue'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default RenterRegistration;
