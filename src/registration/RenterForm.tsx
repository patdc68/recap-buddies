import React, { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import StorefrontIcon from '@mui/icons-material/Storefront';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import FileUpload, { type FileUploadResult } from '../components/FileUpload';
import { formatShortId } from '../utils/formatShortId';
import {
  getPublicBookingSession,
  loadPublicCatalog,
  submitPublicBooking,
  type PublicBookingSession,
  type PublicCatalogBranch,
  type PublicCatalogDevice,
} from '../services/publicBookingService';

type DeliveryMode = 'hub' | 'delivery';
type LocUsage = 'domestic' | 'international';

interface RentalDraft {
  deviceIds: string[];
  rentDateStart: Dayjs | null;
  rentDateEnd: Dayjs | null;
  pickupTime: Dayjs | null;
  returnTime: Dayjs | null;
  locUsage: LocUsage;
  username: string;
  discountCode: string;
  refundInfo: string;
  pickupMode: DeliveryMode;
  pickupHub: string;
  deliveryAddress: string;
  returnMode: DeliveryMode;
  returnHub: string;
  returnAddress: string;
}

const STEPS = ['Camera Selection', 'Rental Period', 'Purpose & Contact', 'Pickup & Return', 'Review & Submit'];

const INITIAL_DRAFT: RentalDraft = {
  deviceIds: [''],
  rentDateStart: null,
  rentDateEnd: null,
  pickupTime: null,
  returnTime: null,
  locUsage: 'domestic',
  username: '',
  discountCode: '',
  refundInfo: '',
  pickupMode: 'hub',
  pickupHub: '',
  deliveryAddress: '',
  returnMode: 'hub',
  returnHub: '',
  returnAddress: '',
};

const ReviewRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
    <Typography sx={{ color: '#666', fontSize: '0.82rem' }}>{label}</Typography>
    <Typography component="div" sx={{ textAlign: 'right', fontWeight: 600, fontSize: '0.84rem' }}>{value || '—'}</Typography>
  </Box>
);

