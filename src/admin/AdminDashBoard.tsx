import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Avatar,
  Tabs, Tab, Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, FormHelperText,
  Switch, FormControlLabel, Tooltip, type SelectChangeEvent,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type {
  RbUser, RbBranch, RbDevice, RbItem, RbRenter,
  RbRentalForm, ItemStatus, ItemCondition,
} from '../service/supabaseClient';

import DashboardIcon        from '@mui/icons-material/Dashboard';
import CalendarMonthIcon    from '@mui/icons-material/CalendarMonth';
import InventoryIcon        from '@mui/icons-material/Inventory';
import LogoutIcon           from '@mui/icons-material/Logout';
import CameraAltIcon        from '@mui/icons-material/CameraAlt';
import AddIcon              from '@mui/icons-material/Add';
import EditIcon             from '@mui/icons-material/Edit';
import ChevronLeftIcon      from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon     from '@mui/icons-material/ChevronRight';
import LocalShippingIcon    from '@mui/icons-material/LocalShipping';
import StorefrontIcon       from '@mui/icons-material/Storefront';
import CalendarTodayIcon    from '@mui/icons-material/CalendarToday';
import UploadFileIcon       from '@mui/icons-material/UploadFile';
import GpsFixedIcon         from '@mui/icons-material/GpsFixed';
import SaveIcon             from '@mui/icons-material/Save';
import CloseIcon            from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import ZoomInIcon           from '@mui/icons-material/ZoomIn';
import InstagramIcon        from '@mui/icons-material/Instagram';
import PhoneIcon            from '@mui/icons-material/Phone';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// ─── Theme tokens (matches renter warm palette) ───────────────────────────────

const AMBER       = '#C9973A';
const AMBER_LIGHT = '#E5B85C';
const AMBER_DARK  = '#9A6F24';
const CREAM       = '#FFFBF4';
const CARD_BG     = '#FFFFFF';
const ESPRESSO    = '#1A1008';
const INK         = '#3D2B0F';
const MUTED       = '#7A6040';
const BORDER      = 'rgba(201,151,58,0.18)';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const ITEM_STATUSES: ItemStatus[] = [
  'Available', 'For Delivery', 'Delivered', 'For Return', 'For Refund', 'For Penalty',
];

const ITEM_STATUS_COLORS: Record<ItemStatus, { bg: string; color: string; border: string }> = {
  'Available':    { bg: 'rgba(105,219,124,0.12)', color: '#2E7D32', border: 'rgba(105,219,124,0.35)' },
  'For Delivery': { bg: 'rgba(100,149,237,0.12)', color: '#1565C0', border: 'rgba(100,149,237,0.35)' },
  'Delivered':    { bg: 'rgba(201,151,58,0.12)',  color: '#7A4F00', border: 'rgba(201,151,58,0.40)'  },
  'For Return':   { bg: 'rgba(255,165,0,0.12)',   color: '#E65100', border: 'rgba(255,165,0,0.35)'   },
  'For Refund':   { bg: 'rgba(156,39,176,0.10)',  color: '#6A1B9A', border: 'rgba(156,39,176,0.30)'  },
  'For Penalty':  { bg: 'rgba(211,47,47,0.10)',   color: '#B71C1C', border: 'rgba(211,47,47,0.30)'   },
};

const RENTAL_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:  { label: 'Submitted',  color: '#B8860B', bg: 'rgba(255,212,59,0.10)',  border: 'rgba(255,212,59,0.30)'  },
  'in-review':{ label: 'In Review',  color: '#1565C0', bg: 'rgba(100,149,237,0.10)',border: 'rgba(100,149,237,0.30)' },
  renting:    { label: 'Renting',    color: '#7A4F00', bg: 'rgba(201,151,58,0.12)', border: 'rgba(201,151,58,0.40)'  },
  completed:  { label: 'Completed',  color: '#2E7D32', bg: 'rgba(105,219,124,0.10)',border: 'rgba(105,219,124,0.30)' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedItem extends RbItem { device?: RbDevice; }

interface EnrichedRental extends RbRentalForm {
  item?:         EnrichedItem;
  renter?:       RbRenter;
  pickupBranch?: RbBranch;
  returnBranch?: RbBranch;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const InfoBox: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ p: 2, borderRadius: 2, background: `rgba(201,151,58,0.05)`, border: `1px solid ${BORDER}` }}>
    <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const SectionChip: React.FC<{ label: string }> = ({ label }) => (
  <Typography sx={{ color: AMBER, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1, display: 'block' }}>
    {label}
  </Typography>
);

// ─── Rental Detail Dialog (shared by Calendar + Overview stat cards) ──────────

interface RentalDetailDialogProps {
  rental: EnrichedRental | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, status: string) => Promise<void>;
}

