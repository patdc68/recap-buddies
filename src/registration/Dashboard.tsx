import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress,
  Alert, Divider, Tabs, Tab, Avatar,
} from '@mui/material';
import CameraAltIcon          from '@mui/icons-material/CameraAlt';
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import LocationOnIcon         from '@mui/icons-material/LocationOn';
import AddCircleOutlineIcon   from '@mui/icons-material/AddCircleOutline';
import LogoutIcon             from '@mui/icons-material/Logout';
import HourglassTopIcon       from '@mui/icons-material/HourglassTop';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon            from '@mui/icons-material/Pending';
import StorefrontIcon         from '@mui/icons-material/Storefront';
import LocalShippingIcon      from '@mui/icons-material/LocalShipping';
import CameraIcon             from '@mui/icons-material/Camera';
import CancelIcon             from '@mui/icons-material/Cancel';
import BlockIcon              from '@mui/icons-material/Block';
import GpsFixedIcon           from '@mui/icons-material/GpsFixed';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import LocalOfferIcon         from '@mui/icons-material/LocalOffer';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbRenter, RbRentalForm, RbItem, RbDevice, RbBranch, RentalStatus } from '../service/supabaseClient';
import PageLayout from '../components/PageLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedItem extends RbItem { device?: RbDevice; }

interface EnrichedRental extends RbRentalForm {
  item?:         EnrichedItem;
  pickupBranch?: RbBranch;
  returnBranch?: RbBranch;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RentalStatus, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'Submitted',
    bg: 'rgba(255,212,59,0.10)', color: '#B8860B', border: 'rgba(255,212,59,0.30)',
    icon: <PendingIcon sx={{ fontSize: 14 }} />,
  },
  'in-review': {
    label: 'In Review',
    bg: 'rgba(100,149,237,0.10)', color: '#1565C0', border: 'rgba(100,149,237,0.30)',
    icon: <HourglassTopIcon sx={{ fontSize: 14 }} />,
  },
  renting: {
    label: 'Renting',
    bg: 'rgba(201,151,58,0.12)', color: '#7A4F00', border: 'rgba(201,151,58,0.40)',
    icon: <CameraIcon sx={{ fontSize: 14 }} />,
  },
  'for-delivery': {
    label: 'For Delivery',
    bg: 'rgba(100,149,237,0.12)', color: '#1565C0', border: 'rgba(100,149,237,0.35)',
    icon: <LocalShippingIcon sx={{ fontSize: 14 }} />,
  },
  delivered: {
    label: 'Delivered',
    bg: 'rgba(100,149,237,0.08)', color: '#1A237E', border: 'rgba(100,149,237,0.25)',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  },
  'for-return': {
    label: 'For Return',
    bg: 'rgba(255,165,0,0.12)', color: '#E65100', border: 'rgba(255,165,0,0.35)',
    icon: <LocalShippingIcon sx={{ fontSize: 14 }} />,
  },
  'for-refund': {
    label: 'For Refund',
    bg: 'rgba(156,39,176,0.10)', color: '#6A1B9A', border: 'rgba(156,39,176,0.30)',
    icon: <LocalOfferIcon sx={{ fontSize: 14 }} />,
  },
  'for-penalty': {
    label: 'For Penalty',
    bg: 'rgba(211,47,47,0.10)', color: '#B71C1C', border: 'rgba(211,47,47,0.30)',
    icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  },
  completed: {
    label: 'Completed',
    bg: 'rgba(105,219,124,0.10)', color: '#2E7D32', border: 'rgba(105,219,124,0.30)',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  },
  canceled: {
    label: 'Canceled',
    bg: 'rgba(120,120,120,0.10)', color: '#555555', border: 'rgba(120,120,120,0.25)',
    icon: <CancelIcon sx={{ fontSize: 14 }} />,
  },
  declined: {
    label: 'Declined',
    bg: 'rgba(211,47,47,0.08)', color: '#B71C1C', border: 'rgba(211,47,47,0.25)',
    icon: <BlockIcon sx={{ fontSize: 14 }} />,
  },
};

// ongoing = anything that isn't a terminal state
const isOngoing = (s: RentalStatus) =>
  s !== 'completed' && s !== 'canceled' && s !== 'declined';

// ─── Rental Card ──────────────────────────────────────────────────────────────

