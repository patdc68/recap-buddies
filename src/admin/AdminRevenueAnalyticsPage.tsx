import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, IconButton, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import type { RbBranch, RbDevice, RbItem, RbRentalForm } from '../service/supabaseClient';

const AMBER = '#111111';
const CREAM = '#FFFFFF';
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
      .map((r) => ({ ...r, item: r.cam_name_id_fk ? itemMap[r.cam_name_id_fk] : undefined }));

    setBranches((branchesRaw as RbBranch[]) ?? []);
    setRentals(monthRentals);
    setLoading(false);
  }, [navigate, selectedMonth, selectedYear]);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const analytics = useMemo(() => {
    const branchLookup = Object.fromEntries(branches.map((b) => [b.id, b.location_name]));
    const grouped: Record<'new' | 'repeat', Record<string, { units: number; revenue: number }>> = { new: {}, repeat: {} };

    rentals.forEach((r) => {
      if (!r.renter_id_fk) return;
      const isRepeatedRenter = rentals.some((rental) => rental.renter_id_fk === r.renter_id_fk && rental.status === 'completed' && rental.id !== r.id);
      const type: 'new' | 'repeat' = isRepeatedRenter ? 'repeat' : 'new';
      const branch = branchLookup[r.item?.branch_id_fk ?? ''] ?? 'Unassigned';
      const revenue = Number(r.rent_price ?? 0) || 0;
      if (!grouped[type][branch]) grouped[type][branch] = { units: 0, revenue: 0 };
      grouped[type][branch].units += 1;
      grouped[type][branch].revenue += revenue;
    });

    const toRows = (map: Record<string, { units: number; revenue: number }>) => {
      const rows = Object.entries(map).map(([branch, values]) => ({ branch, ...values }));
      return { rows, totalUnits: rows.reduce((s, r) => s + r.units, 0), totalRevenue: rows.reduce((s, r) => s + r.revenue, 0) };
    };

    const newRenter = toRows(grouped.new);
    const repeatRenter = toRows(grouped.repeat);
    return { newRenter, repeatRenter, overallUnits: newRenter.totalUnits + repeatRenter.totalUnits, overallRevenue: newRenter.totalRevenue + repeatRenter.totalRevenue };
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
            <Typography sx={{ color: MUTED, fontSize: '0.82rem' }}>Revenue uses the stored total rent price saved on each rental form.</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 2 }}>
          {(['New Renter', 'Repeat Renter'] as const).map((label) => {
            const dataset = label === 'New Renter' ? analytics.newRenter : analytics.repeatRenter;
            return (
              <Paper key={label} elevation={0} sx={{ borderRadius: '20px', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', p: 3, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{label}</Typography>
                <TableContainer><Table size='small'><TableHead><TableRow sx={{ backgroundColor: '#fafafa' }}><TableCell sx={{ fontWeight: 700 }}>Branch</TableCell><TableCell sx={{ fontWeight: 700 }}>Total Units Rented</TableCell><TableCell sx={{ fontWeight: 700 }}>Total Revenue</TableCell></TableRow></TableHead><TableBody>
                {dataset.rows.map((row) => <TableRow key={`${label}-${row.branch}`}><TableCell>{row.branch}</TableCell><TableCell>{row.units}</TableCell><TableCell>₱{row.revenue.toLocaleString()}</TableCell></TableRow>)}
                <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}><TableCell sx={{ fontWeight: 700 }}>Total</TableCell><TableCell sx={{ fontWeight: 700 }}>{dataset.totalUnits}</TableCell><TableCell sx={{ fontWeight: 700 }}>₱{dataset.totalRevenue.toLocaleString()}</TableCell></TableRow>
                </TableBody></Table></TableContainer>
              </Paper>
            );
          })}
          <Paper elevation={0} sx={{ borderRadius: '20px', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', p: 3, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ fontWeight: 700 }}>Overall Total:</Typography>
            <Typography sx={{ color: MUTED }}>{analytics.overallUnits} Units | ₱{analytics.overallRevenue.toLocaleString()} Revenue</Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminRevenueAnalyticsPage;
