import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Chip,
  LinearProgress,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  type SelectChangeEvent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import FaceIcon from '@mui/icons-material/Face';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbSelfieVerificationInst } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';
import CameraCapture from '../components/CameraCapture';
import FileUpload, { type FileUploadResult } from '../components/FileUpload';
import rentalContractAgreement from '../../official rental contract agreement.md?raw';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistrationForm {
  renter_fname: string;
  renter_lname: string;
  mobile_no: string;
  emergency_contact_no: string;
  email: string;
  password: string;
  confirmPassword: string;
  selfie_verification_id: string;
}

type ImageField =
  | 'primary_id_front'
  | 'primary_id_back'
  | 'secondary_id_front'
  | 'secondary_id_back'
  | 'proof_of_billing'
  | 'selfie_verification_img';

type BlobMap    = Record<ImageField, Blob | null>;
type PreviewMap = Record<ImageField, string | null>;
type FormErrors = Partial<Record<keyof RegistrationForm | ImageField, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'verification-images';

const STEPS = [
  { label: 'Personal Info',       icon: <PersonIcon /> },
  { label: 'Account Setup',       icon: <PersonIcon /> },
  { label: 'Primary ID',          icon: <BadgeIcon /> },
  { label: 'Secondary ID',        icon: <BadgeIcon /> },
  { label: 'Proof of Billing',    icon: <BadgeIcon /> },
  { label: 'Selfie Verification', icon: <FaceIcon /> },
];

const INIT_FORM: RegistrationForm = {
  renter_fname: '', renter_lname: '', mobile_no: '',
  emergency_contact_no: '', email: '', password: '',
  confirmPassword: '', selfie_verification_id: '',
};

const INIT_BLOBS: BlobMap = {
  primary_id_front: null, primary_id_back: null,
  secondary_id_front: null, secondary_id_back: null,
  proof_of_billing: null, selfie_verification_img: null,
};

const INIT_PREVIEWS: PreviewMap = {
  primary_id_front: null, primary_id_back: null,
  secondary_id_front: null, secondary_id_back: null,
  proof_of_billing: null, selfie_verification_img: null,
};

// ─── Layout primitives (replaces Grid entirely) ───────────────────────────────

/**
 * Row: horizontal flex container that wraps on small screens.
 * gap prop maps to MUI spacing (× 8px).
 */
const Row: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 2.5 }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap }}>
    {children}
  </Box>
);

/**
 * Col: flex child.
 *  - half=false (default) → full width
 *  - half=true            → 50% on sm+, 100% on xs
 */
const Col: React.FC<{ children: React.ReactNode; half?: boolean }> = ({ children, half = false }) => (
  <Box
    sx={{
      flex: '1 1 auto',
      width: half ? { xs: '100%', sm: 'calc(50% - 10px)' } : '100%',
      maxWidth: half ? { xs: '100%', sm: 'calc(50% - 10px)' } : '100%',
      minWidth: 0,
    }}
  >
    {children}
  </Box>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: '#C9973A', letterSpacing: '0.1em', mb: 1.5, display: 'block' }}>
    {children}
  </Typography>
);

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

interface StepPersonalInfoProps {
  form: RegistrationForm;
  onText: (field: keyof RegistrationForm) => (e: ChangeEvent<HTMLInputElement>) => void;
  errors: FormErrors;
}

const StepPersonalInfo: React.FC<StepPersonalInfoProps> = ({ form, onText, errors }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <SectionLabel>Tell us your name</SectionLabel>
    <Row>
      <Col half>
        <TextField
          label="First Name" fullWidth required
          value={form.renter_fname} onChange={onText('renter_fname')}
          error={!!errors.renter_fname} helperText={errors.renter_fname}
        />
      </Col>
      <Col half>
        <TextField
          label="Last Name" fullWidth required
          value={form.renter_lname} onChange={onText('renter_lname')}
          error={!!errors.renter_lname} helperText={errors.renter_lname}
        />
      </Col>
      <Col half>
        <TextField
          label="Mobile Number" fullWidth required placeholder="09XXXXXXXXX"
          value={form.mobile_no} onChange={onText('mobile_no')}
          error={!!errors.mobile_no} helperText={errors.mobile_no}
        />
      </Col>
      <Col half>
        <TextField
          label="Emergency Contact Number" fullWidth required placeholder="09XXXXXXXXX"
          value={form.emergency_contact_no} onChange={onText('emergency_contact_no')}
          error={!!errors.emergency_contact_no} helperText={errors.emergency_contact_no}
        />
      </Col>
    </Row>
  </Box>
);