const RenterForm: React.FC = () => {
  const navigate = useNavigate();
  const [session] = useState<PublicBookingSession | null>(() => getPublicBookingSession());
  const [draft, setDraft] = useState<RentalDraft>(INITIAL_DRAFT);
  const [activeStep, setActiveStep] = useState(0);
  const [purposeFile, setPurposeFile] = useState<FileUploadResult | null>(null);
  const [devices, setDevices] = useState<PublicCatalogDevice[]>([]);
  const [branches, setBranches] = useState<PublicCatalogBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedRentalId, setSubmittedRentalId] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState(false);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    loadPublicCatalog()
      .then((catalog) => {
        setDevices(catalog.devices.filter((device) => device.availableCount > 0));
        setBranches(catalog.branches);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Unable to load the rental catalog.'))
      .finally(() => setLoading(false));
  }, [session]);

  const update = <Key extends keyof RentalDraft>(key: Key, value: RentalDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const selectedDevices = useMemo(() => draft.deviceIds.map((id) => devices.find((device) => device.id === id)).filter((device): device is PublicCatalogDevice => Boolean(device)), [devices, draft.deviceIds]);
  const validateStep = () => {
    const next: Record<string, string> = {};
    if (activeStep === 0) {
      if (draft.deviceIds.some((id) => !id)) next.deviceIds = 'Select a camera for every row.';
      const selectedCounts = new Map<string, number>();
      draft.deviceIds.forEach((id) => selectedCounts.set(id, (selectedCounts.get(id) ?? 0) + 1));
      for (const [id, count] of selectedCounts) {
        const available = devices.find((device) => device.id === id)?.availableCount ?? 0;
        if (count > available) next.deviceIds = 'The selected quantity exceeds current availability for one camera model.';
      }
    }
    if (activeStep === 1) {
      if (!draft.rentDateStart) next.rentDateStart = 'Start date is required.';
      if (!draft.rentDateEnd) next.rentDateEnd = 'End date is required.';
      if (draft.rentDateStart && draft.rentDateStart.isBefore(dayjs().startOf('day'))) next.rentDateStart = 'Start date cannot be in the past.';
      if (draft.rentDateStart && draft.rentDateEnd && draft.rentDateEnd.isBefore(draft.rentDateStart, 'day')) next.rentDateEnd = 'End date must be on or after the start date.';
      if (draft.rentDateStart && draft.rentDateEnd && draft.rentDateEnd.diff(draft.rentDateStart, 'day') > 60) next.rentDateEnd = 'Rental period cannot exceed 60 days.';
    }
    if (activeStep === 2) {
      if (!purposeFile) next.purposeFile = 'Proof of purpose is required.';
      if (!draft.username.trim()) next.username = 'Facebook or Instagram handle is required.';
      if (!draft.refundInfo.trim()) next.refundInfo = 'Bank or refund information is required.';
    }
    if (activeStep === 3) {
      if (draft.pickupMode === 'hub' && !draft.pickupHub) next.pickupHub = 'Select a pickup hub.';
      if (draft.pickupMode === 'delivery' && !draft.deliveryAddress.trim()) next.deliveryAddress = 'Enter a delivery address.';
      if (draft.returnMode === 'hub' && !draft.returnHub) next.returnHub = 'Select a return hub.';
      if (draft.returnMode === 'delivery' && !draft.returnAddress.trim()) next.returnAddress = 'Enter a return address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setActiveStep((step) => step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep() || !purposeFile || !draft.rentDateStart || !draft.rentDateEnd) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = new FormData();
      payload.set('deviceIds', JSON.stringify(draft.deviceIds));
      payload.set('rent_date_start', draft.rentDateStart.format('YYYY-MM-DD'));
      payload.set('rent_date_end', draft.rentDateEnd.format('YYYY-MM-DD'));
      payload.set('pickup_time', draft.pickupTime?.format('HH:mm:ss') ?? '');
      payload.set('return_time', draft.returnTime?.format('HH:mm:ss') ?? '');
      payload.set('loc_usage', draft.locUsage);
      payload.set('username', draft.username.trim());
      payload.set('discount_code', draft.discountCode.trim());
      payload.set('refund_info', draft.refundInfo.trim());
      payload.set('hub_pick_up_addr', draft.pickupMode === 'hub' ? draft.pickupHub : '');
      payload.set('delivery_addr', draft.pickupMode === 'delivery' ? draft.deliveryAddress.trim() : '');
      payload.set('hub_return_addr', draft.returnMode === 'hub' ? draft.returnHub : '');
      payload.set('return_addr', draft.returnMode === 'delivery' ? draft.returnAddress.trim() : '');
      payload.set('proof_of_purpose', purposeFile.blob, purposeFile.fileName);
      const result = await submitPublicBooking(payload);
      setSubmittedRentalId(result.rentalId);
      setNotificationWarning(Boolean(result.notificationWarning));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your booking could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }

  if (!session) {
    return (
      <PageLayout>
        <Box sx={{ maxWidth: 620, mx: 'auto', py: 8, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ mb: 3 }}>Start with the new-renter or returning-renter form before opening the rental form.</Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => navigate('/renter')}>New Renter</Button>
            <Button variant="outlined" onClick={() => navigate('/returnee')}>Returning Renter</Button>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  if (submittedRentalId) {
    return (
      <PageLayout>
        <Box sx={{ maxWidth: 680, mx: 'auto', py: 8, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 76, color: '#2E7D32', mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 1 }}>Booking request submitted</Typography>
          <Chip label="Status: Submitted" sx={{ mb: 2 }} />
          <Typography sx={{ color: '#666', mb: 1 }}>Our team will review your request and contact you with an update.</Typography>
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', mb: 3 }}>Reference: {formatShortId(submittedRentalId)}</Typography>
          {notificationWarning && <Alert severity="warning" sx={{ mb: 3 }}>Your booking was saved, but one notification could not be delivered. The Admin team can still view your request.</Alert>}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => navigate('/renter')}>Start New-Renter Booking</Button>
            <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => navigate('/returnee')}>Start Returnee Booking</Button>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageLayout>
        <Box sx={{ mb: 4 }}>
          <Chip icon={session.renterType === 'returnee' ? <ReplayIcon /> : <CameraAltIcon />} label={session.renterType === 'returnee' ? 'RETURNING RENTER BOOKING' : 'NEW RENTER BOOKING'} size="small" sx={{ mb: 1.5, fontWeight: 700 }} />
          <Typography variant="h3" sx={{ mb: 0.75 }}>Camera rental request</Typography>
          <Typography sx={{ color: '#666' }}>Choose your equipment and schedule. Your booking starts as Submitted.</Typography>
        </Box>

        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, display: { xs: 'none', md: 'flex' } }}>
          {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, border: '1px solid rgba(17,17,17,0.12)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{STEPS[activeStep]}</Typography>
          <Divider sx={{ mb: 3 }} />

          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {draft.deviceIds.map((deviceId, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl fullWidth error={Boolean(errors.deviceIds)}>
                    <InputLabel>Camera Model {index + 1}</InputLabel>
                    <Select value={deviceId} label={`Camera Model ${index + 1}`} onChange={(event: SelectChangeEvent) => {
                      const ids = [...draft.deviceIds];
                      ids[index] = event.target.value;
                      update('deviceIds', ids);
                    }}>
                      {devices.map((device) => <MenuItem key={device.id} value={device.id}>{device.cam_name ?? 'Unnamed camera'}{device.rentPrice != null ? ` · ₱${device.rentPrice.toLocaleString()}` : ''}</MenuItem>)}
                    </Select>
                    {index === draft.deviceIds.length - 1 && errors.deviceIds && <FormHelperText>{errors.deviceIds}</FormHelperText>}
                  </FormControl>
                  {draft.deviceIds.length > 1 && <Button color="inherit" onClick={() => update('deviceIds', draft.deviceIds.filter((_, row) => row !== index))} aria-label="Remove camera"><CloseIcon /></Button>}
                </Box>
              ))}
              <Button startIcon={<AddCircleOutlineIcon />} disabled={draft.deviceIds.length >= 5} onClick={() => update('deviceIds', [...draft.deviceIds, ''])} sx={{ alignSelf: 'flex-start' }}>Add another camera</Button>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DatePicker label="Start Date" value={draft.rentDateStart} minDate={dayjs().startOf('day')} onChange={(value) => update('rentDateStart', value)} slotProps={{ textField: { required: true, error: Boolean(errors.rentDateStart), helperText: errors.rentDateStart } }} />
              <DatePicker label="End Date" value={draft.rentDateEnd} minDate={draft.rentDateStart ?? dayjs().startOf('day')} onChange={(value) => update('rentDateEnd', value)} slotProps={{ textField: { required: true, error: Boolean(errors.rentDateEnd), helperText: errors.rentDateEnd } }} />
              <TimePicker label="Preferred Pickup Time" value={draft.pickupTime} onChange={(value) => update('pickupTime', value)} />
              <TimePicker label="Preferred Return Time" value={draft.returnTime} onChange={(value) => update('returnTime', value)} />
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <ToggleButtonGroup exclusive value={draft.locUsage} onChange={(_, value: LocUsage | null) => { if (value) update('locUsage', value); }}>
                <ToggleButton value="domestic">Domestic Use</ToggleButton>
                <ToggleButton value="international">International Use</ToggleButton>
              </ToggleButtonGroup>
              <FileUpload label="Proof of Purpose" result={purposeFile} onFile={(file) => { setPurposeFile(file); setErrors((current) => ({ ...current, purposeFile: '' })); }} defaultTab="upload" facingMode="environment" hint="Upload supporting proof for the purpose of this rental (image or PDF)." />
              {errors.purposeFile && <Alert severity="error">{errors.purposeFile}</Alert>}
              <TextField label="Facebook / Instagram Handle" required value={draft.username} onChange={(event: ChangeEvent<HTMLInputElement>) => update('username', event.target.value)} error={Boolean(errors.username)} helperText={errors.username} />
              <TextField label="Bank / Refund Information" required multiline minRows={3} value={draft.refundInfo} onChange={(event: ChangeEvent<HTMLInputElement>) => update('refundInfo', event.target.value)} error={Boolean(errors.refundInfo)} helperText={errors.refundInfo ?? 'Used only when a refund is required.'} />
              <TextField label="Discount Code (optional)" value={draft.discountCode} onChange={(event: ChangeEvent<HTMLInputElement>) => update('discountCode', event.target.value)} />
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {([
                { title: 'Pickup', modeKey: 'pickupMode' as const, hubKey: 'pickupHub' as const, addressKey: 'deliveryAddress' as const },
                { title: 'Return', modeKey: 'returnMode' as const, hubKey: 'returnHub' as const, addressKey: 'returnAddress' as const },
              ]).map((section) => (
                <Paper key={section.title} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{section.title}</Typography>
                  <ToggleButtonGroup exclusive fullWidth value={draft[section.modeKey]} onChange={(_, value: DeliveryMode | null) => { if (value) update(section.modeKey, value); }} sx={{ mb: 2 }}>
                    <ToggleButton value="hub"><StorefrontIcon sx={{ mr: 1 }} />Hub</ToggleButton>
                    <ToggleButton value="delivery"><LocalShippingIcon sx={{ mr: 1 }} />Door</ToggleButton>
                  </ToggleButtonGroup>
                  {draft[section.modeKey] === 'hub'
                    ? <FormControl fullWidth error={Boolean(errors[section.hubKey])}><InputLabel>Select Hub</InputLabel><Select value={draft[section.hubKey]} label="Select Hub" onChange={(event: SelectChangeEvent) => update(section.hubKey, event.target.value)}>{branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.location_name}{branch.location_addr ? ` — ${branch.location_addr}` : ''}</MenuItem>)}</Select>{errors[section.hubKey] && <FormHelperText>{errors[section.hubKey]}</FormHelperText>}</FormControl>
                    : <TextField fullWidth label={`${section.title} Address`} multiline minRows={3} value={draft[section.addressKey]} onChange={(event: ChangeEvent<HTMLInputElement>) => update(section.addressKey, event.target.value)} error={Boolean(errors[section.addressKey])} helperText={errors[section.addressKey]} />}
                </Paper>
              ))}
            </Box>
          )}

          {activeStep === 4 && (
            <Box>
              <ReviewRow label="Renter type" value={session.renterType === 'new' ? 'New Renter' : 'Returning Renter'} />
              <ReviewRow label="Camera models" value={selectedDevices.map((device) => device.cam_name).join(', ')} />
              <ReviewRow label="Rental dates" value={`${draft.rentDateStart?.format('MMM D, YYYY')} – ${draft.rentDateEnd?.format('MMM D, YYYY')}`} />
              <ReviewRow label="Pickup time" value={draft.pickupTime?.format('h:mm A') ?? 'Not specified'} />
              <ReviewRow label="Return time" value={draft.returnTime?.format('h:mm A') ?? 'Not specified'} />
              <ReviewRow label="Pickup" value={draft.pickupMode === 'hub' ? branches.find((branch) => branch.id === draft.pickupHub)?.location_name : draft.deliveryAddress} />
              <ReviewRow label="Return" value={draft.returnMode === 'hub' ? branches.find((branch) => branch.id === draft.returnHub)?.location_name : draft.returnAddress} />
              <Alert severity="info" sx={{ mt: 2 }}>The actual physical unit is assigned securely when you submit. Your request will start as Submitted and must be reviewed by the team.</Alert>
            </Box>
          )}

          {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={activeStep === 0 ? () => navigate(session.renterType === 'new' ? '/renter' : '/returnee') : () => setActiveStep((step) => step - 1)} disabled={submitting}>Back</Button>
          {activeStep < STEPS.length - 1
            ? <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={nextStep}>Continue</Button>
            : <Button variant="contained" endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />} onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Booking Request'}</Button>}
        </Box>

        <Snackbar open={notificationWarning} autoHideDuration={6000} onClose={() => setNotificationWarning(false)}><Alert severity="warning">One notification could not be delivered.</Alert></Snackbar>
      </PageLayout>
    </LocalizationProvider>
  );
};

export default RenterForm;
