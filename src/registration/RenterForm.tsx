import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Paper, Divider, Chip,
  LinearProgress, FormHelperText, Stepper, Step, StepLabel,
  ToggleButtonGroup, ToggleButton, type SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import CameraAltIcon        from '@mui/icons-material/CameraAlt';
import LocalShippingIcon    from '@mui/icons-material/LocalShipping';
import StorefrontIcon       from '@mui/icons-material/Storefront';
import ReceiptLongIcon      from '@mui/icons-material/ReceiptLong';
import PublicIcon           from '@mui/icons-material/Public';
import HomeIcon             from '@mui/icons-material/Home';
import ArrowForwardIcon     from '@mui/icons-material/ArrowForward';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import SendIcon             from '@mui/icons-material/Send';
import DashboardIcon        from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GpsFixedIcon         from '@mui/icons-material/GpsFixed';
import AccountBalanceIcon   from '@mui/icons-material/AccountBalance';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbItem, RbDevice, RbBranch, RbRenter, LocUsage } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';
import FileUpload, { type FileUploadResult } from '../components/FileUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryMode = 'hub' | 'delivery';

interface RentalForm {
  cam_name_id_fk:   string;
  rent_date_start:  Dayjs | null;
  rent_date_end:    Dayjs | null;
  loc_usage:        LocUsage | '';
  username:         string;
  discount_code:    string;
  refund_info:      string;   // ← now mandatory
  pickup_mode:      DeliveryMode;
  hub_pick_up_addr: string;
  delivery_addr:    string;
  return_mode:      DeliveryMode;
  hub_return_addr:  string;
  return_addr:      string;
}

interface EnrichedItem extends RbItem { device?: RbDevice; }

type RentalFormErrors = Partial<Record<keyof RentalForm | 'proof_of_purpose', string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'verification-images';

const STEPS = [
  { label: 'Camera Selection',  icon: <CameraAltIcon /> },
  { label: 'Rental Period',     icon: <ReceiptLongIcon /> },
  { label: 'Purpose & Info',    icon: <PublicIcon /> },
  { label: 'Delivery & Return', icon: <LocalShippingIcon /> },
  { label: 'Review & Submit',   icon: <CheckCircleIcon /> },
];

const INIT_FORM: RentalForm = {
  cam_name_id_fk: '', rent_date_start: null, rent_date_end: null,
  loc_usage: '', username: '', discount_code: '', refund_info: '',
  pickup_mode: 'hub', hub_pick_up_addr: '', delivery_addr: '',
  return_mode: 'hub', hub_return_addr: '', return_addr: '',
};

const TOGGLE_BTN_SX = {
  border: '1px solid rgba(201,151,58,0.2) !important',
  borderRadius: '8px !important',
  color: '#7A6040', gap: 1,
  textTransform: 'none' as const,
  fontFamily: '"Sora", sans-serif', fontWeight: 600,
  '&.Mui-selected': { background: 'rgba(201,151,58,0.15)', borderColor: '#C9973A !important', color: '#C9973A' },
  '&:hover': { background: 'rgba(201,151,58,0.10)' },
};

// ─── Layout primitives ────────────────────────────────────────────────────────

const Row: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 2.5 }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap }}>{children}</Box>
);
const Col: React.FC<{ children: React.ReactNode; half?: boolean }> = ({ children, half = false }) => (
  <Box sx={{ flex: '1 1 auto', width: half ? { xs: '100%', sm: 'calc(50% - 10px)' } : '100%', maxWidth: half ? { xs: '100%', sm: 'calc(50% - 10px)' } : '100%', minWidth: 0 }}>
    {children}
  </Box>
);
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: '#C9973A', letterSpacing: '0.1em', mb: 1.5, display: 'block' }}>{children}</Typography>
);

// ─── Step 1: Camera Selection ─────────────────────────────────────────────────
// Items are pre-filtered to status='Available' at the DB level — no disabled rows needed.

interface StepCameraProps {
  items: EnrichedItem[];
  form: RentalForm;
  onSelect: (e: SelectChangeEvent) => void;
  errors: RentalFormErrors;
}

const StepCamera: React.FC<StepCameraProps> = ({ items, form, onSelect, errors }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <SectionLabel>Select the camera you want to rent</SectionLabel>
    {items.length === 0 && (
      <Alert severity="info" sx={{ background: 'rgba(107,142,107,0.06)', border: '1px solid rgba(107,142,107,0.2)', color: '#4A6A4A' }}>
        No cameras found in inventory.
      </Alert>
    )}
    <FormControl fullWidth error={!!errors.cam_name_id_fk}>
      <InputLabel>Camera / Equipment</InputLabel>
      <Select value={form.cam_name_id_fk} onChange={onSelect} label="Camera / Equipment">
        {items.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
              {item.device?.device_img
                ? <img src={item.device.device_img} alt={item.device.cam_name} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(201,151,58,0.2)', flexShrink: 0 }} />
                : <Box sx={{ width: 48, height: 36, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CameraAltIcon sx={{ fontSize: 18, color: 'rgba(201,151,58,0.4)' }} />
                  </Box>}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: '#1A1008', fontSize: '0.9rem', lineHeight: 1.3 }}>
                  {item.device?.cam_name ?? '—'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {item.gps_installed && <GpsFixedIcon sx={{ fontSize: 11, color: '#2E7D32' }} />}
                </Box>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
      {errors.cam_name_id_fk && <FormHelperText>{errors.cam_name_id_fk}</FormHelperText>}
    </FormControl>
    <Typography variant="body2" sx={{ color: '#7A6040', fontSize: '0.78rem' }}>
      All inventory units are listed, including unavailable items. Each unit is identified by its unique code name.
    </Typography>
  </Box>
);

// ─── Step 2: Rental Period ────────────────────────────────────────────────────

const StepPeriod: React.FC<{ form: RentalForm; setForm: React.Dispatch<React.SetStateAction<RentalForm>>; errors: RentalFormErrors }> = ({ form, setForm, errors }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <SectionLabel>Choose your rental dates</SectionLabel>
      <Row>
        <Col half>
          <DatePicker label="Start Date" value={form.rent_date_start}
            onChange={(val) => setForm((f) => ({ ...f, rent_date_start: val, rent_date_end: null }))}
            minDate={dayjs()}
            slotProps={{ textField: { fullWidth: true, error: !!errors.rent_date_start, helperText: errors.rent_date_start } }} />
        </Col>
        <Col half>
          <DatePicker label="End Date" value={form.rent_date_end}
            onChange={(val) => setForm((f) => ({ ...f, rent_date_end: val }))}
            minDate={form.rent_date_start ? form.rent_date_start.add(1, 'day') : dayjs().add(1, 'day')}
            disabled={!form.rent_date_start}
            slotProps={{ textField: { fullWidth: true, error: !!errors.rent_date_end, helperText: errors.rent_date_end } }} />
        </Col>
      </Row>
      {form.rent_date_start && form.rent_date_end && (
        <Paper sx={{ p: 2, background: 'rgba(201,151,58,0.10)', border: '1px solid rgba(201,151,58,0.2)', borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#7A6040', textTransform: 'none', letterSpacing: 0 }}>From</Typography>
            <Typography sx={{ color: '#1A1008', fontWeight: 500 }}>{form.rent_date_start.format('MMM D, YYYY')}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(201,151,58,0.15)' }} />
          <Box>
            <Typography variant="caption" sx={{ color: '#7A6040', textTransform: 'none', letterSpacing: 0 }}>To</Typography>
            <Typography sx={{ color: '#1A1008', fontWeight: 500 }}>{form.rent_date_end.format('MMM D, YYYY')}</Typography>
          </Box>
        </Paper>
      )}
    </Box>
  </LocalizationProvider>
);

// ─── Step 3: Purpose & Info ───────────────────────────────────────────────────

interface StepPurposeProps {
  form: RentalForm;
  onText: (field: keyof RentalForm) => (e: ChangeEvent<HTMLInputElement>) => void;
  onLocUsage: (value: LocUsage) => void;
  errors: RentalFormErrors;
  purposeFile: FileUploadResult | null;
  onPurposeFile: (result: FileUploadResult | null) => void;
}

const StepPurpose: React.FC<StepPurposeProps> = ({ form, onText, onLocUsage, errors, purposeFile, onPurposeFile }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Box>
      <SectionLabel>Location of usage</SectionLabel>
      <ToggleButtonGroup value={form.loc_usage} exclusive onChange={(_, v: LocUsage | null) => { if (v) onLocUsage(v); }} sx={{ gap: 1.5, flexWrap: 'wrap' }}>
        <ToggleButton value="domestic"      sx={{ ...TOGGLE_BTN_SX, px: 3, py: 1 }}><HomeIcon />   Domestic</ToggleButton>
        <ToggleButton value="international" sx={{ ...TOGGLE_BTN_SX, px: 3, py: 1 }}><PublicIcon /> International</ToggleButton>
      </ToggleButtonGroup>
      {errors.loc_usage && <Typography sx={{ color: '#FF6B6B', fontSize: '0.75rem', mt: 0.5 }}>{errors.loc_usage}</Typography>}
    </Box>

    <Box>
      <SectionLabel>Proof of purpose</SectionLabel>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        Upload or capture a document supporting your rental purpose — event invitation, project brief, travel itinerary, etc.
      </Typography>
      <FileUpload label="Proof of Purpose Document" onFile={onPurposeFile} result={purposeFile}
        hint="Show the document clearly with your name or purpose visible." defaultTab="upload" facingMode="environment" />
      {errors.proof_of_purpose && <Alert severity="error" sx={{ mt: 1 }}>{errors.proof_of_purpose}</Alert>}
    </Box>

    <Row>
      <Col half>
        <TextField label="Facebook / Instagram Handle" placeholder="@yourhandle" fullWidth
          value={form.username} onChange={onText('username')} helperText="Optional" />
      </Col>
      <Col half>
        <TextField label="Discount Code" placeholder="Enter promo code" fullWidth
          value={form.discount_code} onChange={onText('discount_code')} helperText="Optional" />
      </Col>
    </Row>

    {/* ── Refund info — MANDATORY ── */}
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccountBalanceIcon sx={{ fontSize: 16, color: '#C9973A' }} />
        <SectionLabel>Bank / Refund Information</SectionLabel>
      </Box>
      <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem', background: 'rgba(201,151,58,0.06)', color: '#7A6040', border: '1px solid rgba(201,151,58,0.2)', '& .MuiAlert-icon': { color: '#C9973A' } }}>
        Required — this is used to process refunds if your rental is cancelled or if there are any adjustments.
      </Alert>
      <TextField
        label="Bank Name, Account Number, Account Name" required
        placeholder="e.g. BDO — 0123456789 — Juan dela Cruz"
        fullWidth multiline rows={2}
        value={form.refund_info} onChange={onText('refund_info')}
        error={!!errors.refund_info} helperText={errors.refund_info}
      />
    </Box>
  </Box>
);

// ─── Step 4: Delivery & Return ────────────────────────────────────────────────

interface DeliverySectionProps {
  title: string;
  modeKey: 'pickup_mode' | 'return_mode';
  addrKey: 'delivery_addr' | 'return_addr';
  hubKey:  'hub_pick_up_addr' | 'hub_return_addr';
  form: RentalForm;
  setForm: React.Dispatch<React.SetStateAction<RentalForm>>;
  branches: RbBranch[];
  errors: RentalFormErrors;
}

const DeliverySection: React.FC<DeliverySectionProps> = ({ title, modeKey, addrKey, hubKey, form, setForm, branches, errors }) => {
  const isHub = form[modeKey] === 'hub';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionLabel>{title}</SectionLabel>
      <ToggleButtonGroup value={form[modeKey]} exclusive onChange={(_, v: DeliveryMode | null) => { if (v) setForm((f) => ({ ...f, [modeKey]: v })); }} sx={{ gap: 1.5, flexWrap: 'wrap' }}>
        <ToggleButton value="hub"      sx={{ ...TOGGLE_BTN_SX, px: 2.5, py: 0.8, fontSize: '0.82rem' }}><StorefrontIcon />    Hub Pick-up / Return</ToggleButton>
        <ToggleButton value="delivery" sx={{ ...TOGGLE_BTN_SX, px: 2.5, py: 0.8, fontSize: '0.82rem' }}><LocalShippingIcon /> Door Delivery / Return</ToggleButton>
      </ToggleButtonGroup>
      {isHub ? (
        <FormControl fullWidth error={!!errors[hubKey]}>
          <InputLabel>Select Hub Branch</InputLabel>
          <Select value={form[hubKey]} onChange={(e: SelectChangeEvent) => setForm((f) => ({ ...f, [hubKey]: e.target.value }))} label="Select Hub Branch">
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#1A1008' }}>{b.location_name}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{b.location_addr}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors[hubKey] && <FormHelperText>{errors[hubKey]}</FormHelperText>}
        </FormControl>
      ) : (
        <TextField label={modeKey === 'pickup_mode' ? 'Delivery Address' : 'Return / Drop-off Address'}
          placeholder="Full address" fullWidth multiline rows={2}
          value={form[addrKey]} onChange={(e) => setForm((f) => ({ ...f, [addrKey]: e.target.value }))}
          error={!!errors[addrKey]} helperText={errors[addrKey]} />
      )}
    </Box>
  );
};

const StepDelivery: React.FC<{ form: RentalForm; setForm: React.Dispatch<React.SetStateAction<RentalForm>>; branches: RbBranch[]; errors: RentalFormErrors }> = ({ form, setForm, branches, errors }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <SectionLabel>Pick-up & return logistics</SectionLabel>
    <DeliverySection title="Pick-up / Delivery"  modeKey="pickup_mode" addrKey="delivery_addr" hubKey="hub_pick_up_addr" form={form} setForm={setForm} branches={branches} errors={errors} />
    <Divider sx={{ borderColor: 'rgba(201,151,58,0.15)' }} />
    <DeliverySection title="Return / Drop-off"   modeKey="return_mode" addrKey="return_addr"   hubKey="hub_return_addr"  form={form} setForm={setForm} branches={branches} errors={errors} />
  </Box>
);

// ─── Step 5: Review ───────────────────────────────────────────────────────────

const ReviewRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(255,243,220,0.8)' }}>
    <Typography variant="body2" sx={{ color: '#7A6040', minWidth: 160 }}>{label}</Typography>
    <Typography variant="body2" sx={{ color: '#1A1008', textAlign: 'right', fontWeight: 500 }}>
      {value ?? <span style={{ color: '#B8A080', fontStyle: 'italic' }}>Not provided</span>}
    </Typography>
  </Box>
);

interface StepReviewProps {
  form: RentalForm;
  items: EnrichedItem[];
  branches: RbBranch[];
  purposePreview: string | null;
  purposeFileName?: string | null;
}

const StepReview: React.FC<StepReviewProps> = ({ form, items, branches, purposePreview, purposeFileName }) => {
  const item      = items.find((i) => i.id === form.cam_name_id_fk);
  const hubPickup = branches.find((b) => b.id === form.hub_pick_up_addr);
  const hubReturn = branches.find((b) => b.id === form.hub_return_addr);
  const duration  = form.rent_date_start && form.rent_date_end ? `${form.rent_date_end.diff(form.rent_date_start, 'day')} day(s)` : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionLabel>Review your rental details</SectionLabel>
      <Alert severity="info" sx={{ background: 'rgba(107,142,107,0.06)', border: '1px solid rgba(107,142,107,0.25)', color: '#4A6A4A' }}>
        Please review all information carefully before submitting.
      </Alert>

      {item?.device?.device_img && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, background: 'rgba(201,151,58,0.04)', border: '1px solid rgba(201,151,58,0.12)', borderRadius: 2 }}>
          <img src={item.device.device_img} alt={item.device.cam_name} style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(201,151,58,0.2)' }} />
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1A1008', fontSize: '1rem' }}>{item.device.cam_name}</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#9A6F24', fontFamily: '"Sora", sans-serif' }}>{item.code_name} · S/N {item.serial_no}</Typography>
            {item.gps_installed && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <GpsFixedIcon sx={{ fontSize: 12, color: '#2E7D32' }} />
                <Typography sx={{ fontSize: '0.7rem', color: '#2E7D32' }}>GPS installed</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Paper sx={{ p: 2.5, background: 'rgba(201,151,58,0.04)', border: '1px solid rgba(201,151,58,0.15)', borderRadius: 2 }}>
        <Typography variant="caption" sx={{ color: '#C9973A', mb: 1, display: 'block' }}>EQUIPMENT</Typography>
        <ReviewRow label="Camera"     value={item?.device?.cam_name} />
        <ReviewRow label="Code Name"  value={item?.code_name} />
        <ReviewRow label="Serial No." value={item?.serial_no} />

        <Typography variant="caption" sx={{ color: '#C9973A', mt: 2, mb: 1, display: 'block' }}>RENTAL PERIOD</Typography>
        <ReviewRow label="Start Date" value={form.rent_date_start?.format('MMMM D, YYYY')} />
        <ReviewRow label="End Date"   value={form.rent_date_end?.format('MMMM D, YYYY')} />
        <ReviewRow label="Duration"   value={duration} />

        <Typography variant="caption" sx={{ color: '#C9973A', mt: 2, mb: 1, display: 'block' }}>PURPOSE</Typography>
        <ReviewRow label="Usage Location"  value={form.loc_usage ? form.loc_usage.charAt(0).toUpperCase() + form.loc_usage.slice(1) : undefined} />
        <ReviewRow label="Social Handle"   value={form.username || undefined} />
        <ReviewRow label="Discount Code"   value={form.discount_code || undefined} />

        <Typography variant="caption" sx={{ color: '#C9973A', mt: 2, mb: 1, display: 'block' }}>BANK / REFUND INFO</Typography>
        <ReviewRow label="Bank Details" value={form.refund_info} />

        <Typography variant="caption" sx={{ color: '#C9973A', mt: 2, mb: 1, display: 'block' }}>LOGISTICS</Typography>
        <ReviewRow label="Pick-up" value={form.pickup_mode === 'hub' ? hubPickup?.location_name : form.delivery_addr} />
        <ReviewRow label="Return"  value={form.return_mode === 'hub' ? hubReturn?.location_name : form.return_addr} />
      </Paper>

      {(purposePreview || purposeFileName) && (
        <Box>
          <Typography sx={{ color: '#7A6040', fontSize: '0.8rem', mb: 1 }}>Proof of Purpose</Typography>
          {purposePreview
            ? <img src={purposePreview} alt="proof" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(201,151,58,0.15)' }} />
            : <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, background: 'rgba(201,151,58,0.06)', border: '1px solid rgba(201,151,58,0.2)', borderRadius: 2 }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <Typography sx={{ fontSize: '0.85rem', color: '#3D2B0F', fontWeight: 500 }}>{purposeFileName}</Typography>
              </Box>}
        </Box>
      )}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RenterForm: React.FC = () => {
  const navigate = useNavigate();

  const [activeStep, setActiveStep]   = useState(0);
  const [form, setForm]               = useState<RentalForm>(INIT_FORM);
  const [errors, setErrors]           = useState<RentalFormErrors>({});
  const [items, setItems]             = useState<EnrichedItem[]>([]);
  const [branches, setBranches]       = useState<RbBranch[]>([]);
  const [purposeFile, setPurposeFile] = useState<FileUploadResult | null>(null);
  const [renter, setRenter]           = useState<RbRenter | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]               = useState(false);
  const [countdown, setCountdown]     = useState(5);

  useEffect(() => {
    Promise.all([
      supabase
        .from('RB_ITEM')
        .select('*, device:RB_DEVICES(id, cam_name, device_img)')
        .order('created_at', { ascending: false }),
      supabase.from('RB_BRANCHES').select('*').order('location_name'),
    ]).then(([itemsRes, branchesRes]) => {
      if (itemsRes.data)    setItems(itemsRes.data as EnrichedItem[]);
      if (branchesRes.data) setBranches(branchesRes.data as RbBranch[]);
    });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('RB_RENTER').select('*').eq('auth_user_id', user.id).single();
        if (data) setRenter(data as RbRenter);
      }
    });
  }, []);

  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { navigate('/dashboard'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  const onText = (field: keyof RentalForm) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };
  const onSelect = (field: keyof RentalForm) => (e: SelectChangeEvent) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };
  const onLocUsage = (value: LocUsage) => {
    setForm((f) => ({ ...f, loc_usage: value }));
    setErrors((err) => ({ ...err, loc_usage: undefined }));
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: RentalFormErrors = {};
    if (activeStep === 0) {
      if (!form.cam_name_id_fk) e.cam_name_id_fk = 'Please select a camera';
    }
    if (activeStep === 1) {
      if (!form.rent_date_start) e.rent_date_start = 'Start date is required';
      if (!form.rent_date_end)   e.rent_date_end   = 'End date is required';
    }
    if (activeStep === 2) {
      if (!form.loc_usage)           e.loc_usage        = 'Please select a location type';
      if (!purposeFile)              e.proof_of_purpose = 'Proof of purpose document is required';
      if (!form.refund_info.trim())  e.refund_info      = 'Bank / refund information is required';  // ← mandatory
    }
    if (activeStep === 3) {
      if (form.pickup_mode === 'hub'      && !form.hub_pick_up_addr)     e.hub_pick_up_addr = 'Please select a hub';
      if (form.pickup_mode === 'delivery' && !form.delivery_addr.trim()) e.delivery_addr    = 'Delivery address is required';
      if (form.return_mode === 'hub'      && !form.hub_return_addr)      e.hub_return_addr  = 'Please select a return hub';
      if (form.return_mode === 'delivery' && !form.return_addr.trim())   e.return_addr      = 'Return address is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) setActiveStep((s) => s + 1); };
  const handleBack = () => setActiveStep((s) => s - 1);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      setSubmitError('Uploading proof of purpose…');
      let proof_of_purpose_of_rental: string | null = null;
      if (purposeFile) {
        const ts  = Date.now();
        const ext = purposeFile.fileType === 'pdf' ? 'pdf' : 'jpg';
        const path = `purpose/${renter?.id ?? 'anon'}_${ts}.${ext}`;
        const { data, error } = await supabase.storage.from(BUCKET).upload(path, purposeFile.blob, { contentType: purposeFile.mimeType, upsert: true });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        proof_of_purpose_of_rental = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
      }

      setSubmitError('Saving rental form…');
      const selectedItem = items.find((i) => i.id === form.cam_name_id_fk);
      const { error } = await supabase.from('RB_RENTAL_FORM').insert({
        cam_name_id_fk:            form.cam_name_id_fk,
        renter_id_fk:              renter?.id ?? null,
        branch_id_fk:              selectedItem?.branch_id_fk ?? null,
        loc_usage:                 form.loc_usage || null,
        proof_of_purpose_of_rental,
        discount_code:             form.discount_code  || null,
        username:                  form.username       || null,
        refund_info:               form.refund_info,   // always present now
        rent_date_start:           form.rent_date_start?.toISOString(),
        rent_date_end:             form.rent_date_end?.toISOString(),
        hub_pick_up_addr:          form.pickup_mode === 'hub'      ? form.hub_pick_up_addr : null,
        delivery_addr:             form.pickup_mode === 'delivery' ? form.delivery_addr    : null,
        hub_return_addr:           form.return_mode === 'hub'      ? form.hub_return_addr  : null,
        return_addr:               form.return_mode === 'delivery' ? form.return_addr      : null,
        status: 'submitted',
      });
      if (error) throw new Error(`DB insert failed (${error.code}): ${error.message}${error.details ? ` | ${error.details}` : ''}${error.hint ? ` | Hint: ${error.hint}` : ''}`);

      setSubmitError('');
      setDone(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (activeStep / STEPS.length) * 100;

  if (done) {
    return (
      <PageLayout renter={renter ? { fname: renter.renter_fname, lname: renter.renter_lname } : null}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 8, px: 2 }}>
          <Box sx={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(105,219,124,0.12)', border: '2px solid rgba(105,219,124,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 52, color: '#69DB7C' }} />
          </Box>
          <Typography variant="h3" sx={{ color: '#1A1008', mb: 1 }}>Rental Submitted!</Typography>
          <Typography variant="body1" sx={{ color: '#7A6040', mb: 0.5, maxWidth: 420 }}>
            Your rental request is now under review. Our team will reach out to you shortly.
          </Typography>
          <Chip label="Status: Submitted" sx={{ mt: 1.5, mb: 4, background: 'rgba(255,212,59,0.10)', color: '#B8860B', border: '1px solid rgba(255,212,59,0.30)', fontFamily: '"Sora", sans-serif', fontWeight: 600 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
            <Button variant="contained" size="large" startIcon={<DashboardIcon />} onClick={() => navigate('/dashboard')} sx={{ minWidth: 200 }}>Go to Dashboard</Button>
            <Button variant="outlined" size="large" startIcon={<AddCircleOutlineIcon />}
              onClick={() => { setDone(false); setActiveStep(0); setForm(INIT_FORM); setPurposeFile(null); setCountdown(5); }} sx={{ minWidth: 200 }}>
              Submit Another
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} sx={{ color: '#C9973A' }} variant="determinate" value={((5 - countdown) / 5) * 100} />
            <Typography sx={{ color: '#B8A080', fontSize: '0.8rem', fontFamily: '"Sora", sans-serif' }}>Redirecting to dashboard in {countdown}s…</Typography>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout renter={renter ? { fname: renter.renter_fname, lname: renter.renter_lname } : null}>
      <Box sx={{ mb: 4 }}>
        <Chip icon={<CameraAltIcon sx={{ fontSize: '0.9rem !important' }} />} label="RENTAL REQUEST" size="small"
          sx={{ background: 'rgba(201,151,58,0.15)', color: '#C9973A', border: '1px solid rgba(201,151,58,0.25)', fontFamily: '"Sora", sans-serif', letterSpacing: '0.08em', mb: 1.5 }} />
        <Typography variant="h3" sx={{ color: '#1A1008', lineHeight: 1.2, mb: 0.5 }}>Book Your Equipment</Typography>
        <Typography variant="body1" sx={{ color: '#7A6040' }}>Complete this form to submit your camera rental request.</Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ color: '#7A6040', fontSize: '0.8rem' }}>Step {activeStep + 1} of {STEPS.length}</Typography>
          <Typography sx={{ color: '#C9973A', fontSize: '0.8rem' }}>{Math.round(progress)}% complete</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress}
          sx={{ height: 4, borderRadius: 2, background: 'rgba(201,151,58,0.10)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #C9973A, #9A6F24)', borderRadius: 2 } }} />
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, display: { xs: 'none', md: 'flex' }, '& .MuiStepConnector-line': { borderColor: 'rgba(201,151,58,0.15)' } }}>
        {STEPS.map((s, i) => <Step key={s.label} completed={i < activeStep}><StepLabel>{s.label}</StepLabel></Step>)}
      </Stepper>

      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, background: '#FFFFFF', border: '1px solid rgba(201,151,58,0.15)', borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(201,151,58,0.15), rgba(201,151,58,0.05))', border: '1px solid rgba(201,151,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9973A' }}>
            {STEPS[activeStep].icon}
          </Box>
          <Box>
            <Typography sx={{ color: '#7A6040', fontSize: '0.78rem' }}>Step {activeStep + 1}</Typography>
            <Typography variant="h6" sx={{ color: '#1A1008', lineHeight: 1 }}>{STEPS[activeStep].label}</Typography>
          </Box>
        </Box>
        <Divider sx={{ borderColor: 'rgba(201,151,58,0.15)', mb: 3 }} />

        {activeStep === 0 && <StepCamera items={items} form={form} onSelect={onSelect('cam_name_id_fk')} errors={errors} />}
        {activeStep === 1 && <StepPeriod form={form} setForm={setForm} errors={errors} />}
        {activeStep === 2 && <StepPurpose form={form} onText={onText} onLocUsage={onLocUsage} errors={errors} purposeFile={purposeFile} onPurposeFile={setPurposeFile} />}
        {activeStep === 3 && <StepDelivery form={form} setForm={setForm} branches={branches} errors={errors} />}
        {activeStep === 4 && <StepReview form={form} items={items} branches={branches} purposePreview={purposeFile?.fileType === 'image' ? purposeFile.previewUrl : null} purposeFileName={purposeFile?.fileType === 'pdf' ? purposeFile.fileName : null} />}

        {submitError && (
          <Alert severity={submitError.includes('…') ? 'info' : 'error'} sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{submitError}</Alert>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={activeStep === 0 ? () => navigate('/dashboard') : handleBack} disabled={submitting} sx={{ minWidth: 120 }}>
          {activeStep === 0 ? 'Dashboard' : 'Back'}
        </Button>
        {activeStep < STEPS.length - 1
          ? <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext} sx={{ minWidth: 160 }}>Continue</Button>
          : <Button variant="contained" endIcon={submitting ? <CircularProgress size={16} sx={{ color: '#0A0F1E' }} /> : <SendIcon />} onClick={handleSubmit} disabled={submitting} sx={{ minWidth: 160 }}>
              {submitting ? 'Submitting…' : 'Submit Rental Form'}
            </Button>}
      </Box>

      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', gap: 0.75, mt: 3 }}>
        {STEPS.map((_, i) => (
          <Box key={i} sx={{ width: i === activeStep ? 20 : 8, height: 8, borderRadius: 4, background: i < activeStep ? '#69DB7C' : i === activeStep ? '#C9973A' : 'rgba(201,151,58,0.15)', transition: 'all 0.3s ease' }} />
        ))}
      </Box>
    </PageLayout>
  );
};

export default RenterForm;