// ─── Step 2: Account Setup ────────────────────────────────────────────────────

const StepAccountSetup: React.FC<StepPersonalInfoProps> = ({ form, onText, errors }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <SectionLabel>Create your account credentials</SectionLabel>
    <TextField
      label="Email Address" type="email" fullWidth required
      value={form.email} onChange={onText('email')}
      error={!!errors.email} helperText={errors.email}
    />
    <Row>
      <Col half>
        <TextField
          label="Password" type="password" fullWidth required
          value={form.password} onChange={onText('password')}
          error={!!errors.password}
          helperText={errors.password ?? 'Minimum 8 characters'}
        />
      </Col>
      <Col half>
        <TextField
          label="Confirm Password" type="password" fullWidth required
          value={form.confirmPassword} onChange={onText('confirmPassword')}
          error={!!errors.confirmPassword} helperText={errors.confirmPassword}
        />
      </Col>
    </Row>
  </Box>
);

// ─── Steps 3–5: ID / Billing photos ──────────────────────────────────────────

interface IDStepProps {
  previews: PreviewMap;
  onCapture: (field: ImageField, blob: Blob | null) => void;
}

const StepPrimaryID: React.FC<IDStepProps> = ({ previews, onCapture }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Box>
      <SectionLabel>Primary Government-Issued ID</SectionLabel>
      <Typography variant="body2">
        Valid government ID (passport, driver's licence, PhilSys, etc.).
        Photos must be taken live — no uploads allowed.
      </Typography>
    </Box>
    <Row>
      <Col half>
        <CameraCapture
          label="Front of Primary ID" facingMode="environment"
          onCapture={(blob) => onCapture('primary_id_front', blob)}
          capturedUrl={previews.primary_id_front}
          hint="Place the ID flat; ensure all text is visible and in focus."
        />
      </Col>
      <Col half>
        <CameraCapture
          label="Back of Primary ID" facingMode="environment"
          onCapture={(blob) => onCapture('primary_id_back', blob)}
          capturedUrl={previews.primary_id_back}
          hint="Capture the back side clearly."
        />
      </Col>
    </Row>
  </Box>
);

const StepSecondaryID: React.FC<IDStepProps> = ({ previews, onCapture }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Box>
      <SectionLabel>Secondary ID</SectionLabel>
      <Typography variant="body2">SSS, TIN card, company ID, etc. — live capture only.</Typography>
    </Box>
    <Row>
      <Col half>
        <CameraCapture
          label="Front of Secondary ID" facingMode="environment"
          onCapture={(blob) => onCapture('secondary_id_front', blob)}
          capturedUrl={previews.secondary_id_front}
        />
      </Col>
      <Col half>
        <CameraCapture
          label="Back of Secondary ID" facingMode="environment"
          onCapture={(blob) => onCapture('secondary_id_back', blob)}
          capturedUrl={previews.secondary_id_back}
        />
      </Col>
    </Row>
  </Box>
);

interface StepBillingProps {
  billingFile: FileUploadResult | null;
  onBillingFile: (result: FileUploadResult | null) => void;
}

const StepBilling: React.FC<StepBillingProps> = ({ billingFile, onBillingFile }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Box>
      <SectionLabel>Proof of Billing</SectionLabel>
      <Typography variant="body2">
        Recent utility bill or bank statement (within 3 months) showing your name and address.
        You may upload an image or PDF, or take a live photo.
      </Typography>
    </Box>
    <FileUpload
      label="Proof of Billing Document"
      onFile={onBillingFile}
      result={billingFile}
      hint="Ensure your name, address, and billing date are clearly visible."
      defaultTab="upload"
      facingMode="environment"
    />
  </Box>
);

// ─── Step 6: Selfie Verification ─────────────────────────────────────────────

interface StepSelfieProps {
  selfieInstructions: RbSelfieVerificationInst[];
  form: RegistrationForm;
  onSelect: (e: SelectChangeEvent) => void;
  errors: FormErrors;
  previews: PreviewMap;
  onCapture: (field: ImageField, blob: Blob | null) => void;
}

const StepSelfie: React.FC<StepSelfieProps> = ({
  selfieInstructions, form, onSelect, errors, previews, onCapture,
}) => {
  const selected = selfieInstructions.find((i) => i.id === form.selfie_verification_id);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <SectionLabel>Selfie Verification</SectionLabel>
        <Typography variant="body2">
          Choose a verification instruction and take a live selfie following the given pose.
        </Typography>
      </Box>

      <FormControl fullWidth error={!!errors.selfie_verification_id}>
        <InputLabel>Select Verification Instruction</InputLabel>
        <Select
          value={form.selfie_verification_id}
          onChange={onSelect}
          label="Select Verification Instruction"
        >
          {selfieInstructions.map((inst) => (
            <MenuItem key={inst.id} value={inst.id}>
              <Box>
                <Typography sx={{ fontWeight: 600, color: '#C9973A', fontFamily: '"Sora", sans-serif', fontSize: '0.9rem' }}>
                  {inst.instruction_name}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                  {inst.instruction_desc}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
        {errors.selfie_verification_id && (
          <FormHelperText>{errors.selfie_verification_id}</FormHelperText>
        )}
      </FormControl>

      {selected && (
        <Alert
          severity="warning"
          sx={{
            background: 'rgba(201,151,58,0.10)',
            border: '1px solid rgba(201,151,58,0.35)',
            color: '#9A6F24',
            '& .MuiAlert-icon': { color: '#C9973A' },
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>{selected.instruction_name}</Typography>
          <Typography variant="body2">{selected.instruction_desc}</Typography>
        </Alert>
      )}

      <CameraCapture
        label="Selfie with Required Pose"
        facingMode="user"
        onCapture={(blob) => onCapture('selfie_verification_img', blob)}
        capturedUrl={previews.selfie_verification_img}
        hint={selected ? `Pose: ${selected.instruction_desc}` : 'Please select an instruction first.'}
      />
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RenterRegistration: React.FC = () => {
  const navigate = useNavigate();

  // All hooks at the top — never after a conditional return (Rules of Hooks)
  const [activeStep, setActiveStep]                 = useState(0);
  const [form, setForm]                             = useState<RegistrationForm>(INIT_FORM);
  const [blobs, setBlobs]                           = useState<BlobMap>(INIT_BLOBS);
  const [previews, setPreviews]                     = useState<PreviewMap>(INIT_PREVIEWS);
  const [billingFile, setBillingFile]               = useState<FileUploadResult | null>(null);
  const [errors, setErrors]                         = useState<FormErrors>({});
  const [selfieInstructions, setSelfieInstructions] = useState<RbSelfieVerificationInst[]>([]);
  const [submitting, setSubmitting]                 = useState(false);
  const [submitError, setSubmitError]               = useState('');
  const [done, setDone]                             = useState(false);
  const [countdown, setCountdown]                   = useState(3);
  const [termsOpen, setTermsOpen]                   = useState(false);
  const [acceptedTerms, setAcceptedTerms]           = useState(false);

  useEffect(() => {
    supabase
      .from('RB_SELFIE_VERIFICATION_INST')
      .select('*')
      .then(({ data }) => {
        if (data) setSelfieInstructions(data as RbSelfieVerificationInst[]);
      });
  }, []);

  // Countdown redirect — declared before any conditional return
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { navigate('/renterForm'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const onText =
    (field: keyof RegistrationForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((err) => ({ ...err, [field]: undefined }));
    };

  const onSelfieSelect = (e: SelectChangeEvent) => {
    setForm((f) => ({ ...f, selfie_verification_id: e.target.value }));
    setErrors((err) => ({ ...err, selfie_verification_id: undefined }));
  };

  const onCapture = useCallback((field: ImageField, blob: Blob | null) => {
    setBlobs((b) => ({ ...b, [field]: blob }));
    setPreviews((p) => ({ ...p, [field]: blob ? URL.createObjectURL(blob) : null }));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (activeStep === 0) {
      if (!form.renter_fname.trim())         e.renter_fname         = 'First name is required';
      if (!form.renter_lname.trim())         e.renter_lname         = 'Last name is required';
      if (!form.mobile_no.trim())            e.mobile_no            = 'Mobile number is required';
      else if (!/^09\d{9}$/.test(form.mobile_no)) e.mobile_no      = 'Enter a valid PH number (09XXXXXXXXX)';
      if (!form.emergency_contact_no.trim()) e.emergency_contact_no = 'Emergency contact is required';
      else if (!/^09\d{9}$/.test(form.emergency_contact_no)) e.emergency_contact_no = 'Enter a valid PH number';
    }
    if (activeStep === 1) {
      if (!form.email.trim())            e.email           = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email   = 'Enter a valid email address';
      if (!form.password)                e.password        = 'Password is required';
      else if (form.password.length < 8) e.password        = 'Password must be at least 8 characters';
      if (!form.confirmPassword)         e.confirmPassword = 'Please confirm your password';
      else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (activeStep === 2) {
      if (!blobs.primary_id_front) e.primary_id_front = 'Front photo of primary ID is required';
      if (!blobs.primary_id_back)  e.primary_id_back  = 'Back photo of primary ID is required';
    }
    if (activeStep === 3) {
      if (!blobs.secondary_id_front) e.secondary_id_front = 'Front photo of secondary ID is required';
      if (!blobs.secondary_id_back)  e.secondary_id_back  = 'Back photo of secondary ID is required';
    }
    if (activeStep === 4) {
      if (!billingFile) e.proof_of_billing = 'Proof of billing is required';
    }
    if (activeStep === 5) {
      if (!form.selfie_verification_id)   e.selfie_verification_id  = 'Please select an instruction';
      if (!blobs.selfie_verification_img) e.selfie_verification_img = 'Selfie photo is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) setActiveStep((s) => s + 1); };
  const handleBack = () => setActiveStep((s) => s - 1);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');

    const uploadedPaths: string[] = [];

    try {
      setSubmitError('Step 1/3: Creating account…');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      const auth_user_id = authData.user?.id;
      if (!auth_user_id) throw new Error(
        'No user ID returned. Make sure "Enable email confirmations" is OFF in Supabase → Authentication → Settings.'
      );

      setSubmitError('Step 2/3: Uploading verification images…');
      const ts = Date.now();
      const safeEmail = form.email.replace(/[@.]/g, '_');

      const upload = async (blob: Blob | null, name: string): Promise<string | null> => {
        if (!blob) return null;
        const path = `${safeEmail}/${ts}_${name}.jpg`;
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw new Error(`Upload failed for "${name}": ${error.message}`);
        uploadedPaths.push(data.path);
        return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
      };

      const [
        primary_id_front, primary_id_back,
        secondary_id_front, secondary_id_back,
        proof_of_billing, selfie_verification_img,
      ] = await Promise.all([
        upload(blobs.primary_id_front,       'primary_front'),
        upload(blobs.primary_id_back,        'primary_back'),
        upload(blobs.secondary_id_front,     'secondary_front'),
        upload(blobs.secondary_id_back,      'secondary_back'),
        billingFile ? (async () => {
          const ext = billingFile.fileType === 'pdf' ? 'pdf' : 'jpg';
          const billingPath = `${safeEmail}/${ts}_billing.${ext}`;
          const { data: billingData, error: billingError } = await supabase.storage
            .from(BUCKET)
            .upload(billingPath, billingFile.blob, { contentType: billingFile.mimeType, upsert: true });
          if (billingError) throw new Error(`Upload failed for "billing": ${billingError.message}`);
          uploadedPaths.push(billingData.path);
          return supabase.storage.from(BUCKET).getPublicUrl(billingData.path).data.publicUrl;
        })() : Promise.resolve(null),
        upload(blobs.selfie_verification_img,'selfie'),
      ]);

      setSubmitError('Step 3/3: Saving your information…');
      const { error: insertError } = await supabase.from('RB_RENTER').insert({
        renter_fname: form.renter_fname,
        renter_lname: form.renter_lname,
        mobile_no: form.mobile_no,
        emergency_contact_no: form.emergency_contact_no,
        email: form.email,
        auth_user_id,
        primary_id_front, primary_id_back,
        secondary_id_front, secondary_id_back,
        proof_of_billing,
        selfie_verification_id: form.selfie_verification_id,
        selfie_verification_img,
      });

      if (insertError) throw new Error(
        `DB insert failed (${insertError.code}): ${insertError.message}` +
        (insertError.details ? ` | ${insertError.details}` : '') +
        (insertError.hint    ? ` | Hint: ${insertError.hint}` : '')
      );

      setSubmitError('');
      setDone(true);

    } catch (err: unknown) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths).catch(() => null);
      }
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAndSubmit = () => {
    if (!validate()) return;
    setTermsOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!acceptedTerms) return;
    setTermsOpen(false);
    await handleSubmit();
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const progress = (activeStep / STEPS.length) * 100;
  const imageError =
    errors.primary_id_front   ?? errors.primary_id_back    ??
    errors.secondary_id_front ?? errors.secondary_id_back  ??
    (billingFile ? undefined : errors.proof_of_billing) ?? errors.selfie_verification_img;

  // ── Success screen ────────────────────────────────────────────────────────────

  if (done) {
    return (
      <PageLayout>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: '#69DB7C', mb: 2 }} />
          <Typography variant="h3" sx={{ color: '#1A1008', mb: 1 }}>Registration Complete!</Typography>
          <Typography variant="body1" sx={{ color: '#7A6040', mb: 2 }}>Your account has been created successfully.</Typography>
          <Typography variant="body1" sx={{ color: '#C9973A', mb: 3, fontWeight: 600 }}>
            Redirecting to rental form in {countdown}…
          </Typography>
          <CircularProgress sx={{ color: '#C9973A' }} size={32} />
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => navigate('/renterForm')}>Go Now</Button>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      {/* Heading */}
      <Box sx={{ mb: 4 }}>
        <Chip
          icon={<HowToRegIcon sx={{ fontSize: '0.9rem !important' }} />}
          label="RENTER REGISTRATION"
          size="small"
          sx={{
            background: 'rgba(201,151,58,0.15)', color: '#C9973A',
            border: '1px solid rgba(201,151,58,0.25)',
            fontFamily: '"Sora", sans-serif', letterSpacing: '0.08em', mb: 1.5,
          }}
        />
        <Typography variant="h3" sx={{ color: '#1A1008', lineHeight: 1.2, mb: 0.5 }}>
          Create Your Renter Account
        </Typography>
        <Typography variant="body1" sx={{ color: '#7A6040' }}>
          Complete all steps to verify your identity and access our rental service.
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ color: '#7A6040', fontSize: '0.8rem' }}>Step {activeStep + 1} of {STEPS.length}</Typography>
          <Typography sx={{ color: '#C9973A', fontSize: '0.8rem' }}>{Math.round(progress)}% complete</Typography>
        </Box>
        <LinearProgress
          variant="determinate" value={progress}
          sx={{
            height: 4, borderRadius: 2, background: 'rgba(201,151,58,0.10)',
            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #C9973A, #9A6F24)', borderRadius: 2 },
          }}
        />
      </Box>

      {/* Stepper (desktop) */}
      <Stepper
        activeStep={activeStep} alternativeLabel
        sx={{ mb: 4, display: { xs: 'none', md: 'flex' }, '& .MuiStepConnector-line': { borderColor: 'rgba(201,151,58,0.15)' } }}
      >
        {STEPS.map((s, i) => (
          <Step key={s.label} completed={i < activeStep}>
            <StepLabel>{s.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content card */}
      <Paper
        elevation={0}
        sx={{ p: { xs: 2.5, sm: 4 }, background: '#FFFFFF', border: '1px solid rgba(201,151,58,0.15)', borderRadius: 3, mb: 2 }}
      >
        {/* Step header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(201,151,58,0.15), rgba(201,151,58,0.05))',
            border: '1px solid rgba(201,151,58,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9973A',
          }}>
            {STEPS[activeStep].icon}
          </Box>
          <Box>
            <Typography sx={{ color: '#7A6040', fontSize: '0.78rem' }}>Step {activeStep + 1}</Typography>
            <Typography variant="h6" sx={{ color: '#1A1008', lineHeight: 1 }}>{STEPS[activeStep].label}</Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(201,151,58,0.15)', mb: 3 }} />

        {activeStep === 0 && <StepPersonalInfo form={form} onText={onText} errors={errors} />}
        {activeStep === 1 && <StepAccountSetup form={form} onText={onText} errors={errors} />}
        {activeStep === 2 && <StepPrimaryID   previews={previews} onCapture={onCapture} />}
        {activeStep === 3 && <StepSecondaryID previews={previews} onCapture={onCapture} />}
        {activeStep === 4 && <StepBilling billingFile={billingFile} onBillingFile={setBillingFile} />}
        {activeStep === 5 && (
          <StepSelfie
            selfieInstructions={selfieInstructions} form={form}
            onSelect={onSelfieSelect} errors={errors}
            previews={previews} onCapture={onCapture}
          />
        )}

        {imageError && <Alert severity="error" sx={{ mt: 2 }}>{imageError}</Alert>}
        {submitError && (
          <Alert
            severity={submitError.startsWith('Step ') ? 'info' : 'error'}
            sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {submitError}
          </Alert>
        )}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined" startIcon={<ArrowBackIcon />}
          onClick={handleBack} disabled={activeStep === 0 || submitting}
          sx={{ minWidth: 120 }}
        >
          Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext} sx={{ minWidth: 160 }}>
            Continue
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={submitting ? <CircularProgress size={16} sx={{ color: '#0A0F1E' }} /> : <CheckCircleIcon />}
            onClick={handleReviewAndSubmit} disabled={submitting} sx={{ minWidth: 200 }}
          >
            {submitting ? 'Submitting…' : 'Complete Registration'}
          </Button>
        )}
      </Box>

      <Dialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Official Rental Contract Agreement</DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', color: '#3A2A12', lineHeight: 1.7, mb: 2 }}
          >
            {rentalContractAgreement}
          </Typography>
          <FormControlLabel
            control={(
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
            )}
            label="By checking this box, you acknowledge that you have read and agreed to all terms & will proceed to the collection of your data under DATA PRIVACY ACT of 2012 of the Republic of the Philippines with Krystal Gutierrez of Recap Buddies PH to facilitate your reservations."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSubmit}
            disabled={!acceptedTerms || submitting}
          >
            Agree & Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile step dots */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', gap: 0.75, mt: 3 }}>
        {STEPS.map((_, i) => (
          <Box key={i} sx={{
            width: i === activeStep ? 20 : 8, height: 8, borderRadius: 4,
            background: i < activeStep ? '#69DB7C' : i === activeStep ? '#C9973A' : 'rgba(201,151,58,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </Box>
    </PageLayout>
  );
};

export default RenterRegistration;