const RentalDetailDialog: React.FC<RentalDetailDialogProps> = ({ rental, open, onClose, onSave }) => {
  const [status, setStatus] = useState(rental?.status ?? 'submitted');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (rental) setStatus(rental.status); }, [rental]);
  if (!rental) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(rental.id, status);
    setSaving(false);
    onClose();
  };

  const meta = RENTAL_STATUS_META[rental.status] ?? RENTAL_STATUS_META.submitted;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 3, boxShadow: '0 8px 40px rgba(201,151,58,0.12)' } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        Rental Details
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={meta.label} size="small" sx={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.7rem' }} />
          <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

        {/* Camera */}
        <InfoBox label="Camera">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {rental.item?.device?.device_img
              ? <img src={rental.item.device.device_img} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} />
              : <Box sx={{ width: 56, height: 42, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 20, color: AMBER }} /></Box>}
            <Box>
              <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.95rem' }}>{rental.item?.device?.cam_name ?? '—'}</Typography>
              <Typography sx={{ color: MUTED, fontSize: '0.75rem', fontFamily: '"Sora", sans-serif' }}>{rental.item?.code_name ?? '—'} · S/N {rental.item?.serial_no ?? '—'}</Typography>
            </Box>
          </Box>
        </InfoBox>

        {/* Renter */}
        <InfoBox label="Renter">
          <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
            {rental.renter ? `${rental.renter.renter_fname} ${rental.renter.renter_lname}` : '—'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {rental.renter?.mobile_no && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 13, color: AMBER }} />
                <Typography sx={{ color: MUTED, fontSize: '0.78rem' }}>{rental.renter.mobile_no}</Typography>
              </Box>
            )}
            {rental.renter?.email && (
              <Typography sx={{ color: MUTED, fontSize: '0.78rem' }}>✉ {rental.renter.email}</Typography>
            )}
            {rental.username && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <InstagramIcon sx={{ fontSize: 13, color: AMBER }} />
                <Typography sx={{ color: MUTED, fontSize: '0.78rem' }}>{rental.username}</Typography>
              </Box>
            )}
          </Box>
        </InfoBox>

        {/* Dates */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {[
            { label: 'Start Date', val: dayjs(rental.rent_date_start).format('MMM D, YYYY') },
            { label: 'End Date',   val: dayjs(rental.rent_date_end).format('MMM D, YYYY') },
            { label: 'Duration',   val: `${dayjs(rental.rent_date_end).diff(dayjs(rental.rent_date_start), 'day')} days` },
          ].map((d) => (
            <Box key={d.label} sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
              <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>{d.label}</Typography>
              <Typography sx={{ color: ESPRESSO, fontSize: '0.85rem', fontWeight: 600 }}>{d.val}</Typography>
            </Box>
          ))}
        </Box>

        {/* Logistics */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {[
            { label: 'Pick-up', val: rental.pickupBranch?.location_name ?? rental.delivery_addr ?? '—', hub: !!rental.hub_pick_up_addr },
            { label: 'Return',  val: rental.returnBranch?.location_name ?? rental.return_addr  ?? '—', hub: !!rental.hub_return_addr  },
          ].map((d) => (
            <Box key={d.label} sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                {d.hub ? <StorefrontIcon sx={{ fontSize: 12, color: AMBER }} /> : <LocalShippingIcon sx={{ fontSize: 12, color: AMBER }} />}
                <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.label}</Typography>
              </Box>
              <Typography sx={{ color: ESPRESSO, fontSize: '0.82rem', fontWeight: 600 }}>{d.val}</Typography>
              <Typography sx={{ color: MUTED, fontSize: '0.68rem' }}>{d.hub ? 'Hub' : 'Door'}</Typography>
            </Box>
          ))}
        </Box>

        {/* Optional fields */}
        {(rental.discount_code || rental.refund_info) && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {rental.discount_code && (
              <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
                <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.25 }}>Discount Code</Typography>
                <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.85rem' }}>{rental.discount_code}</Typography>
              </Box>
            )}
            {rental.refund_info && (
              <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
                <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.25 }}>Refund Info</Typography>
                <Typography sx={{ color: ESPRESSO, fontSize: '0.82rem' }}>{rental.refund_info}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Status editor */}
        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: MUTED }}>Update Status</InputLabel>
          <Select value={status} onChange={(e: SelectChangeEvent) => setStatus(e.target.value)} label="Update Status">
            {Object.entries(RENTAL_STATUS_META).map(([val, meta]) => (
              <MenuItem key={val} value={val}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                  {meta.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Rental List Dialog (stat card drill-down) ────────────────────────────────

interface RentalListDialogProps {
  title: string;
  rentals: EnrichedRental[];
  open: boolean;
  onClose: () => void;
  onSave: (id: string, status: string) => Promise<void>;
}

const RentalListDialog: React.FC<RentalListDialogProps> = ({ title, rentals, open, onClose, onSave }) => {
  const [detail, setDetail] = useState<EnrichedRental | null>(null);
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3, maxHeight: '80vh' } }}>
        <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          {title} <span style={{ color: AMBER, fontFamily: '"Sora", sans-serif', fontSize: '1rem', fontWeight: 700 }}>({rentals.length})</span>
          <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {rentals.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.85rem' }}>No rentals in this category.</Typography>
            </Box>
          ) : rentals.map((r) => {
            const meta = RENTAL_STATUS_META[r.status] ?? RENTAL_STATUS_META.submitted;
            return (
              <Box key={r.id}
                onClick={() => setDetail(r)}
                sx={{ px: 3, py: 2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', cursor: 'pointer', '&:hover': { background: 'rgba(201,151,58,0.04)' }, transition: 'background 0.15s' }}>
                {/* Thumb */}
                {r.item?.device?.device_img
                  ? <img src={r.item.device.device_img} alt="" style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                  : <Box sx={{ width: 44, height: 34, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CameraAltIcon sx={{ fontSize: 18, color: AMBER }} /></Box>}

                {/* Camera */}
                <Box sx={{ minWidth: 140 }}>
                  <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.85rem' }}>{r.item?.device?.cam_name ?? '—'}</Typography>
                  <Typography sx={{ color: AMBER, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif' }}>{r.item?.code_name ?? '—'}</Typography>
                </Box>

                {/* Renter */}
                <Box sx={{ minWidth: 140 }}>
                  <Typography sx={{ color: INK, fontSize: '0.82rem', fontWeight: 500 }}>{r.renter ? `${r.renter.renter_fname} ${r.renter.renter_lname}` : '—'}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>{r.renter?.mobile_no}</Typography>
                </Box>

                {/* Dates */}
                <Typography sx={{ color: MUTED, fontSize: '0.78rem' }}>
                  {dayjs(r.rent_date_start).format('MMM D')} – {dayjs(r.rent_date_end).format('MMM D, YYYY')}
                </Typography>

                <Chip label={meta.label} size="small" sx={{ ml: 'auto', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem' }} />
              </Box>
            );
          })}
        </DialogContent>
      </Dialog>
      <RentalDetailDialog rental={detail} open={!!detail} onClose={() => setDetail(null)} onSave={onSave} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 0 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewTab: React.FC<{ rentals: EnrichedRental[]; onSave: (id: string, status: string) => Promise<void> }> = ({ rentals, onSave }) => {
  const today = dayjs();
  const [listDialog, setListDialog] = useState<{ title: string; items: EnrichedRental[] } | null>(null);

  // Next 3 distinct upcoming start dates
  const upcomingDates = [...new Set(
    rentals
      .filter((r) => r.status !== 'completed' && dayjs(r.rent_date_start).isSameOrAfter(today, 'day'))
      .map((r) => dayjs(r.rent_date_start).format('YYYY-MM-DD'))
      .sort()
  )].slice(0, 3);

  const upcomingGroups = upcomingDates.map((ds) => ({
    date: dayjs(ds),
    rentals: rentals.filter((r) => dayjs(r.rent_date_start).format('YYYY-MM-DD') === ds),
  }));

  // Monthly chart
  const monthlyData = MONTHS.map((month, i) => ({
    month,
    count: rentals.filter((r) => { const d = dayjs(r.created_at); return d.year() === today.year() && d.month() === i; }).length,
    rentals: rentals.filter((r) => { const d = dayjs(r.created_at); return d.year() === today.year() && d.month() === i; }),
  }));

  // Top cameras this month
  const thisMonth = rentals.filter((r) => { const d = dayjs(r.created_at); return d.year() === today.year() && d.month() === today.month(); });
  const devMap: Record<string, { name: string; count: number; rentals: EnrichedRental[] }> = {};
  thisMonth.forEach((r) => {
    const name = r.item?.device?.cam_name ?? 'Unknown';
    const key  = r.item?.device_id_fk ?? 'unknown';
    if (!devMap[key]) devMap[key] = { name, count: 0, rentals: [] };
    devMap[key].count += 1;
    devMap[key].rentals.push(r);
  });
  const topDevices = Object.values(devMap).sort((a, b) => b.count - a.count).slice(0, 6);

  // Stat cards
  const statCards = [
    { label: 'Total Rentals',    color: AMBER,      items: rentals },
    { label: 'This Month',       color: AMBER_LIGHT, items: thisMonth },
    { label: 'Active / Renting', color: '#2E7D32',  items: rentals.filter((r) => r.status === 'renting') },
    { label: 'Pending Review',   color: '#1565C0',  items: rentals.filter((r) => r.status === 'submitted' || r.status === 'in-review') },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* ── Stat cards ── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {statCards.map((s) => (
          <Paper
            key={s.label} elevation={0}
            onClick={() => setListDialog({ title: s.label, items: s.items })}
            sx={{ flex: '1 1 130px', p: 2.5, borderRadius: 3, textAlign: 'center', background: CARD_BG, border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: '0 6px 24px rgba(201,151,58,0.14)', transform: 'translateY(-2px)' } }}
          >
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: s.color, fontFamily: '"Sora", sans-serif', lineHeight: 1, mb: 0.5 }}>
              {s.items.length}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: MUTED, fontFamily: '"Sora", sans-serif' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: AMBER, fontFamily: '"Sora", sans-serif', mt: 0.5 }}>Click to view →</Typography>
          </Paper>
        ))}
      </Box>

      {/* ── Upcoming rental dates ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <CalendarTodayIcon sx={{ color: AMBER, fontSize: 18 }} />
          <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Next 3 Rental Dates
          </Typography>
        </Box>

        {upcomingGroups.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: `1.5px dashed ${BORDER}`, background: 'rgba(201,151,58,0.02)' }}>
            <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.85rem' }}>No upcoming rentals</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcomingGroups.map(({ date, rentals: group }) => (
              <Paper key={date.format('YYYY-MM-DD')} elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${BORDER}`, background: CARD_BG }}>
                {/* Date header */}
                <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, background: 'linear-gradient(90deg, rgba(201,151,58,0.10), rgba(201,151,58,0.03))', borderBottom: `1px solid ${BORDER}` }}>
                  <Box sx={{ textAlign: 'center', minWidth: 44 }}>
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: AMBER, fontFamily: '"Sora", sans-serif', lineHeight: 1 }}>{date.format('D')}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: AMBER_DARK, fontFamily: '"Sora", sans-serif', textTransform: 'uppercase' }}>{date.format('MMM')}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: BORDER }} />
                  <Box>
                    <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.9rem' }}>{date.format('dddd')}</Typography>
                    <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif' }}>{group.length} rental{group.length !== 1 ? 's' : ''} starting</Typography>
                  </Box>
                </Box>

                {/* Rental rows */}
                {group.map((r) => {
                  const meta = RENTAL_STATUS_META[r.status] ?? RENTAL_STATUS_META.submitted;
                  return (
                    <Box key={r.id} sx={{ px: 3, py: 1.8, borderBottom: `1px solid rgba(201,151,58,0.06)`, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, '&:last-child': { borderBottom: 'none' }, '&:hover': { background: 'rgba(201,151,58,0.04)' }, transition: 'background 0.15s', cursor: 'default' }}>
                      {r.item?.device?.device_img
                        ? <img src={r.item.device.device_img} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 5, border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                        : <Box sx={{ width: 40, height: 30, borderRadius: 1, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CameraAltIcon sx={{ fontSize: 16, color: AMBER }} /></Box>}
                      <Box sx={{ minWidth: 150 }}>
                        <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.85rem' }}>{r.item?.device?.cam_name ?? '—'}</Typography>
                        <Typography sx={{ color: AMBER, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif' }}>{r.item?.code_name ?? '—'}</Typography>
                      </Box>
                      <Box sx={{ minWidth: 140 }}>
                        <Typography sx={{ color: INK, fontSize: '0.82rem', fontWeight: 500 }}>{r.renter ? `${r.renter.renter_fname} ${r.renter.renter_lname}` : '—'}</Typography>
                        <Typography sx={{ color: MUTED, fontSize: '0.7rem' }}>{r.renter?.mobile_no ?? ''}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: MUTED, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Returns</Typography>
                        <Typography sx={{ color: INK, fontSize: '0.8rem', fontWeight: 500 }}>{dayjs(r.rent_date_end).format('MMM D, YYYY')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {r.hub_pick_up_addr
                          ? <><StorefrontIcon sx={{ fontSize: 13, color: MUTED }} /><Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Hub</Typography></>
                          : <><LocalShippingIcon sx={{ fontSize: 13, color: MUTED }} /><Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Delivery</Typography></>}
                      </Box>
                      <Chip label={meta.label} size="small" sx={{ ml: 'auto', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                    </Box>
                  );
                })}
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Charts ── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>

        {/* Bar chart — clickable bars */}
        <Paper elevation={0} sx={{ flex: '2 1 340px', p: 3, borderRadius: 3, background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <TrendingUpIcon sx={{ color: AMBER, fontSize: 18 }} />
            <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Rentals This Year
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem', ml: 'auto' }}>Click a bar to see details</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}
              onClick={(data) => {
                if (data?.activePayload?.[0]) {
                  const item = data.activePayload[0].payload as typeof monthlyData[0];
                  if (item.rentals.length > 0) setListDialog({ title: `Rentals — ${item.month} ${today.year()}`, items: item.rentals });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 11, fontFamily: '"Sora", sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip
                cursor={{ fill: 'rgba(201,151,58,0.06)' }}
                contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: '"Sora", sans-serif', fontSize: 12, color: ESPRESSO }}
                labelStyle={{ color: AMBER_DARK, fontWeight: 600 }}
              />
              <Bar dataKey="count" name="Rentals" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === today.month() ? AMBER : `rgba(201,151,58,0.35)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Top cameras */}
        <Paper elevation={0} sx={{ flex: '1 1 240px', p: 3, borderRadius: 3, background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <CameraAltIcon sx={{ color: AMBER, fontSize: 18 }} />
            <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Top Cameras — {MONTHS[today.month()]}
            </Typography>
          </Box>
          {topDevices.length === 0
            ? <Typography sx={{ color: MUTED, fontSize: '0.82rem', fontFamily: '"Sora", sans-serif' }}>No rentals this month yet.</Typography>
            : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {topDevices.map((d, i) => (
                  <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    onClick={() => setListDialog({ title: `${d.name} — This Month`, items: d.rentals })}>
                    <Typography sx={{ color: i === 0 ? AMBER : MUTED, fontFamily: '"Sora", sans-serif', fontWeight: 800, fontSize: '1.1rem', minWidth: 22 }}>{i + 1}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: ESPRESSO, fontSize: '0.82rem', fontWeight: 600 }}>{d.name}</Typography>
                      <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', borderRadius: 2, background: i === 0 ? `linear-gradient(90deg, ${AMBER}, ${AMBER_LIGHT})` : 'rgba(201,151,58,0.4)', width: `${(d.count / (topDevices[0]?.count || 1)) * 100}%`, transition: 'width 0.6s ease' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ color: AMBER, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.85rem', minWidth: 20, textAlign: 'right' }}>{d.count}</Typography>
                  </Box>
                ))}
              </Box>}
        </Paper>
      </Box>

      {/* Stat drill-down dialog */}
      {listDialog && (
        <RentalListDialog
          title={listDialog.title} rentals={listDialog.items}
          open={!!listDialog} onClose={() => setListDialog(null)} onSave={onSave}
        />
      )}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — CALENDAR  (Teams-style continuous span bars, renter first name label)
// ═══════════════════════════════════════════════════════════════════════════════

const CalendarTab: React.FC<{ rentals: EnrichedRental[]; items: EnrichedItem[]; onSave: (id: string, status: string) => Promise<void> }> = ({ rentals, items, onSave }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [selectedRental, setSelectedRental] = useState<EnrichedRental | null>(null);

  const calStart = currentMonth.startOf('month').startOf('week');
  const calEnd   = currentMonth.endOf('month').endOf('week');

  const days: Dayjs[] = [];
  let cur = calStart;
  while (cur.isSameOrBefore(calEnd, 'day')) { days.push(cur); cur = cur.add(1, 'day'); }

  const weeks: Dayjs[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const filtered = selectedCamera === 'all' ? rentals : rentals.filter((r) => r.cam_name_id_fk === selectedCamera);

  // Assign a stable row slot per rental within the grid to avoid overlap
  const getSlot = (() => {
    const slotMap: Record<string, number> = {};
    filtered.forEach((r, idx) => { slotMap[r.id] = idx % 3; });
    return (id: string) => slotMap[id] ?? 0;
  })();

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))} size="small" sx={{ color: AMBER, border: `1px solid ${BORDER}`, '&:hover': { background: 'rgba(201,151,58,0.08)' } }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.2rem', minWidth: 180, textAlign: 'center' }}>
            {currentMonth.format('MMMM YYYY')}
          </Typography>
          <IconButton onClick={() => setCurrentMonth((m) => m.add(1, 'month'))} size="small" sx={{ color: AMBER, border: `1px solid ${BORDER}`, '&:hover': { background: 'rgba(201,151,58,0.08)' } }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel sx={{ color: MUTED, fontSize: '0.82rem' }}>Filter by camera</InputLabel>
          <Select value={selectedCamera} onChange={(e: SelectChangeEvent) => setSelectedCamera(e.target.value)} label="Filter by camera">
            <MenuItem value="all">All cameras</MenuItem>
            {items.map((it) => (
              <MenuItem key={it.id} value={it.id}>
                <Typography sx={{ fontSize: '0.82rem' }}>{it.device?.cam_name ?? '—'} · {it.code_name}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DAYS.map((d) => (
          <Box key={d} sx={{ textAlign: 'center', py: 0.75 }}>
            <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{d}</Typography>
          </Box>
        ))}
      </Box>

      {/* Weekly rows — Teams-style spanning bars */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {weeks.map((week, wi) => {
          // Which rentals are visible in this week?
          const weekStart = week[0];
          const weekEnd   = week[6];

          const weekRentals = filtered.filter((r) => {
            const rStart = dayjs(r.rent_date_start);
            const rEnd   = dayjs(r.rent_date_end);
            return rStart.isSameOrBefore(weekEnd, 'day') && rEnd.isSameOrAfter(weekStart, 'day');
          });

          return (
            <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', position: 'relative' }}>
              {/* Day cells */}
              {week.map((day) => {
                const isCurrentMonth = day.month() === currentMonth.month();
                const isToday        = day.isSame(dayjs(), 'day');
                return (
                  <Box key={day.format('YYYY-MM-DD')} sx={{
                    minHeight: 80,
                    borderRadius: 1.5,
                    border: isToday ? `1.5px solid ${AMBER}` : `1px solid ${BORDER}`,
                    background: isCurrentMonth ? CARD_BG : 'rgba(201,151,58,0.02)',
                    pt: 0.75, px: 0.75, pb: 3.5,
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', fontFamily: '"Sora", sans-serif', fontWeight: isToday ? 800 : 500, color: isToday ? AMBER : isCurrentMonth ? ESPRESSO : MUTED, lineHeight: 1 }}>
                      {day.format('D')}
                    </Typography>
                  </Box>
                );
              })}

              {/* Spanning rental bars — drawn absolutely over the cells */}
              {weekRentals.map((r) => {
                const rStart  = dayjs(r.rent_date_start);
                const rEnd    = dayjs(r.rent_date_end);
                const barStart = rStart.isBefore(weekStart, 'day') ? 0 : rStart.day();
                const barEnd   = rEnd.isAfter(weekEnd, 'day')     ? 6 : rEnd.day();
                const spanCols = barEnd - barStart + 1;
                const isStart  = rStart.isSameOrAfter(weekStart, 'day') && rStart.isSameOrBefore(weekEnd, 'day');
                const isEnd    = rEnd.isSameOrAfter(weekStart, 'day')   && rEnd.isSameOrBefore(weekEnd, 'day');
                const slot     = getSlot(r.id);
                const meta     = RENTAL_STATUS_META[r.status] ?? RENTAL_STATUS_META.submitted;
                const firstName = r.renter?.renter_fname ?? r.item?.code_name ?? '?';

                return (
                  <Box
                    key={r.id}
                    onClick={() => setSelectedRental(r)}
                    sx={{
                      position: 'absolute',
                      top: `${28 + slot * 20}px`,
                      left:  `calc(${(barStart / 7) * 100}% + 3px)`,
                      width: `calc(${(spanCols / 7) * 100}% - 6px)`,
                      height: 17,
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderRadius: isStart && isEnd ? '6px' : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : '0',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', px: 0.75,
                      overflow: 'hidden',
                      '&:hover': { filter: 'brightness(0.93)', zIndex: 10 },
                      transition: 'filter 0.12s',
                      zIndex: 5,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.6rem', color: meta.color, fontFamily: '"Sora", sans-serif', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isStart && firstName}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2.5 }}>
        {Object.entries(RENTAL_STATUS_META).map(([key, meta]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 24, height: 10, borderRadius: 1, background: meta.bg, border: `1px solid ${meta.border}` }} />
            <Typography sx={{ color: MUTED, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif' }}>{meta.label}</Typography>
          </Box>
        ))}
      </Box>

      <RentalDetailDialog rental={selectedRental} open={!!selectedRental} onClose={() => setSelectedRental(null)} onSave={onSave} />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

const ImageViewDialog: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => (
  <Dialog open={!!src} onClose={onClose} maxWidth="md"
    PaperProps={{ sx: { background: 'transparent', boxShadow: 'none' } }}>
    <Box sx={{ position: 'relative' }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', zIndex: 10, '&:hover': { background: 'rgba(0,0,0,0.8)' } }}>
        <CloseIcon />
      </IconButton>
      {src && <img src={src} alt="full-size" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />}
    </Box>
  </Dialog>
);

const AddDeviceDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const [camName, setCamName] = useState('');
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => { setImgFile(f); setPreview(f ? URL.createObjectURL(f) : ''); };

  const handleSave = async () => {
    if (!camName.trim()) { setError('Camera name is required'); return; }
    setSaving(true); setError('');
    try {
      let device_img: string | null = null;
      if (imgFile) {
        const path = `devices/${Date.now()}_${imgFile.name}`;
        const { data, error: upErr } = await supabase.storage.from('verification-images').upload(path, imgFile, { upsert: true });
        if (upErr) throw new Error(upErr.message);
        device_img = supabase.storage.from('verification-images').getPublicUrl(data.path).data.publicUrl;
      }
      const { error: insErr } = await supabase.from('RB_DEVICES').insert({ cam_name: camName, device_img });
      if (insErr) throw new Error(insErr.message);
      onSaved(); onClose(); setCamName(''); setImgFile(null); setPreview('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add Camera Type <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <input type="text" placeholder="Camera name" value={camName} onChange={(e) => { setCamName(e.target.value); setError(''); }}
          style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem', color: ESPRESSO, background: CARD_BG, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        {error && <Typography sx={{ color: '#C0392B', fontSize: '0.78rem' }}>{error}</Typography>}
        <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        {preview
          ? <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
              <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
              <IconButton onClick={() => handleFile(null)} size="small" sx={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff' }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          : <Box onClick={() => fileRef.current?.click()} sx={{ border: `1.5px dashed ${BORDER}`, borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: AMBER, background: 'rgba(201,151,58,0.04)' } }}>
              <UploadFileIcon sx={{ color: MUTED, fontSize: 32, mb: 0.5 }} />
              <Typography sx={{ color: MUTED, fontSize: '0.78rem', fontFamily: '"Sora", sans-serif' }}>Click to upload image</Typography>
            </Box>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

const AddItemDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void; devices: RbDevice[]; branches: RbBranch[]; createdBy: string }> = ({ open, onClose, onSaved, devices, branches, createdBy }) => {
  const [deviceId, setDeviceId]   = useState('');
  const [codeName, setCodeName]   = useState('');
  const [serialNo, setSerialNo]   = useState('');
  const [branchId, setBranchId]   = useState('');
  const [gps, setGps]             = useState(false);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!deviceId)        e.deviceId = 'Select a camera type';
    if (!codeName.trim()) e.codeName = 'Code name required';
    if (!serialNo.trim()) e.serialNo = 'Serial number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSubmitErr('');
    try {
      const { error } = await supabase.from('RB_ITEM').insert({ device_id_fk: deviceId, code_name: codeName, serial_no: serialNo, branch_id: branchId || null, gps_installed: gps, current_condition: 'working', status: 'Available', created_by: createdBy });
      if (error) throw new Error(error.message);
      onSaved(); onClose();
      setDeviceId(''); setCodeName(''); setSerialNo(''); setBranchId(''); setGps(false);
    } catch (e: unknown) { setSubmitErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add Camera Unit <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <FormControl fullWidth size="small" error={!!errors.deviceId}>
          <InputLabel>Camera Type</InputLabel>
          <Select value={deviceId} onChange={(e: SelectChangeEvent) => { setDeviceId(e.target.value); setErrors((p) => ({ ...p, deviceId: '' })); }} label="Camera Type">
            {devices.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {d.device_img && <img src={d.device_img} alt="" style={{ width: 32, height: 28, objectFit: 'cover', borderRadius: 4 }} />}
                  {d.cam_name}
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors.deviceId && <FormHelperText>{errors.deviceId}</FormHelperText>}
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[{ label: 'Code Name', val: codeName, key: 'codeName', set: setCodeName }, { label: 'Serial No.', val: serialNo, key: 'serialNo', set: setSerialNo }].map((f) => (
            <Box key={f.key} sx={{ flex: 1 }}>
              <input placeholder={f.label} value={f.val} onChange={(e) => { f.set(e.target.value); setErrors((p) => ({ ...p, [f.key]: '' })); }}
                style={{ padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${errors[f.key] ? '#C0392B' : BORDER}`, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem', color: ESPRESSO, background: CARD_BG, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              {errors[f.key] && <Typography sx={{ color: '#C0392B', fontSize: '0.72rem', mt: 0.25 }}>{errors[f.key]}</Typography>}
            </Box>
          ))}
        </Box>
        <FormControl fullWidth size="small">
          <InputLabel>Branch (optional)</InputLabel>
          <Select value={branchId} onChange={(e: SelectChangeEvent) => setBranchId(e.target.value)} label="Branch (optional)">
            <MenuItem value=""><em>No specific branch</em></MenuItem>
            {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.location_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={gps} onChange={(e) => setGps(e.target.checked)} />}
          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><GpsFixedIcon sx={{ fontSize: 16, color: AMBER }} /><Typography sx={{ color: INK, fontSize: '0.85rem' }}>GPS Installed</Typography></Box>}
        />
        {submitErr && <Typography sx={{ color: '#C0392B', fontSize: '0.8rem' }}>{submitErr}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>Add Unit</Button>
      </DialogActions>
    </Dialog>
  );
};

const EditItemDialog: React.FC<{ item: EnrichedItem | null; open: boolean; onClose: () => void; onSaved: () => void }> = ({ item, open, onClose, onSaved }) => {
  const [status, setStatus]       = useState<ItemStatus>('Available');
  const [condition, setCondition] = useState<ItemCondition>('working');
  const [imgFile, setImgFile]     = useState<File | null>(null);
  const [preview, setPreview]     = useState('');
  const [saving, setSaving]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) { setStatus(item.status); setCondition(item.current_condition); setPreview(item.device?.device_img ?? ''); setImgFile(null); }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (imgFile && item.device_id_fk) {
        const path = `devices/${Date.now()}_${imgFile.name}`;
        const { data, error } = await supabase.storage.from('verification-images').upload(path, imgFile, { upsert: true });
        if (!error) {
          const url = supabase.storage.from('verification-images').getPublicUrl(data.path).data.publicUrl;
          await supabase.from('RB_DEVICES').update({ device_img: url }).eq('id', item.device_id_fk);
        }
      }
      await supabase.from('RB_ITEM').update({ status, current_condition: condition }).eq('id', item.id);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit — {item.code_name} <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <Box>
          <SectionChip label="Device Image" />
          <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0] ?? null; setImgFile(f); if (f) setPreview(URL.createObjectURL(f)); }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: 110, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />
              : <Box sx={{ width: 110, height: 80, borderRadius: 2, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 28, color: AMBER }} /></Box>}
            <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>Replace Image</Button>
          </Box>
        </Box>
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select value={status} onChange={(e: SelectChangeEvent) => setStatus(e.target.value as ItemStatus)} label="Status">
            {ITEM_STATUSES.map((s) => {
              const sc = ITEM_STATUS_COLORS[s];
              return <MenuItem key={s} value={s}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />{s}</Box></MenuItem>;
            })}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Condition</InputLabel>
          <Select value={condition} onChange={(e: SelectChangeEvent) => setCondition(e.target.value as ItemCondition)} label="Condition">
            <MenuItem value="working">Working</MenuItem>
            <MenuItem value="damaged">Damaged</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

const InventoryTab: React.FC<{ items: EnrichedItem[]; devices: RbDevice[]; branches: RbBranch[]; isAdmin: boolean; createdBy: string; onRefresh: () => void }> = ({ items, devices, branches, isAdmin, createdBy, onRefresh }) => {
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [addItemOpen, setAddItemOpen]     = useState(false);
  const [editItem, setEditItem]           = useState<EnrichedItem | null>(null);
  const [viewImg, setViewImg]             = useState<string | null>(null);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.15rem' }}>
          Camera Inventory <span style={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontWeight: 400, fontSize: '0.8rem' }}>({items.length} units)</span>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isAdmin && (
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddDeviceOpen(true)}>Add Camera Type</Button>
          )}
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddItemOpen(true)}>Add Unit</Button>
        </Box>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 150px 120px 60px 60px', gap: 1, px: 2, py: 1.25, borderBottom: `1.5px solid ${BORDER}`, background: 'rgba(201,151,58,0.04)', borderRadius: '10px 10px 0 0' }}>
            {['Image', 'Camera · Code', 'Serial No.', 'Status', 'Condition', 'GPS', ''].map((h) => (
              <Typography key={h} sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</Typography>
            ))}
          </Box>

          {/* Rows */}
          {items.length === 0
            ? <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.85rem' }}>No items yet.</Typography></Box>
            : items.map((item, idx) => {
                const sc = ITEM_STATUS_COLORS[item.status] ?? ITEM_STATUS_COLORS['Available'];
                return (
                  <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 150px 120px 60px 60px', gap: 1, px: 2, py: 1.5, alignItems: 'center', borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? CARD_BG : 'rgba(201,151,58,0.015)', '&:hover': { background: 'rgba(201,151,58,0.06)' }, transition: 'background 0.15s', '&:last-child': { borderBottom: 'none', borderRadius: '0 0 10px 10px' } }}>
                    {/* Image — clickable */}
                    <Box sx={{ position: 'relative', width: 60, cursor: item.device?.device_img ? 'pointer' : 'default' }} onClick={() => item.device?.device_img && setViewImg(item.device.device_img)}>
                      {item.device?.device_img
                        ? <>
                            <img src={item.device.device_img} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 7, border: `1px solid ${BORDER}`, display: 'block' }} />
                            <Box sx={{ position: 'absolute', inset: 0, borderRadius: 7, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s', '&:hover': { background: 'rgba(0,0,0,0.28)', opacity: 1 } }}>
                              <ZoomInIcon sx={{ color: '#fff', fontSize: 20 }} />
                            </Box>
                          </>
                        : <Box sx={{ width: 60, height: 44, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 22, color: AMBER }} /></Box>}
                    </Box>

                    {/* Name + code */}
                    <Box>
                      <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.85rem' }}>{item.device?.cam_name ?? '—'}</Typography>
                      <Typography sx={{ color: AMBER, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif' }}>{item.code_name}</Typography>
                    </Box>

                    {/* Serial */}
                    <Typography sx={{ color: MUTED, fontSize: '0.78rem', fontFamily: 'monospace' }}>{item.serial_no}</Typography>

                    {/* Status */}
                    <Chip label={item.status} size="small" sx={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem', height: 22, width: 'fit-content' }} />

                    {/* Condition */}
                    <Chip label={item.current_condition} size="small" sx={{ background: item.current_condition === 'working' ? 'rgba(105,219,124,0.1)' : 'rgba(211,47,47,0.1)', color: item.current_condition === 'working' ? '#2E7D32' : '#B71C1C', border: `1px solid ${item.current_condition === 'working' ? 'rgba(105,219,124,0.3)' : 'rgba(211,47,47,0.3)'}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem', height: 22, textTransform: 'capitalize', width: 'fit-content' }} />

                    {/* GPS */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      {item.gps_installed ? <GpsFixedIcon sx={{ fontSize: 16, color: '#2E7D32' }} /> : <Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>—</Typography>}
                    </Box>

                    {/* Edit */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title="Edit unit">
                        <IconButton size="small" onClick={() => setEditItem(item)} sx={{ color: MUTED, '&:hover': { color: AMBER } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
        </Box>
      </Box>

      <AddDeviceDialog open={addDeviceOpen} onClose={() => setAddDeviceOpen(false)} onSaved={onRefresh} />
      <AddItemDialog   open={addItemOpen}   onClose={() => setAddItemOpen(false)}   onSaved={onRefresh} devices={devices} branches={branches} createdBy={createdBy} />
      <EditItemDialog  item={editItem}       open={!!editItem}                       onClose={() => setEditItem(null)} onSaved={onRefresh} />
      <ImageViewDialog src={viewImg}         onClose={() => setViewImg(null)} />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT + TOP BAR
// ═══════════════════════════════════════════════════════════════════════════════

const TopBar: React.FC<{ rbUser: RbUser; tab: number; onTab: (t: number) => void; onLogout: () => void }> = ({ rbUser, tab, onTab, onLogout }) => (
  <Box sx={{
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(255,251,244,0.96)', backdropFilter: 'blur(14px)',
    borderBottom: `1px solid ${BORDER}`,
    boxShadow: '0 1px 8px rgba(201,151,58,0.07)',
    px: { xs: 2, md: 4 }, py: 0,
    display: 'flex', alignItems: 'center', gap: 2, minHeight: 60,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 3, flexShrink: 0 }}>
      <AdminPanelSettingsIcon sx={{ color: AMBER, fontSize: 22 }} />
      <Typography sx={{ fontFamily: '"Playfair Display", serif', color: ESPRESSO, fontWeight: 700, fontSize: '1rem', display: { xs: 'none', sm: 'block' } }}>recap buddies</Typography>
      <Chip label={rbUser.role.toUpperCase()} size="small" sx={{ background: 'rgba(201,151,58,0.15)', color: AMBER_DARK, border: `1px solid ${BORDER}`, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', height: 20 }} />
    </Box>

    <Tabs value={tab} onChange={(_, v) => onTab(v)} sx={{
      flex: 1,
      '& .MuiTabs-indicator': { background: AMBER, height: 2 },
      '& .MuiTab-root': { color: MUTED, minHeight: 60, textTransform: 'none', fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.82rem', '&.Mui-selected': { color: AMBER_DARK } },
    }}>
      <Tab icon={<DashboardIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Overview" />
      <Tab icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Calendar" />
      <Tab icon={<InventoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Inventory" />
    </Tabs>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
      <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${AMBER}, ${AMBER_LIGHT})`, fontSize: '0.85rem', fontWeight: 700, fontFamily: '"Sora", sans-serif', color: '#fff' }}>
        {rbUser.user_fname[0]?.toUpperCase()}
      </Avatar>
      <Typography sx={{ color: MUTED, fontSize: '0.8rem', fontFamily: '"Sora", sans-serif', display: { xs: 'none', md: 'block' } }}>{rbUser.user_fname}</Typography>
      <Tooltip title="Sign out">
        <IconButton onClick={onLogout} size="small" sx={{ color: MUTED, '&:hover': { color: '#C0392B' } }}><LogoutIcon fontSize="small" /></IconButton>
      </Tooltip>
    </Box>
  </Box>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab]           = useState(0);
  const [rbUser, setRbUser]     = useState<RbUser | null>(null);
  const [rentals, setRentals]   = useState<EnrichedRental[]>([]);
  const [items, setItems]       = useState<EnrichedItem[]>([]);
  const [devices, setDevices]   = useState<RbDevice[]>([]);
  const [branches, setBranches] = useState<RbBranch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [authUid, setAuthUid]   = useState('');

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/admin/login'); return; }
    setAuthUid(user.id);

    const { data: rbUserData } = await supabase.from('RB_USER').select('*').eq('auth_user_id', user.id).single();
    if (!rbUserData) { navigate('/admin/login'); return; }
    setRbUser(rbUserData as RbUser);

    const [{ data: devsRaw }, { data: branchesRaw }, { data: itemsRaw }, { data: rentalsRaw }] = await Promise.all([
      supabase.from('RB_DEVICES').select('*').order('cam_name'),
      supabase.from('RB_BRANCHES').select('*').order('location_name'),
      supabase.from('RB_ITEM').select('*, device:RB_DEVICES(id,cam_name,device_img)').order('created_at', { ascending: false }),
      supabase.from('RB_RENTAL_FORM').select('*').order('created_at', { ascending: false }),
    ]);

    setDevices(devsRaw ?? []);
    setBranches(branchesRaw ?? []);

    const enrichedItems: EnrichedItem[] = (itemsRaw ?? []) as EnrichedItem[];
    setItems(enrichedItems);

    const devMap: Record<string, RbDevice> = {};
    (devsRaw ?? []).forEach((d: RbDevice) => { devMap[d.id] = d; });

    if (rentalsRaw && rentalsRaw.length > 0) {
      const itemIds   = [...new Set((rentalsRaw as RbRentalForm[]).map((r) => r.cam_name_id_fk).filter(Boolean))] as string[];
      const renterIds = [...new Set((rentalsRaw as RbRentalForm[]).map((r) => r.rental_id_fk).filter(Boolean))] as string[];
      const bIds      = [...new Set([(rentalsRaw as RbRentalForm[]).flatMap((r) => [r.hub_pick_up_addr, r.hub_return_addr]).filter(Boolean)])].flat() as string[];

      const [{ data: rentItemsRaw }, { data: rentersRaw }, { data: rentBranchesRaw }] = await Promise.all([
        itemIds.length   ? supabase.from('RB_ITEM').select('*, device:RB_DEVICES(id,cam_name,device_img)').in('id', itemIds) : Promise.resolve({ data: [] }),
        renterIds.length ? supabase.from('RB_RENTER').select('*').in('id', renterIds)                                        : Promise.resolve({ data: [] }),
        bIds.length      ? supabase.from('RB_BRANCHES').select('*').in('id', bIds)                                           : Promise.resolve({ data: [] }),
      ]);

      const iMap: Record<string, EnrichedItem>  = {};
      const rMap: Record<string, RbRenter>      = {};
      const bMap: Record<string, RbBranch>      = {};
      (rentItemsRaw  ?? []).forEach((it: EnrichedItem) => { iMap[it.id] = it; });
      (rentersRaw    ?? []).forEach((r: RbRenter)      => { rMap[r.id]  = r; });
      (rentBranchesRaw ?? []).forEach((b: RbBranch)   => { bMap[b.id]  = b; });

      setRentals((rentalsRaw as RbRentalForm[]).map((r) => ({
        ...r,
        item:         r.cam_name_id_fk   ? iMap[r.cam_name_id_fk]     : undefined,
        renter:       r.rental_id_fk     ? rMap[r.rental_id_fk]        : undefined,
        pickupBranch: r.hub_pick_up_addr  ? bMap[r.hub_pick_up_addr]  : undefined,
        returnBranch: r.hub_return_addr   ? bMap[r.hub_return_addr]   : undefined,
      })));
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveStatus = useCallback(async (id: string, status: string) => {
    await supabase.from('RB_RENTAL_FORM').update({ status }).eq('id', id);
    await fetchAll();
  }, [fetchAll]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: CREAM, flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: AMBER }} />
        <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.82rem' }}>Loading dashboard…</Typography>
      </Box>
    );
  }
  if (!rbUser) return null;

  return (
    <Box sx={{ minHeight: '100vh', background: '#F5EFE4' }}>
      <TopBar rbUser={rbUser} tab={tab} onTab={setTab} onLogout={handleLogout} />
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: 1400, mx: 'auto' }}>
        {tab === 0 && <OverviewTab rentals={rentals} onSave={handleSaveStatus} />}
        {tab === 1 && <CalendarTab rentals={rentals} items={items} onSave={handleSaveStatus} />}
        {tab === 2 && <InventoryTab items={items} devices={devices} branches={branches} isAdmin={rbUser.role === 'admin'} createdBy={authUid} onRefresh={fetchAll} />}
      </Box>
    </Box>
  );
};

export default AdminDashboard;