const RentalCard: React.FC<{
  rental: EnrichedRental;
}> = ({ rental }) => {

  const status = STATUS_CONFIG[rental.status] ?? STATUS_CONFIG.submitted;
  const start  = dayjs(rental.rent_date_start).format('MMM D, YYYY');
  const end    = dayjs(rental.rent_date_end).format('MMM D, YYYY');

  const pickupLabel      = rental.pickupBranch?.location_name ?? rental.delivery_addr ?? '—';
  const returnLabel      = rental.returnBranch?.location_name ?? rental.return_addr ?? '—';
  const isDeliveryPickup = !rental.hub_pick_up_addr && !!rental.delivery_addr;
  const isDeliveryReturn = !rental.hub_return_addr  && !!rental.return_addr;

  const cameraName = rental.item?.device?.cam_name ?? '—';
  const codeName   = rental.item?.code_name ?? '—';
  const deviceImg  = rental.item?.device?.device_img ?? null;
  const hasGps     = rental.item?.gps_installed ?? false;

  return (
    <Paper
        elevation={0}
        sx={{
          border: '1px solid rgba(201,151,58,0.15)', borderRadius: 3, overflow: 'hidden',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': { boxShadow: '0 6px 28px rgba(201,151,58,0.13)', transform: 'translateY(-2px)' },
          opacity: (rental.status === 'canceled' || rental.status === 'declined') ? 0.7 : 1,
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2, background: 'linear-gradient(90deg, rgba(201,151,58,0.08), rgba(201,151,58,0.02))', borderBottom: '1px solid rgba(201,151,58,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {deviceImg
              ? <img src={deviceImg} alt={cameraName} style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(201,151,58,0.2)', flexShrink: 0 }} />
              : <Box sx={{ width: 44, height: 34, borderRadius: 1.5, background: 'rgba(201,151,58,0.10)', border: '1px solid rgba(201,151,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CameraAltIcon sx={{ fontSize: 18, color: '#111111' }} />
                </Box>}
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#111111', fontSize: '0.95rem', lineHeight: 1.2 }}>{cameraName}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#111111', fontFamily: '"Sora", sans-serif' }}>{codeName}</Typography>
                {hasGps && <GpsFixedIcon sx={{ fontSize: 11, color: '#2E7D32' }} />}
              </Box>
            </Box>
          </Box>

          <Chip
            icon={status.icon as React.ReactElement}
            label={status.label}
            size="small"
            sx={{ background: status.bg, color: status.color, border: `1px solid ${status.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-icon': { color: status.color } }}
          />
        </Box>

        {/* Body */}
        <Box sx={{ px: 3, py: 2, display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 160 }}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} />
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#111111', fontFamily: '"Sora", sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rental Period</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#111111', fontWeight: 500 }}>{start} – {end}</Typography>
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(201,151,58,0.12)', display: { xs: 'none', sm: 'block' } }} />

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 140 }}>
            {isDeliveryPickup ? <LocalShippingIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} /> : <StorefrontIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} />}
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#111111', fontFamily: '"Sora", sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pick-up</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#111111', fontWeight: 500 }}>{pickupLabel}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#666666' }}>{isDeliveryPickup ? 'Door delivery' : 'Hub pick-up'}</Typography>
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(201,151,58,0.12)', display: { xs: 'none', sm: 'block' } }} />

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 140 }}>
            {isDeliveryReturn ? <LocalShippingIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} /> : <StorefrontIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} />}
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#111111', fontFamily: '"Sora", sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Return</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#111111', fontWeight: 500 }}>{returnLabel}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#666666' }}>{isDeliveryReturn ? 'Door return' : 'Hub return'}</Typography>
            </Box>
          </Box>

          {rental.loc_usage && (
            <>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(201,151,58,0.12)', display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOnIcon sx={{ fontSize: 16, color: '#111111', mt: 0.3 }} />
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#111111', fontFamily: '"Sora", sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Usage</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#111111', fontWeight: 500, textTransform: 'capitalize' }}>{rental.loc_usage}</Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1, borderTop: '1px solid rgba(201,151,58,0.08)', background: 'rgba(201,151,58,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#666666', fontFamily: '"Sora", sans-serif' }}>
            Submitted {dayjs(rental.created_at).format('MMMM D, YYYY [at] h:mm A')}
          </Typography>
        </Box>
      </Paper>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onBook: () => void }> = ({ onBook }) => (
  <Box sx={{ textAlign: 'center', py: 8, px: 4, border: '1.5px dashed rgba(201,151,58,0.25)', borderRadius: 3, background: 'rgba(201,151,58,0.02)' }}>
    <CameraAltIcon sx={{ fontSize: 52, color: 'rgba(201,151,58,0.35)', mb: 2 }} />
    <Typography variant="h5" sx={{ color: '#111111', mb: 1 }}>No rentals yet</Typography>
    <Typography variant="body2" sx={{ color: '#666666', mb: 3, maxWidth: 320, mx: 'auto' }}>
      You haven't submitted any rental requests. Start by booking a camera for your next project.
    </Typography>
    <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onBook}>Book a Camera</Button>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [renter, setRenter]         = useState<RbRenter | null>(null);
  const [rentals, setRentals]       = useState<EnrichedRental[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'all' | 'ongoing' | 'completed'>('all');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }

        const { data: renterData } = await supabase
          .from('RB_RENTER').select('*').eq('auth_user_id', user.id).single();
        if (!renterData) { navigate('/login'); return; }
        setRenter(renterData as RbRenter);

        const { data: rentalData } = await supabase
          .from('RB_RENTAL_FORM')
          .select('*')
          .eq('renter_id_fk', renterData.id)
          .order('created_at', { ascending: false });

        if (!rentalData || rentalData.length === 0) { setRentals([]); setLoading(false); return; }

        const itemIds   = [...new Set(rentalData.map((r: RbRentalForm) => r.cam_name_id_fk).filter(Boolean))] as string[];
        const branchIds = [...new Set([
          ...rentalData.map((r: RbRentalForm) => r.hub_pick_up_addr),
          ...rentalData.map((r: RbRentalForm) => r.hub_return_addr),
        ].filter(Boolean))] as string[];

        const [{ data: itemsRaw }, { data: branchesRaw }] = await Promise.all([
          itemIds.length
            ? supabase.from('RB_ITEM').select('*, device:RB_DEVICES(id, cam_name, device_img)').in('id', itemIds)
            : Promise.resolve({ data: [] }),
          branchIds.length
            ? supabase.from('RB_BRANCHES').select('*').in('id', branchIds)
            : Promise.resolve({ data: [] }),
        ]);

        const itemMap: Record<string, EnrichedItem>  = {};
        const branchMap: Record<string, RbBranch>    = {};
        (itemsRaw   ?? []).forEach((it: EnrichedItem) => { itemMap[it.id]   = it; });
        (branchesRaw ?? []).forEach((b: RbBranch)    => { branchMap[b.id]  = b;  });

        setRentals(rentalData.map((r: RbRentalForm) => ({
          ...r,
          item:         r.cam_name_id_fk   ? itemMap[r.cam_name_id_fk]     : undefined,
          pickupBranch: r.hub_pick_up_addr  ? branchMap[r.hub_pick_up_addr]  : undefined,
          returnBranch: r.hub_return_addr   ? branchMap[r.hub_return_addr]   : undefined,
        })));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filtered = rentals.filter((r) => {
    if (tab === 'ongoing')   return isOngoing(r.status);
    if (tab === 'completed') return !isOngoing(r.status);
    return true;
  });
  const ongoingCount   = rentals.filter((r) => isOngoing(r.status)).length;
  const completedCount = rentals.filter((r) => !isOngoing(r.status)).length;

  if (loading) {
    return (
      <PageLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 2 }}>
          <CircularProgress sx={{ color: '#111111' }} />
          <Typography sx={{ color: '#666666', fontFamily: '"Sora", sans-serif', fontSize: '0.85rem' }}>Loading your rentals…</Typography>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout renter={renter ? { fname: renter.renter_fname, lname: renter.renter_lname } : null}>

      {/* Heading */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 52, height: 52, background: 'linear-gradient(135deg, #111111, #E5B85C)', color: '#fff', fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '1.3rem', boxShadow: '0 3px 12px rgba(201,151,58,0.35)' }}>
              {renter?.renter_fname[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ color: '#111111', lineHeight: 1.1, mb: 0.25 }}>Hi, {renter?.renter_fname}!</Typography>
              <Typography variant="body2" sx={{ color: '#666666' }}>{renter?.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => navigate('/renterForm')} sx={{ whiteSpace: 'nowrap' }}>
              New Rental
            </Button>
            <Button
              variant="outlined"
              startIcon={loggingOut ? <CircularProgress size={14} /> : <LogoutIcon />}
              onClick={handleLogout} disabled={loggingOut} sx={{ whiteSpace: 'nowrap' }}
            >
              Sign Out
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {[
          { label: 'Total Rentals', value: rentals.length, color: '#111111' },
          { label: 'Ongoing',       value: ongoingCount,   color: '#1565C0' },
          { label: 'Completed',     value: completedCount, color: '#2E7D32' },
        ].map((stat) => (
          <Paper key={stat.label} elevation={0} sx={{ flex: '1 1 120px', p: 2.5, border: '1px solid rgba(201,151,58,0.13)', borderRadius: 3, textAlign: 'center', background: '#fff' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: stat.color, fontFamily: '"Sora", sans-serif', lineHeight: 1, mb: 0.5 }}>{stat.value}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#666666', fontFamily: '"Sora", sans-serif' }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid rgba(201,151,58,0.12)',
            '& .MuiTabs-indicator': { background: '#111111', height: 2.5, borderRadius: 2 },
            '& .MuiTab-root': { textTransform: 'none', fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.88rem', color: '#666666', minHeight: 44, '&.Mui-selected': { color: '#111111' } },
          }}
        >
          <Tab value="all"       label={`All (${rentals.length})`} />
          <Tab value="ongoing"   label={`Ongoing (${ongoingCount})`} />
          <Tab value="completed" label={`Ended (${completedCount})`} />
        </Tabs>
      </Box>

      {/* List */}
      {filtered.length === 0 ? (
        rentals.length === 0
          ? <EmptyState onBook={() => navigate('/renterForm')} />
          : <Alert severity="info" sx={{ background: 'rgba(107,142,107,0.06)', border: '1px solid rgba(107,142,107,0.2)', color: '#4A6A4A' }}>No rentals in this category.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((rental) => (
            <RentalCard key={rental.id} rental={rental} />
          ))}
        </Box>
      )}

      <Box sx={{ height: 40 }} />
    </PageLayout>
  );
};

export default Dashboard;
