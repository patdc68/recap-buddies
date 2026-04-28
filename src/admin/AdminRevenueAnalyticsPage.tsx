import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbBranch, RbDevice, RbItem, RbRentalForm } from '../service/supabaseClient';

const AMBER = '#111111';
const CREAM = '#FFFFFF';
const CARD_BG = '#FFFFFF';
const ESPRESSO = '#111111';
const MUTED = '#666666';
const BORDER = 'rgba(201,151,58,0.18)';

interface EnrichedItem extends RbItem {
  device?: RbDevice;
}

interface EnrichedRental extends RbRentalForm {
  item?: EnrichedItem;
}

const AdminRevenueAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<RbBranch[]>([]);
  const [rentals, setRentals] = useState<EnrichedRental[]>([]);

  const selectedYear = Number(params.get('year')) || dayjs().year();
  const selectedMonth = Math.min(Math.max(Number(params.get('month')) || dayjs().month() + 1, 1), 12);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const [{ data: branchesRaw }, { data: itemsRaw }, { data: rentalsRaw }] = await Promise.all([
      supabase.from('RB_BRANCHES').select('*'),
      supabase.from('RB_ITEM').select('*, device:RB_DEVICES(id,cam_name,device_img), branch_id_fk'),
      supabase.from('RB_RENTAL_FORM').select('*'),
    ]);

    const itemMap: Record<string, EnrichedItem> = {};
    (itemsRaw as EnrichedItem[] | null)?.forEach((item) => {
      itemMap[item.id] = item;
    });

    const allRentals = (rentalsRaw as RbRentalForm[] | null) ?? [];
    const monthRentals = allRentals
      .filter((r) => {
        const createdAt = dayjs(r.created_at);
        return createdAt.year() === selectedYear && createdAt.month() + 1 === selectedMonth;
      })
      .map((r) => ({ ...r, item: itemMap[r.cam_name_id_fk] }));

    setBranches((branchesRaw as RbBranch[]) ?? []);
    setRentals(monthRentals);
    setLoading(false);
  }, [navigate, selectedMonth, selectedYear]);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const analytics = useMemo(() => {
    const byCamera: Record<string, { camera: string; rentals: number; revenue: number }> = {};
    const branchRentals: Record<string, number> = {};

    rentals.forEach((r) => {
      const camKey = r.item?.device_id_fk ?? r.cam_name_id_fk;
      const camName = r.item?.device?.cam_name ?? 'Unknown Camera';
      const unitPrice = Number(r.rent_price ?? 0) || 0;
      const rentalDays = Math.max(dayjs(r.rent_date_end).diff(dayjs(r.rent_date_start), 'day'), 0);
      const revenue = unitPrice * rentalDays;

      if (!byCamera[camKey]) {
        byCamera[camKey] = { camera: camName, rentals: 0, revenue: 0 };
      }

      byCamera[camKey].rentals += 1;
      byCamera[camKey].revenue += revenue;

      const branchId = r.item?.branch_id_fk ?? 'unassigned';
      branchRentals[branchId] = (branchRentals[branchId] ?? 0) + 1;
    });

    const rows = Object.values(byCamera).sort((a, b) => b.revenue - a.revenue);
    const topCamera = rows[0];

    const topBranchEntry = Object.entries(branchRentals).sort((a, b) => b[1] - a[1])[0];
    const topBranchName = topBranchEntry
      ? (branches.find((b) => b.id === topBranchEntry[0])?.location_name ?? 'Unassigned')
      : '—';

    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

    return {
      rows,
      topCamera,
      topBranchName,
      topBranchRentals: topBranchEntry?.[1] ?? 0,
      totalRevenue,
    };
  }, [branches, rentals]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM }}>
        <CircularProgress sx={{ color: AMBER }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#FFFFFF', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/admin/dashboard')} sx={{ border: `1px solid ${BORDER}`, color: MUTED }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '1.2rem' }}>
              Monthly Revenue Analytics — {dayjs(`${selectedYear}-${selectedMonth}-01`).format('MMMM YYYY')}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.82rem' }}>Per-camera revenue computed as rent price × rental duration.</Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Typography sx={{ color: AMBER, fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Top camera rented
          </Typography>
          <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '1.35rem', mt: 0.5 }}>
            {analytics.topCamera ? analytics.topCamera.camera : 'No rentals this month'}
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: '0.82rem', mt: 0.5 }}>
            {analytics.topCamera ? `${analytics.topCamera.rentals} rentals · ₱${analytics.topCamera.revenue.toLocaleString()}` : '—'}
          </Typography>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Total Revenue</Typography>
            <Typography sx={{ color: '#2E7D32', fontWeight: 700, fontSize: '1.15rem' }}>₱{analytics.totalRevenue.toLocaleString()}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Branch with Most Renters</Typography>
            <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '1.05rem' }}>{analytics.topBranchName}</Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.76rem' }}>{analytics.topBranchRentals} rentals</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Total Camera Rentals</Typography>
            <Typography sx={{ color: AMBER, fontWeight: 700, fontSize: '1.15rem' }}>{rentals.length}</Typography>
          </Paper>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 90px 120px', px: 2, py: 1.2, background: 'rgba(201,151,58,0.05)' }}>
            {['Camera', 'Rented', 'Revenue'].map((header) => (
              <Typography key={header} sx={{ color: MUTED, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{header}</Typography>
            ))}
          </Box>
          {analytics.rows.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: MUTED }}>No rentals found for this month.</Typography>
            </Box>
          ) : analytics.rows.map((row, idx) => (
            <Box key={`${row.camera}-${idx}`} sx={{ display: 'grid', gridTemplateColumns: '1.2fr 90px 120px', px: 2, py: 1.3, borderTop: `1px solid ${BORDER}` }}>
              <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.86rem' }}>{row.camera}</Typography>
              <Typography sx={{ color: MUTED, fontSize: '0.84rem' }}>{row.rentals}</Typography>
              <Typography sx={{ color: '#2E7D32', fontWeight: 700, fontSize: '0.84rem' }}>₱{row.revenue.toLocaleString()}</Typography>
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminRevenueAnalyticsPage;
