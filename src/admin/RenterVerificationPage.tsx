import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress,
  Divider, IconButton, Dialog, Select, MenuItem,
  FormControl, InputLabel, Alert, Tooltip, type SelectChangeEvent,
} from '@mui/material';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import CancelIcon             from '@mui/icons-material/Cancel';
import HourglassTopIcon       from '@mui/icons-material/HourglassTop';
import PendingIcon            from '@mui/icons-material/Pending';
import PhoneIcon              from '@mui/icons-material/Phone';
import EmailIcon              from '@mui/icons-material/Email';
import EmergencyIcon          from '@mui/icons-material/LocalHospital';
import CameraAltIcon          from '@mui/icons-material/CameraAlt';
import BadgeIcon              from '@mui/icons-material/Badge';
import ReceiptIcon            from '@mui/icons-material/Receipt';
import FaceIcon               from '@mui/icons-material/Face';
import AccountBalanceIcon     from '@mui/icons-material/AccountBalance';
import InstagramIcon          from '@mui/icons-material/Instagram';
import LocalShippingIcon      from '@mui/icons-material/LocalShipping';
import StorefrontIcon         from '@mui/icons-material/Storefront';
import ZoomInIcon             from '@mui/icons-material/ZoomIn';
import SaveIcon               from '@mui/icons-material/Save';
import CloseIcon              from '@mui/icons-material/Close';
import LocationOnIcon         from '@mui/icons-material/LocationOn';
import GpsFixedIcon           from '@mui/icons-material/GpsFixed';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbRenter, RbRentalForm, RbItem, RbDevice, RbBranch, RbSelfieVerificationInst } from '../service/supabaseClient';

// ─── Theme ────────────────────────────────────────────────────────────────────
const AMBER      = '#C9973A';
const AMBER_DARK = '#9A6F24';
const CREAM      = '#FFFBF4';
const CARD_BG    = '#FFFFFF';
const ESPRESSO   = '#1A1008';
const INK        = '#3D2B0F';
const MUTED      = '#7A6040';
const BORDER     = 'rgba(201,151,58,0.18)';

const RENTAL_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:   { label: 'Submitted',  color: '#B8860B', bg: 'rgba(255,212,59,0.10)',  border: 'rgba(255,212,59,0.30)'  },
  'in-review': { label: 'In Review',  color: '#1565C0', bg: 'rgba(100,149,237,0.10)', border: 'rgba(100,149,237,0.30)' },
  renting:     { label: 'Renting',    color: '#7A4F00', bg: 'rgba(201,151,58,0.12)',  border: 'rgba(201,151,58,0.40)'  },
  completed:   { label: 'Completed',  color: '#2E7D32', bg: 'rgba(105,219,124,0.10)', border: 'rgba(105,219,124,0.30)' },
  canceled:    { label: 'Canceled',   color: '#555555', bg: 'rgba(120,120,120,0.10)', border: 'rgba(120,120,120,0.25)' },
  declined:    { label: 'Declined',   color: '#B71C1C', bg: 'rgba(211,47,47,0.08)',   border: 'rgba(211,47,47,0.25)'   },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface EnrichedItem extends RbItem { device?: RbDevice; }
interface FullVerification {
  rental:       RbRentalForm;
  renter:       RbRenter;
  item:         EnrichedItem | null;
  pickupBranch: RbBranch | null;
  returnBranch: RbBranch | null;
  selfieInst:   RbSelfieVerificationInst | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'linear-gradient(135deg, rgba(201,151,58,0.15), rgba(201,151,58,0.05))', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AMBER }}>
      {icon}
    </Box>
    <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {title}
    </Typography>
  </Box>
);

const InfoRow: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1, borderBottom: `1px solid rgba(201,151,58,0.08)`, gap: 2 }}>
    <Typography sx={{ color: MUTED, fontSize: '0.78rem', minWidth: 160, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ color: value ? ESPRESSO : MUTED, fontSize: '0.82rem', fontWeight: value ? 500 : 400, fontStyle: value ? 'normal' : 'italic', textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit' }}>
      {value ?? 'Not provided'}
    </Typography>
  </Box>
);

const ImageCard: React.FC<{ label: string; src: string | null; onZoom: (src: string) => void }> = ({ label, src, onZoom }) => (
  <Box sx={{ flex: '1 1 180px' }}>
    <Typography sx={{ color: AMBER_DARK, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.75, fontWeight: 700 }}>{label}</Typography>
    {src
      ? <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => onZoom(src)}>
          <img src={src} alt={label} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          <Box sx={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s', '&:hover': { background: 'rgba(0,0,0,0.3)', opacity: 1 } }}>
            <ZoomInIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
        </Box>
      : <Box sx={{ height: 140, borderRadius: 2, border: `1.5px dashed ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, background: 'rgba(201,151,58,0.02)' }}>
          <CancelIcon sx={{ fontSize: 22, color: 'rgba(201,151,58,0.25)' }} />
          <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif' }}>Not uploaded</Typography>
        </Box>}
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const RenterVerificationPage: React.FC = () => {
  const { rentalId } = useParams<{ rentalId: string }>();
  const navigate = useNavigate();

  const [data, setData]       = useState<FullVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [status, setStatus]   = useState('submitted');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!rentalId) return;
    setLoading(true);
    try {
      // 1. Rental form
      const { data: rental, error: rErr } = await supabase
        .from('RB_RENTAL_FORM').select('*').eq('id', rentalId).single();
      if (rErr || !rental) throw new Error('Rental not found');

      // 2. Renter
      const { data: renter, error: rentErr } = await supabase
        .from('RB_RENTER').select('*').eq('id', rental.renter_id_fk).single();
      if (rentErr || !renter) throw new Error('Renter record not found');

      // 3. Item + device
      let item: EnrichedItem | null = null;
      if (rental.cam_name_id_fk) {
        const { data: itemRaw } = await supabase
          .from('RB_ITEM')
          .select('*, device:RB_DEVICES(id, cam_name, device_img)')
          .eq('id', rental.cam_name_id_fk).single();
        if (itemRaw) item = itemRaw as EnrichedItem;
      }

      // 4. Branches
      const branchIds = [rental.hub_pick_up_addr, rental.hub_return_addr].filter(Boolean) as string[];
      const branchMap: Record<string, RbBranch> = {};
      if (branchIds.length) {
        const { data: branches } = await supabase.from('RB_BRANCHES').select('*').in('id', branchIds);
        (branches ?? []).forEach((b: RbBranch) => { branchMap[b.id] = b; });
      }

      // 5. Selfie instruction
      let selfieInst: RbSelfieVerificationInst | null = null;
      if (renter.selfie_verification_id) {
        const { data: si } = await supabase.from('RB_SELFIE_VERIFICATION_INST').select('*').eq('id', renter.selfie_verification_id).single();
        if (si) selfieInst = si as RbSelfieVerificationInst;
      }

      setStatus(rental.status);
      setData({
        rental: rental as RbRentalForm,
        renter: renter as RbRenter,
        item,
        pickupBranch: rental.hub_pick_up_addr ? branchMap[rental.hub_pick_up_addr] ?? null : null,
        returnBranch: rental.hub_return_addr  ? branchMap[rental.hub_return_addr]  ?? null : null,
        selfieInst,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!rentalId) return;
    setSaving(true);
    await supabase.from('RB_RENTAL_FORM').update({ status }).eq('id', rentalId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Re-fetch to reflect any changes
    await fetchData();
  };

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: CREAM, flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: AMBER }} />
        <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.82rem' }}>Loading verification data…</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: CREAM, flexDirection: 'column', gap: 2, p: 4 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>{error || 'Could not load data.'}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/dashboard')}>Back to Dashboard</Button>
      </Box>
    );
  }

  const { rental, renter, item, pickupBranch, returnBranch, selfieInst } = data;
  const statusMeta = RENTAL_STATUS_META[status] ?? RENTAL_STATUS_META.submitted;
  const days = dayjs(rental.rent_date_end).diff(dayjs(rental.rent_date_start), 'day');

  return (
    <Box sx={{ minHeight: '100vh', background: '#F5EFE4' }}>

      {/* ── Sticky header ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,251,244,0.96)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(201,151,58,0.07)',
        px: { xs: 2, md: 4 }, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Back to dashboard">
            <IconButton onClick={() => navigate('/admin/dashboard')} size="small" sx={{ border: `1px solid ${BORDER}`, color: MUTED }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
              Renter Verification
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif' }}>
              {renter.renter_fname} {renter.renter_lname} · {dayjs(rental.created_at).format('MMM D, YYYY [at] h:mm A')}
            </Typography>
          </Box>
        </Box>

        {/* Status control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={statusMeta.label}
            size="small"
            sx={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.75rem' }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ color: MUTED }}>Change status</InputLabel>
            <Select value={status} onChange={(e: SelectChangeEvent) => setStatus(e.target.value)} label="Change status">
              {Object.entries(RENTAL_STATUS_META).map(([val, m]) => (
                <MenuItem key={val} value={val}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                    {m.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained" size="small"
            startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : saved ? <CheckCircleIcon /> : <SaveIcon />}
            onClick={handleSave} disabled={saving}
            sx={{ minWidth: 110, background: saved ? '#2E7D32' : undefined }}
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Status'}
          </Button>
        </Box>
      </Box>

      {/* ── Page body ── */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ══ Row 1: Personal Info + Rental Info ══ */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>

          {/* Personal info */}
          <Paper elevation={0} sx={{ flex: '1 1 320px', p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
            <SectionTitle icon={<PhoneIcon sx={{ fontSize: 17 }} />} title="Personal Information" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, p: 2, background: 'rgba(201,151,58,0.04)', borderRadius: 2, border: `1px solid ${BORDER}` }}>
              <Box sx={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #C9973A, #E5B85C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Sora", sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#fff', flexShrink: 0 }}>
                {renter.renter_fname[0]?.toUpperCase()}
              </Box>
              <Box>
                <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '1.05rem' }}>{renter.renter_fname} {renter.renter_lname}</Typography>
                <Typography sx={{ color: MUTED, fontSize: '0.75rem', fontFamily: '"Sora", sans-serif' }}>Renter ID: {renter.id.slice(0, 8)}…</Typography>
              </Box>
            </Box>
            <InfoRow label="Email"             value={renter.email} />
            <InfoRow label="Mobile Number"     value={renter.mobile_no} />
            <InfoRow label="Emergency Contact" value={renter.emergency_contact_no} />
            <InfoRow label="Registered"        value={dayjs(renter.created_at).format('MMMM D, YYYY')} />
          </Paper>

          {/* Rental info */}
          <Paper elevation={0} sx={{ flex: '1 1 320px', p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
            <SectionTitle icon={<CameraAltIcon sx={{ fontSize: 17 }} />} title="Rental Details" />

            {/* Camera */}
            {item && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, background: 'rgba(201,151,58,0.04)', borderRadius: 2, border: `1px solid ${BORDER}` }}>
                {item.device?.device_img
                  ? <img src={item.device.device_img} alt="" style={{ width: 56, height: 44, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} />
                  : <Box sx={{ width: 56, height: 44, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 20, color: AMBER }} /></Box>}
                <Box>
                  <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.92rem' }}>{item.device?.cam_name ?? '—'}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif' }}>{item.code_name} · S/N {item.serial_no}</Typography>
                  {item.gps_installed && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <GpsFixedIcon sx={{ fontSize: 11, color: '#2E7D32' }} />
                      <Typography sx={{ fontSize: '0.68rem', color: '#2E7D32' }}>GPS installed</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            <InfoRow label="Start Date"     value={dayjs(rental.rent_date_start).format('MMMM D, YYYY')} />
            <InfoRow label="End Date"       value={dayjs(rental.rent_date_end).format('MMMM D, YYYY')} />
            <InfoRow label="Duration"       value={`${days} day${days !== 1 ? 's' : ''}`} />
            <InfoRow label="Location Type"  value={rental.loc_usage ? rental.loc_usage.charAt(0).toUpperCase() + rental.loc_usage.slice(1) : null} />
            <InfoRow label="Social Handle"  value={rental.username} />
            <InfoRow label="Discount Code"  value={rental.discount_code} />

            {/* Pick-up / return */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
              {[
                { label: 'Pick-up', val: pickupBranch?.location_name ?? rental.delivery_addr ?? '—', isHub: !!rental.hub_pick_up_addr },
                { label: 'Return',  val: returnBranch?.location_name ?? rental.return_addr   ?? '—', isHub: !!rental.hub_return_addr  },
              ].map((d) => (
                <Box key={d.label} sx={{ flex: 1, p: 1.25, borderRadius: 2, background: 'rgba(201,151,58,0.04)', border: `1px solid ${BORDER}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    {d.isHub ? <StorefrontIcon sx={{ fontSize: 12, color: AMBER }} /> : <LocalShippingIcon sx={{ fontSize: 12, color: AMBER }} />}
                    <Typography sx={{ color: AMBER_DARK, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.label}</Typography>
                  </Box>
                  <Typography sx={{ color: ESPRESSO, fontSize: '0.78rem', fontWeight: 600 }}>{d.val}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: '0.65rem' }}>{d.isHub ? 'Hub' : 'Door'}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* ══ Row 2: Bank info + Proof of Purpose ══ */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Paper elevation={0} sx={{ flex: '1 1 260px', p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
            <SectionTitle icon={<AccountBalanceIcon sx={{ fontSize: 17 }} />} title="Bank / Refund Information" />
            <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(201,151,58,0.04)', border: `1px solid ${BORDER}` }}>
              <Typography sx={{ color: ESPRESSO, fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {rental.refund_info ?? <span style={{ color: MUTED, fontStyle: 'italic' }}>Not provided</span>}
              </Typography>
            </Box>
          </Paper>

          {rental.proof_of_purpose_of_rental && (
            <Paper elevation={0} sx={{ flex: '1 1 260px', p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
              <SectionTitle icon={<ReceiptIcon sx={{ fontSize: 17 }} />} title="Proof of Purpose" />
              {rental.proof_of_purpose_of_rental.endsWith('.pdf')
                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, background: 'rgba(201,151,58,0.04)', borderRadius: 2, border: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 36 }}>📄</span>
                    <Box>
                      <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.85rem' }}>PDF Document</Typography>
                      <Button variant="text" size="small" href={rental.proof_of_purpose_of_rental} target="_blank" rel="noreferrer"
                        sx={{ color: AMBER, fontSize: '0.75rem', p: 0, minWidth: 0, '&:hover': { background: 'transparent', textDecoration: 'underline' } }}>
                        Open PDF →
                      </Button>
                    </Box>
                  </Box>
                : <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => setZoomSrc(rental.proof_of_purpose_of_rental!)}>
                    <img src={rental.proof_of_purpose_of_rental} alt="Proof of purpose" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                    <Box sx={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s', '&:hover': { background: 'rgba(0,0,0,0.3)', opacity: 1 } }}>
                      <ZoomInIcon sx={{ color: '#fff', fontSize: 28 }} />
                    </Box>
                  </Box>}
            </Paper>
          )}
        </Box>

        {/* ══ Row 3: Primary ID ══ */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
          <SectionTitle icon={<BadgeIcon sx={{ fontSize: 17 }} />} title="Primary Government-Issued ID" />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <ImageCard label="Front" src={renter.primary_id_front} onZoom={setZoomSrc} />
            <ImageCard label="Back"  src={renter.primary_id_back}  onZoom={setZoomSrc} />
          </Box>
        </Paper>

        {/* ══ Row 4: Secondary ID ══ */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
          <SectionTitle icon={<BadgeIcon sx={{ fontSize: 17 }} />} title="Secondary ID" />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <ImageCard label="Front" src={renter.secondary_id_front} onZoom={setZoomSrc} />
            <ImageCard label="Back"  src={renter.secondary_id_back}  onZoom={setZoomSrc} />
          </Box>
        </Paper>

        {/* ══ Row 5: Proof of Billing ══ */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
          <SectionTitle icon={<ReceiptIcon sx={{ fontSize: 17 }} />} title="Proof of Billing" />
          {renter.proof_of_billing
            ? renter.proof_of_billing.toLowerCase().includes('.pdf')
              ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, background: 'rgba(201,151,58,0.04)', borderRadius: 2, border: `1px solid ${BORDER}`, width: 'fit-content' }}>
                  <span style={{ fontSize: 36 }}>📄</span>
                  <Box>
                    <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.85rem' }}>PDF Document</Typography>
                    <Button variant="text" size="small" href={renter.proof_of_billing} target="_blank" rel="noreferrer"
                      sx={{ color: AMBER, fontSize: '0.75rem', p: 0, minWidth: 0 }}>Open PDF →</Button>
                  </Box>
                </Box>
              : <ImageCard label="Proof of Billing" src={renter.proof_of_billing} onZoom={setZoomSrc} />
            : <Box sx={{ p: 2, borderRadius: 2, border: `1.5px dashed ${BORDER}`, textAlign: 'center' }}>
                <Typography sx={{ color: MUTED, fontSize: '0.82rem', fontStyle: 'italic' }}>No proof of billing uploaded</Typography>
              </Box>}
        </Paper>

        {/* ══ Row 6: Selfie Verification ══ */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
          <SectionTitle icon={<FaceIcon sx={{ fontSize: 17 }} />} title="Selfie Verification" />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
            <ImageCard label="Selfie Photo" src={renter.selfie_verification_img} onZoom={setZoomSrc} />
            {selfieInst && (
              <Box sx={{ flex: '1 1 220px', p: 2, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
                <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5, fontWeight: 700 }}>
                  Verification Instruction
                </Typography>
                <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>{selfieInst.instruction_name}</Typography>
                <Typography sx={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.6 }}>{selfieInst.instruction_desc}</Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* ══ Quick action buttons ══ */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, background: CARD_BG }}>
          <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', mb: 2 }}>Quick Actions</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {[
              { label: 'Approve → In Review',  val: 'in-review', icon: <HourglassTopIcon />, color: '#1565C0', bg: 'rgba(100,149,237,0.08)' },
              { label: 'Mark as Renting',       val: 'renting',   icon: <CameraAltIcon />,   color: '#7A4F00', bg: 'rgba(201,151,58,0.10)' },
              { label: 'Mark as Completed',     val: 'completed', icon: <CheckCircleIcon />,  color: '#2E7D32', bg: 'rgba(105,219,124,0.10)' },
              { label: 'Decline', val: 'declined',  icon: <CancelIcon />,       color: '#B71C1C', bg: 'rgba(211,47,47,0.08)'  },
              { label: 'Return to Submitted',   val: 'submitted', icon: <PendingIcon />,      color: '#B8860B', bg: 'rgba(255,212,59,0.08)'  },
            ].map((a) => (
              <Button
                key={a.val}
                variant="outlined"
                size="small"
                startIcon={a.icon}
                onClick={async () => {
                  setStatus(a.val);
                  setSaving(true);
                  await supabase.from('RB_RENTAL_FORM').update({ status: a.val }).eq('id', rentalId);
                  setSaving(false);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                  await fetchData();
                }}
                disabled={saving || status === a.val}
                sx={{
                  borderColor: `${a.color}44`,
                  color: a.color,
                  background: a.bg,
                  fontSize: '0.78rem',
                  '&:hover': { borderColor: a.color, background: a.bg },
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                {a.label}
              </Button>
            ))}
          </Box>
        </Paper>

      </Box>

      {/* ── Image zoom dialog ── */}
      <Dialog open={!!zoomSrc} onClose={() => setZoomSrc(null)} maxWidth="lg"
        PaperProps={{ sx: { background: 'transparent', boxShadow: 'none', overflow: 'visible' } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setZoomSrc(null)}
            sx={{ position: 'absolute', top: -16, right: -16, background: 'rgba(0,0,0,0.6)', color: '#fff', zIndex: 10, '&:hover': { background: 'rgba(0,0,0,0.85)' } }}>
            <CloseIcon />
          </IconButton>
          {zoomSrc && <img src={zoomSrc} alt="Full size" style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />}
        </Box>
      </Dialog>
    </Box>
  );
};

export default RenterVerificationPage;