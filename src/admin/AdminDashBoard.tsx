import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Avatar,
  Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, FormHelperText,
  Switch, FormControlLabel, Tooltip, TextField, type SelectChangeEvent,
  Snackbar, Alert, Badge, Menu, ListItemText,
  AppBar, Toolbar, Drawer, List, ListItemButton, ListItemIcon, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { EventInput } from '@fullcalendar/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import isBetween    from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter  from 'dayjs/plugin/isSameOrAfter';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';
import { sendRentalStatusEmail } from '../services/emailService';
import { V2_NEXT_STATUSES, V2_RENTAL_STATUS_META, V2_RENTAL_STATUSES, isV2RentalStatus } from '../constants/rentalStatus';
import type {
  RbUser, RbBranch, RbDevice, RbItem, RbRenter,
  RbRentalForm, RbSelfieVerificationInst, ItemStatus, ItemCondition, RentalStatus,
} from '../service/supabaseClient';
import {
  formatCompactRentalItems, formatCompactRentalItemCodes, formatRentalItemsTooltip,
  calculateRentalItemsTotal, getPrimaryRentalItem, getRentalItemIds, getRentalItems, type RentalItemLink,
} from '../utils/rentalItems';
import { buildRentalCalendarEvent, prepareRentalCalendarEntries } from '../utils/rentalCalendarEvents';
import RentalCalendar, { type CalendarVisibleRange } from './RentalCalendar';

import DashboardIcon          from '@mui/icons-material/Dashboard';
import CalendarMonthIcon      from '@mui/icons-material/CalendarMonth';
import InventoryIcon          from '@mui/icons-material/Inventory';
import LogoutIcon             from '@mui/icons-material/Logout';
import CameraAltIcon          from '@mui/icons-material/CameraAlt';
import AddIcon                from '@mui/icons-material/Add';
import EditIcon               from '@mui/icons-material/Edit';
import LocalShippingIcon      from '@mui/icons-material/LocalShipping';
import StorefrontIcon         from '@mui/icons-material/Storefront';
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import UploadFileIcon         from '@mui/icons-material/UploadFile';
import GpsFixedIcon           from '@mui/icons-material/GpsFixed';
import SaveIcon               from '@mui/icons-material/Save';
import CloseIcon              from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TrendingUpIcon         from '@mui/icons-material/TrendingUp';
import ZoomInIcon             from '@mui/icons-material/ZoomIn';
import InstagramIcon          from '@mui/icons-material/Instagram';
import PhoneIcon              from '@mui/icons-material/Phone';
import VerifiedUserIcon       from '@mui/icons-material/VerifiedUser';
import OpenInNewIcon          from '@mui/icons-material/OpenInNew';
import DeleteIcon             from '@mui/icons-material/Delete';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import CancelIcon             from '@mui/icons-material/Cancel';
import MonitorHeartIcon       from '@mui/icons-material/MonitorHeart';
import SettingsSuggestIcon    from '@mui/icons-material/SettingsSuggest';
import NotificationsIcon      from '@mui/icons-material/Notifications';
import MenuIcon               from '@mui/icons-material/Menu';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// ─── Warm palette (matches renter pages) ─────────────────────────────────────

const AMBER       = '#111111';
const AMBER_LIGHT = '#222222';
const AMBER_DARK  = '#111111';
const CREAM       = '#FFFFFF';
const CARD_BG     = '#FFFFFF';
const ESPRESSO    = '#111111';
const INK         = '#111111';
const MUTED       = '#666666';
const BORDER      = 'rgba(17,17,17,0.12)';

const MOBILE_DATA_GRID_PAGINATION_SX = {
  '@media (max-width: 600px)': {
    '& .MuiDataGrid-footerContainer': {
      justifyContent: 'flex-start',
      minHeight: 52,
      px: 1,
      position: 'sticky',
      left: 0,
      zIndex: 2,
      backgroundColor: '#fff',
    },
    '& .MuiTablePagination-root': {
      width: '100%',
      overflow: 'visible',
    },
    '& .MuiTablePagination-toolbar': {
      justifyContent: 'flex-start',
      gap: 0.5,
      minHeight: 52,
      p: 0,
    },
    '& .MuiTablePagination-spacer': {
      display: 'none',
    },
    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-input': {
      display: 'none',
    },
    '& .MuiTablePagination-displayedRows': {
      flexShrink: 0,
      fontSize: '0.75rem',
      m: 0,
      whiteSpace: 'nowrap',
    },
    '& .MuiTablePagination-actions': {
      flexShrink: 0,
      ml: 0,
    },
  },
};

// ─── Status tables ────────────────────────────────────────────────────────────

const RENTAL_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ...V2_RENTAL_STATUS_META,
  'for-delivery': { label: 'For Delivery', color: '#1565C0', bg: 'rgba(100,149,237,0.12)', border: 'rgba(100,149,237,0.35)' },
  delivered:      { label: 'Delivered',    color: '#1A237E', bg: 'rgba(100,149,237,0.08)', border: 'rgba(100,149,237,0.25)' },
  'for-return':   { label: 'For Return',   color: '#E65100', bg: 'rgba(255,165,0,0.12)', border: 'rgba(255,165,0,0.35)' },
  'for-refund':   { label: 'For Refund',   color: '#6A1B9A', bg: 'rgba(156,39,176,0.10)', border: 'rgba(156,39,176,0.30)' },
  'for-penalty':  { label: 'For Penalty',  color: '#B71C1C', bg: 'rgba(211,47,47,0.10)', border: 'rgba(211,47,47,0.30)' },
  extended:       { label: 'Extended',     color: '#7c3aed', bg: '#f3e8ff', border: '#d8b4fe' },
  canceled:    { label: 'Canceled',   color: '#555555', bg: 'rgba(120,120,120,0.10)', border: 'rgba(120,120,120,0.25)' },
};

const RENTAL_TO_ITEM_STATUS: Partial<Record<string, ItemStatus>> = {
  submitted: 'In Review',
  'in-review': 'In Review',
  confirmed: 'In Review',
  renting: 'Renting',
  completed: 'Available',
  declined: 'Available',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HIDDEN_DASHBOARD_STATUSES = ['declined', 'canceled'];
const ACTIVE_RENTAL_STATUSES: RentalStatus[] = ['confirmed', 'renting'];

const getVerificationBucketPath = (value: string | null | undefined) => {
  if (!value) return null;
  const marker = '/verification-images/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
  if (value.startsWith('verification-images/')) return value.slice('verification-images/'.length);
  return value.startsWith('http://') || value.startsWith('https://') ? null : value;
};

const signDeviceImages = async (devices: RbDevice[]) => Promise.all(devices.map(async (device) => {
  const path = getVerificationBucketPath(device.device_img);
  if (!path) return device;
  const { data, error } = await supabase.storage.from('verification-images').createSignedUrl(path, 60 * 60);
  return { ...device, device_img: error ? null : data.signedUrl };
}));

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedItem extends RbItem { device?: RbDevice; }

interface EnrichedRental extends RbRentalForm {
  item?:              EnrichedItem;
  items?:             EnrichedItem[];
  rentalItems?:       RentalItemLink[];
  renter?:            RbRenter;
  pickupBranch?:      RbBranch;
  returnBranch?:      RbBranch;
  selfieInstruction?: RbSelfieVerificationInst | null;
}

// ─── Small helpers ────────────────────────────────────────────────────────────



interface BranchAnalyticsRow {
  branch: string;
  units: number;
  revenue: number;
}

interface RenterTypeAnalytics {
  rows: BranchAnalyticsRow[];
  totalUnits: number;
  totalRevenue: number;
}

const pesoFormatter = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

const getRentalRenterType = (rental: EnrichedRental, rentals: EnrichedRental[]): 'new' | 'repeat' => {
  if (rental.renter_type === 'returnee') return 'repeat';
  if (rental.renter_type === 'new') return 'new';
  const createdAt = dayjs(rental.created_at);
  const hasPriorCompletedRental = rentals.some((candidate) => (
    candidate.id !== rental.id
    && candidate.renter?.id === rental.renter?.id
    && candidate.status === 'completed'
    && dayjs(candidate.created_at).isBefore(createdAt)
  ));
  return hasPriorCompletedRental ? 'repeat' : 'new';
};

const buildRenterAnalytics = (rentals: EnrichedRental[], branchLookup: Record<string, string>) => {
  const grouped: Record<'new' | 'repeat', Record<string, { units: number; revenue: number }>> = { new: {}, repeat: {} };

  rentals.forEach((r) => {
    if (!r.renter?.id) return;
    const renterType = getRentalRenterType(r, rentals);
    const branchName = branchLookup[getPrimaryRentalItem(r)?.branch_id_fk ?? ''] ?? 'Unassigned';
    const units = 1;
    const revenue = Number(r.rent_price ?? 0) || 0;

    if (!grouped[renterType][branchName]) grouped[renterType][branchName] = { units: 0, revenue: 0 };
    grouped[renterType][branchName].units += units;
    grouped[renterType][branchName].revenue += revenue;
  });

  const toSummary = (map: Record<string, { units: number; revenue: number }>): RenterTypeAnalytics => {
    const rows = Object.entries(map)
      .map(([branch, data]) => ({ branch, units: data.units, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    return {
      rows,
      totalUnits: rows.reduce((sum, row) => sum + row.units, 0),
      totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    };
  };

  const newRenter = toSummary(grouped.new);
  const repeatRenter = toSummary(grouped.repeat);

  return {
    newRenter,
    repeatRenter,
    overallUnits: newRenter.totalUnits + repeatRenter.totalUnits,
    overallRevenue: newRenter.totalRevenue + repeatRenter.totalRevenue,
  };
};

const InfoBox: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
    <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
      {label}
    </Typography>
    {children}
  </Box>
);


const getSelfieInstructionTitle = (inst?: RbSelfieVerificationInst | null) =>
  inst?.instruction_name ?? null;

const getSelfieInstructionDescription = (inst?: RbSelfieVerificationInst | null) =>
  inst?.instruction_desc ?? null;

// ─── Rental Detail Dialog ─────────────────────────────────────────────────────

interface RentalDetailDialogProps {
  rental: EnrichedRental | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: RentalUpdatePayload) => Promise<void>;
  allowVerificationLink?: boolean;
}

interface RentalUpdateDeviceRow {
  rentalItemId?: string;
  itemId: string;
}

interface RentalUpdatePayload {
  status: string;
  remarks: string;
  messenger_link: string;
  rent_price: string;
  cam_name_id_fk: string;
  rentalItems?: RentalUpdateDeviceRow[];
  rent_date_start: string;
  rent_date_end: string;
  pickup_time: string;
  return_time: string;
}

interface EditableRentalDeviceRow {
  localId: string;
  rentalItemId?: string;
  itemId: string;
}

const getItemThumbnailUrl = (item?: EnrichedItem | null) => item?.image_url ?? item?.device?.device_img ?? null;

const DeviceThumbnail: React.FC<{ item?: EnrichedItem | null; size?: 'small' | 'medium' }> = ({ item, size = 'medium' }) => {
  const imageUrl = getItemThumbnailUrl(item);
  const dimensions = size === 'small' ? { width: 38, height: 30 } : { width: 56, height: 44 };

  return imageUrl
    ? <img src={imageUrl} alt={item?.code_name ?? 'Device'} style={{ ...dimensions, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}`, flexShrink: 0 }} />
    : <Box sx={{ ...dimensions, borderRadius: 2, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CameraAltIcon sx={{ fontSize: size === 'small' ? 16 : 20, color: AMBER }} /></Box>;
};

const CompactDeviceDisplay: React.FC<{ item?: EnrichedItem | null; placeholder?: string; size?: 'small' | 'medium' }> = ({ item, placeholder = 'Select a device', size = 'medium' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
    <DeviceThumbnail item={item} size={size} />
    <Typography sx={{ color: item ? ESPRESSO : MUTED, fontWeight: 800, fontSize: size === 'small' ? '0.86rem' : '0.95rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {item?.code_name ?? placeholder}
    </Typography>
  </Box>
);

const syncRentalItems = async (rentalId: string, previousLinks: RentalItemLink[], nextRows: RentalUpdateDeviceRow[]) => {
  const previousByLinkId = new Map(previousLinks.filter((link) => link.id).map((link) => [link.id as string, link]));
  const nextLinkIds = new Set(nextRows.map((row) => row.rentalItemId).filter(Boolean) as string[]);

  const deleteIds = previousLinks
    .filter((link) => link.id && !nextLinkIds.has(link.id))
    .map((link) => link.id as string);

  if (deleteIds.length > 0) {
    const { error } = await supabase.from('RB_RENTAL_ITEMS').delete().in('id', deleteIds);
    if (error) throw error;
  }

  const updatePromises = nextRows
    .filter((row) => row.rentalItemId && previousByLinkId.get(row.rentalItemId)?.item_id_fk !== row.itemId)
    .map((row) => supabase.from('RB_RENTAL_ITEMS').update({ item_id_fk: row.itemId }).eq('id', row.rentalItemId as string));

  const insertRows = nextRows
    .filter((row) => !row.rentalItemId || !previousByLinkId.has(row.rentalItemId))
    .map((row) => ({ rental_form_id: rentalId, item_id_fk: row.itemId }));

  const results = await Promise.all(updatePromises);
  const updateError = results.find((result) => result.error)?.error;
  if (updateError) throw updateError;

  if (insertRows.length > 0) {
    const { error } = await supabase.from('RB_RENTAL_ITEMS').insert(insertRows);
    if (error) throw error;
  }
};

const RentalDetailDialog: React.FC<RentalDetailDialogProps> = ({ rental, open, onClose, onSave, allowVerificationLink = true }) => {
  const [status, setStatus] = useState<RentalStatus>(rental?.status ?? 'submitted');
  const [remarks, setRemarks] = useState('');
  const [messengerLink, setMessengerLink] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [deviceRows, setDeviceRows] = useState<EditableRentalDeviceRow[]>([]);
  const [deviceError, setDeviceError] = useState('');
  const [initialDevicePriceTotal, setInitialDevicePriceTotal] = useState(0);
  const [initialRentPrice, setInitialRentPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cameraOptions, setCameraOptions] = useState<EnrichedItem[]>([]);
  const [pickupTime, setPickupTime] = useState<Dayjs | null>(null);
  const [returnTime, setReturnTime] = useState<Dayjs | null>(null);
  const [isRepeatRenter, setIsRepeatRenter] = useState(false);
  const [selfieInstruction, setSelfieInstruction] = useState<RbSelfieVerificationInst | null>(null);
  const [selfieInstructionLoading, setSelfieInstructionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  

  useEffect(() => {
    if (!rental) return;
    setStatus(rental.status);
    setRemarks(rental.remarks ?? '');
    setMessengerLink(rental.messenger_link ?? '');
    const rentalRentPrice = rental.rent_price != null ? String(rental.rent_price) : '';
    const initialItems = getRentalItems(rental);
    setRentPrice(rentalRentPrice);
    setInitialRentPrice(rentalRentPrice);
    setInitialDevicePriceTotal(calculateRentalItemsTotal(initialItems));
    const initialRows = rental.rentalItems?.length
      ? rental.rentalItems.map((link, index) => ({
          localId: link.id ?? `existing-${link.item_id_fk}-${index}`,
          rentalItemId: link.id,
          itemId: link.item_id_fk,
        }))
      : (rental.cam_name_id_fk ? [{ localId: `legacy-${rental.cam_name_id_fk}`, itemId: rental.cam_name_id_fk }] : []);
    setDeviceRows(initialRows);
    setDeviceError('');
    setStartDate(dayjs(rental.rent_date_start).format('YYYY-MM-DD'));
    setEndDate(dayjs(rental.rent_date_end).format('YYYY-MM-DD'));
    setPickupTime(rental.pickup_time ? dayjs(`2000-01-01 ${rental.pickup_time}`) : null);
    setReturnTime(rental.return_time ? dayjs(`2000-01-01 ${rental.return_time}`) : null);
  }, [rental]);

  useEffect(() => {
    if (!open) return;

    const loadDialogData = async () => {
      const { data: itemsRaw } = await supabase
        .from('RB_ITEM')
        .select('*, device:RB_DEVICES(id,cam_name,device_img)')
        .order('created_at', { ascending: false });
      const loadedItems = (itemsRaw ?? []) as EnrichedItem[];
      setCameraOptions(loadedItems);

      if (rental?.id) {
        const { data: rentalItemsRaw } = await supabase
          .from('RB_RENTAL_ITEMS')
          .select('*')
          .eq('rental_form_id', rental.id);

        const links = (rentalItemsRaw ?? []) as RentalItemLink[];
        const rows = links.length > 0
          ? links.map((link, index) => ({
              localId: link.id ?? `existing-${link.item_id_fk}-${index}`,
              rentalItemId: link.id,
              itemId: link.item_id_fk,
            }))
          : (rental.cam_name_id_fk ? [{ localId: `legacy-${rental.cam_name_id_fk}`, itemId: rental.cam_name_id_fk }] : []);

        const selectedItems = rows
          .map((row) => loadedItems.find((item) => item.id === row.itemId))
          .filter((item): item is EnrichedItem => !!item);
        const rentalRentPrice = rental.rent_price != null ? String(rental.rent_price) : '';

        setDeviceRows(rows);
        setInitialRentPrice(rentalRentPrice);
        setInitialDevicePriceTotal(calculateRentalItemsTotal(selectedItems));
      }

      if (!rental?.renter_id_fk) {
        setIsRepeatRenter(false);
        return;
      }

      if (rental.renter_type) {
        setIsRepeatRenter(rental.renter_type === 'returnee');
        return;
      }

      const { count } = await supabase
        .from('RB_RENTAL_FORM')
        .select('id', { head: true, count: 'exact' })
        .eq('renter_id_fk', rental.renter_id_fk)
        .eq('status', 'completed')
        .lt('created_at', rental.created_at)
        .neq('id', rental.id);

      setIsRepeatRenter((count ?? 0) > 0);
    };

    void loadDialogData();
  }, [open, rental?.id, rental?.renter_id_fk, rental?.renter_type, rental?.created_at, rental?.cam_name_id_fk, rental?.rent_price]);

  useEffect(() => {
    if (!open) return;

    let isActive = true;

    const loadSelfieInstruction = async () => {
      const instructionId = rental?.renter?.selfie_verification_id;

      if (!instructionId) {
        setSelfieInstruction(null);
        setSelfieInstructionLoading(false);
        return;
      }

      setSelfieInstructionLoading(true);

      const { data, error } = await supabase
        .from('RB_SELFIE_VERIFICATION_INST')
        .select('id, instruction_name, instruction_desc')
        .eq('id', instructionId)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        console.error('Failed to load selfie instruction:', error);
        setSelfieInstruction(null);
      } else {
        const fetchedInstruction = data as RbSelfieVerificationInst | null;
        setSelfieInstruction(fetchedInstruction);
      }

      setSelfieInstructionLoading(false);
    };

    void loadSelfieInstruction();

    return () => {
      isActive = false;
    };
  }, [open, rental?.renter?.selfie_verification_id]);
  const updateRentPriceIfAuto = (rows: EditableRentalDeviceRow[]) => {
    const originalPrice = Number(initialRentPrice);
    const isAutoCalculated = initialRentPrice === '' || Number.isNaN(originalPrice) || originalPrice === initialDevicePriceTotal;
    const hasNotManuallyEditedPrice = rentPrice === initialRentPrice || Number(rentPrice) === initialDevicePriceTotal;
    if (!isAutoCalculated || !hasNotManuallyEditedPrice) return;

    const nextItems = rows
      .map((row) => cameraOptions.find((item) => item.id === row.itemId))
      .filter((item): item is EnrichedItem => !!item);
    setRentPrice(String(calculateRentalItemsTotal(nextItems)));
  };

  const updateDeviceRows = (updater: (rows: EditableRentalDeviceRow[]) => EditableRentalDeviceRow[]) => {
    setDeviceRows((rows) => {
      const nextRows = updater(rows);
      const selectedIds = nextRows.map((row) => row.itemId).filter(Boolean);
      const hasDuplicate = new Set(selectedIds).size !== selectedIds.length;
      setDeviceError(hasDuplicate ? 'This unit is already selected for this rental.' : '');
      updateRentPriceIfAuto(nextRows);
      return nextRows;
    });
  };

  const handleDeviceChange = (localId: string, itemId: string) => {
    updateDeviceRows((rows) => rows.map((row) => row.localId === localId ? { ...row, itemId } : row));
  };

  const handleAddDevice = () => {
    updateDeviceRows((rows) => [...rows, { localId: `new-${Date.now()}-${rows.length}`, itemId: '' }]);
  };

  const handleRemoveDevice = (localId: string) => {
    updateDeviceRows((rows) => rows.filter((row) => row.localId !== localId));
  };

  if (!rental) return null;
  const selfieInstructionTitle = getSelfieInstructionTitle(selfieInstruction);
  const selfieInstructionDescription = getSelfieInstructionDescription(selfieInstruction);

  const meta = RENTAL_STATUS_META[rental.status] ?? RENTAL_STATUS_META.submitted;
  const editableStatusValues = rental.renter_type && isV2RentalStatus(rental.status)
    ? [rental.status, ...V2_NEXT_STATUSES[rental.status]]
    : [rental.status];

  const isDateRangeInvalid = !!startDate && !!endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day');
  const selectedDeviceIds = deviceRows.map((row) => row.itemId).filter(Boolean);
  const hasDuplicateDevices = new Set(selectedDeviceIds).size !== selectedDeviceIds.length;
  const hasEmptyDeviceRows = deviceRows.some((row) => !row.itemId);
  const isSaveDisabled = saving || deviceRows.length === 0 || hasEmptyDeviceRows || hasDuplicateDevices || !startDate || !endDate || isDateRangeInvalid;

  const handleSave = async () => {
    if (isDateRangeInvalid) return;
    const selectedRows = deviceRows.filter((row) => row.itemId);
    const selectedIds = selectedRows.map((row) => row.itemId);
    if (selectedRows.length === 0) {
      setDeviceError('Please select at least one device for this rental.');
      return;
    }
    if (new Set(selectedIds).size !== selectedIds.length) {
      setDeviceError('This unit is already selected for this rental.');
      return;
    }

    setSaving(true);
    try {
      await onSave(rental.id, {
        status,
        remarks,
        messenger_link: messengerLink,
        rent_price: rentPrice,
        cam_name_id_fk: selectedRows[0]?.itemId ?? rental.cam_name_id_fk ?? '',
        rentalItems: selectedRows.map((row) => ({ rentalItemId: row.rentalItemId, itemId: row.itemId })),
        rent_date_start: startDate,
        rent_date_end: endDate,
        pickup_time: pickupTime?.format('hh:mm A') ?? '',
        return_time: returnTime?.format('hh:mm A') ?? '',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const hasVerificationRecord = rental.renter_type != null || isV2RentalStatus(rental.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 3, boxShadow: '0 8px 40px rgba(201,151,58,0.12)' } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        Edit Rental Monitoring Details
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={meta.label} size="small" sx={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.7rem' }} />
          <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

        {/* Camera */}
        <InfoBox label="Devices">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {deviceRows.map((row, index) => {
              const selectedItem = cameraOptions.find((item) => item.id === row.itemId);
              const duplicateItem = !!row.itemId && deviceRows.filter((candidate) => candidate.itemId === row.itemId).length > 1;

              return (
                <Box key={row.localId} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${duplicateItem ? '#d32f2f' : BORDER}`, background: duplicateItem ? 'rgba(211,47,47,0.04)' : CARD_BG }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ color: AMBER_DARK, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                      Device {index + 1}
                    </Typography>
                    <IconButton aria-label={`Remove device ${index + 1}`} size="small" onClick={() => handleRemoveDevice(row.localId)} sx={{ color: MUTED }}>
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <CompactDeviceDisplay item={selectedItem} placeholder="Select a device" />
                  </Box>
                  <FormControl size="small" fullWidth error={duplicateItem || (!!deviceError && !row.itemId)}>
                    <InputLabel>Actual Unit</InputLabel>
                    <Select
                      value={row.itemId}
                      onChange={(e: SelectChangeEvent) => handleDeviceChange(row.localId, e.target.value)}
                      label="Actual Unit"
                      renderValue={(selected) => {
                        const selectedOption = cameraOptions.find((item) => item.id === selected);
                        return <CompactDeviceDisplay item={selectedOption} placeholder="Select a unit" size="small" />;
                      }}
                    >
                      {cameraOptions.map((item) => (
                        <MenuItem key={item.id} value={item.id} disabled={row.itemId !== item.id && deviceRows.some((candidate) => candidate.itemId === item.id)}>
                          <CompactDeviceDisplay item={item} size="small" />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
            {deviceRows.length === 0 && (
              <Typography sx={{ color: MUTED, fontSize: '0.82rem', fontStyle: 'italic' }}>
                No devices selected. Add at least one device before saving.
              </Typography>
            )}
            {deviceError && <FormHelperText error sx={{ mx: 0 }}>{deviceError}</FormHelperText>}
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddDevice} sx={{ alignSelf: 'flex-start', borderColor: BORDER, color: AMBER_DARK }}>
              Add Device
            </Button>
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
            <Chip
              size="small"
              label={isRepeatRenter ? 'Repeat Renter: Yes' : 'Repeat Renter: No'}
              sx={{
                background: isRepeatRenter ? 'rgba(105,219,124,0.12)' : 'rgba(120,120,120,0.12)',
                color: isRepeatRenter ? '#2E7D32' : '#666',
                border: isRepeatRenter ? '1px solid rgba(105,219,124,0.35)' : '1px solid rgba(120,120,120,0.3)',
                fontWeight: 700,
                fontSize: '0.68rem',
                fontFamily: '"Sora", sans-serif',
              }}
            />
          </Box>
        </InfoBox>

        {/* Selfie Verification Instruction */}
        <InfoBox label="Selfie Verification Instruction">
          <Typography sx={{ color: selfieInstructionLoading || selfieInstructionTitle ? ESPRESSO : MUTED, fontWeight: 700, fontSize: '0.9rem', mb: 0.5, fontStyle: !selfieInstructionLoading && !selfieInstructionTitle ? 'italic' : 'normal' }}>
            {selfieInstructionLoading ? 'Loading…' : selfieInstructionTitle ?? 'Not provided'}
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: !selfieInstructionLoading && !selfieInstructionDescription ? 'italic' : 'normal' }}>
            {selfieInstructionLoading ? 'Loading instruction details…' : selfieInstructionDescription ?? 'Not provided'}
          </Typography>
        </InfoBox>

        {/* Dates */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 180px', p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.6 }}>Start Date</Typography>
            <TextField
              size="small"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ flex: '1 1 180px', p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.6 }}>End Date</Typography>
            <TextField
              size="small"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              inputProps={{ min: startDate || undefined }}
              fullWidth
              error={isDateRangeInvalid}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>Actual Returned</Typography>
            <Typography sx={{ color: ESPRESSO, fontSize: '0.85rem', fontWeight: 600 }}>{rental.actual_return_date ? dayjs(rental.actual_return_date).format('MMM D, YYYY') : 'Not returned yet'}</Typography>
          </Box>
        </Box>
        {isDateRangeInvalid && (
          <FormHelperText error>End date must be on or after start date.</FormHelperText>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 180px', p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.6 }}>Pickup Time</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <TimePicker value={pickupTime} onChange={setPickupTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </LocalizationProvider>
          </Box>
          <Box sx={{ flex: '1 1 180px', p: 1.5, borderRadius: 2, background: 'rgba(201,151,58,0.05)', border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.6 }}>Return Time</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <TimePicker value={returnTime} onChange={setReturnTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </LocalizationProvider>
          </Box>
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

        {/* Discount / Refund */}
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
                <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.25 }}>Bank / Refund Info</Typography>
                <Typography sx={{ color: ESPRESSO, fontSize: '0.82rem' }}>{rental.refund_info}</Typography>
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 100%' }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
              Remarks
            </Typography>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add admin remarks"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: ESPRESSO, fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </Box>
          <Box sx={{ flex: '1 1 220px' }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
              Messenger Link
            </Typography>
            <input
              value={messengerLink}
              onChange={(e) => setMessengerLink(e.target.value)}
              placeholder="https://m.me/..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: ESPRESSO, fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
            {rental.messenger_link && (
              <Typography component="a" href={rental.messenger_link} target="_blank" rel="noreferrer" sx={{ mt: 0.6, display: 'inline-flex', alignItems: 'center', gap: 0.5, color: AMBER_DARK, fontSize: '0.74rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Open saved link <OpenInNewIcon sx={{ fontSize: 13 }} />
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: '1 1 160px' }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
              Rent Price
            </Typography>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rentPrice}
              onChange={(e) => setRentPrice(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: ESPRESSO, fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </Box>
        </Box>

        {/* Status editor */}
        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: MUTED }}>Update Status</InputLabel>
          <Select value={status} onChange={(e: SelectChangeEvent) => setStatus(e.target.value as RentalStatus)} label="Update Status">
            {editableStatusValues.map((val) => {
              const m = RENTAL_STATUS_META[val] ?? { label: val, color: MUTED, bg: '#f5f5f5', border: BORDER };
              return (
              <MenuItem key={val} value={val}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                  {m.label}
                </Box>
              </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        {allowVerificationLink && hasVerificationRecord && (
          <Button
            variant="outlined" fullWidth size="small"
            startIcon={<VerifiedUserIcon />}
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem' }} />}
            onClick={() => { onClose(); navigate(`/admin/verify/${rental.id}`); }}
            sx={{ borderColor: BORDER, color: AMBER_DARK, background: 'rgba(201,151,58,0.04)', '&:hover': { background: 'rgba(201,151,58,0.08)', borderColor: AMBER } }}
          >
            Open Full Verification Page
          </Button>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={isSaveDisabled}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Rental List Dialog ───────────────────────────────────────────────────────

interface RentalListDialogProps {
  title: string;
  rentals: EnrichedRental[];
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: RentalUpdatePayload) => Promise<void>;
  verificationMode?: boolean;
}

const RentalListDialog: React.FC<RentalListDialogProps> = ({ title, rentals, open, onClose, onSave, verificationMode = false }) => {
  const [detail, setDetail] = useState<EnrichedRental | null>(null);
  const navigate = useNavigate();

  const handleRowClick = (r: EnrichedRental) => {
    if (verificationMode) {
      onClose();
      navigate(`/admin/verify/${r.id}`);
    } else {
      setDetail(r);
    }
  };

  const columns = React.useMemo<GridColDef<EnrichedRental>[]>(() => {
    const longTextSx = {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
    } as const;

    return [
    {
      field: 'image',
      headerName: 'Image',
      width: 84,
      minWidth: 72,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<EnrichedRental>) => (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          {getPrimaryRentalItem(row)?.device?.device_img
            ? <img src={getPrimaryRentalItem(row)?.device?.device_img ?? undefined} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}`, display: 'block' }} />
            : <Box sx={{ width: 52, height: 40, borderRadius: 2, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 18, color: AMBER }} /></Box>}
        </Box>
      ),
    },
    {
      field: 'camera',
      headerName: 'Camera / Code',
      minWidth: 220,
      flex: 1.8,
      valueGetter: (_value, row) => formatCompactRentalItems(row),
      renderCell: ({ row }: GridRenderCellParams<EnrichedRental>) => (
        <Box sx={{ minWidth: 0, width: '100%', py: 1 }}>
          <Typography title={formatRentalItemsTooltip(row)} sx={{ ...longTextSx, color: ESPRESSO, fontWeight: 700, fontSize: '0.85rem' }}>{formatCompactRentalItems(row)}</Typography>
          <Typography title={formatRentalItemsTooltip(row)} sx={{ ...longTextSx, color: AMBER, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif' }}>{formatCompactRentalItemCodes(row)}</Typography>
        </Box>
      ),
    },
    {
      field: 'renter',
      headerName: 'Renter Name + Contact',
      minWidth: 190,
      flex: 1.15,
      valueGetter: (_value, row) => row.renter ? `${row.renter.renter_fname} ${row.renter.renter_lname}` : '—',
      renderCell: ({ row }: GridRenderCellParams<EnrichedRental>) => {
        const renterName = row.renter ? `${row.renter.renter_fname} ${row.renter.renter_lname}` : '—';
        return (
          <Box sx={{ minWidth: 0, width: '100%', py: 1 }}>
            <Typography title={renterName} sx={{ ...longTextSx, color: INK, fontSize: '0.82rem', fontWeight: 600 }}>{renterName}</Typography>
            <Typography title={row.renter?.mobile_no ?? ''} sx={{ ...longTextSx, color: MUTED, fontSize: '0.72rem' }}>{row.renter?.mobile_no ?? '—'}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'dateRange',
      headerName: 'Rental Date Range',
      minWidth: 170,
      flex: 1,
      valueGetter: (_value, row) => `${dayjs(row.rent_date_start).format('MMM D')} – ${dayjs(row.rent_date_end).format('MMM D, YYYY')}`,
      renderCell: ({ row }: GridRenderCellParams<EnrichedRental>) => (
        <Typography sx={{ color: MUTED, fontSize: '0.78rem', lineHeight: 1.4 }}>
          {dayjs(row.rent_date_start).format('MMM D')} –<br />{dayjs(row.rent_date_end).format('MMM D, YYYY')}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 150,
      flex: 0.8,
      renderCell: ({ row }: GridRenderCellParams<EnrichedRental>) => {
        const meta = RENTAL_STATUS_META[row.status] ?? RENTAL_STATUS_META.submitted;
        const pending = verificationMode;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.75, py: 1 }}>
            <Chip
              label={meta.label} size="small"
              sx={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem' }}
            />
            {pending && (
              <Chip
                icon={<VerifiedUserIcon sx={{ fontSize: '0.75rem !important' }} />}
                label="Review IDs →" size="small"
                sx={{ background: 'rgba(201,151,58,0.12)', color: AMBER_DARK, border: `1px solid ${BORDER}`, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
              />
            )}
          </Box>
        );
      },
    },
  ];
  }, [verificationMode]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3, maxHeight: { xs: '92dvh', md: '88vh' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
        <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, flexShrink: 0 }}>
          {title}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: AMBER, fontFamily: '"Sora", sans-serif', fontSize: '1rem', fontWeight: 700 }}>({rentals.length})</Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, pt: '0 !important', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {rentals.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: `1px solid ${BORDER}`, background: '#fff' }}>
              <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.85rem' }}>No rentals in this category.</Typography>
            </Box>
          ) : (
            <>
              <Typography
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  color: MUTED,
                  fontFamily: '"Sora", sans-serif',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Swipe left/right and scroll up/down to view all records
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  overflowX: { xs: 'auto', lg: 'hidden' },
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  pb: 0.5,
                }}
              >
                <Box sx={{ minWidth: { xs: 900, lg: '100%' }, height: '100%' }}>
                  <Box sx={{
                    borderRadius: 3,
                    border: '1px solid #eee',
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    width: '100%',
                    height: '100%',
                    '& .MuiDataGrid-root': { border: 'none' },
                    '& .MuiDataGrid-columnHeaders': { background: '#fafafa', borderBottom: `1px solid ${BORDER}` },
                    '& .MuiDataGrid-columnHeaderTitle': { fontFamily: '"Sora", sans-serif', fontSize: '0.68rem', fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' },
                    '& .MuiDataGrid-cell': { borderColor: 'rgba(17,17,17,0.08)', alignItems: 'center' },
                    '& .MuiDataGrid-row': { cursor: 'pointer' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(201,151,58,0.05)' },
                  }}>
                    <DataGrid
                      autoHeight={false}
                      rows={rentals}
                      columns={columns}
                      getRowId={(row) => row.id}
                      rowHeight={68}
                      columnHeaderHeight={46}
                      pagination
                      hideFooter={rentals.length <= 10}
                      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                      pageSizeOptions={[10, 25, 50]}
                      disableRowSelectionOnClick
                      onRowClick={(params) => handleRowClick(params.row as EnrichedRental)}
                      sx={{
                        minWidth: 900,
                        minHeight: 400,
                        height: { xs: 'calc(92dvh - 136px)', sm: 'min(620px, 68vh)', md: 'calc(88vh - 120px)' },
                        maxHeight: '100%',
                        border: 'none',
                        ...MOBILE_DATA_GRID_PAGINATION_SX,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
      <RentalDetailDialog rental={detail} open={!!detail} onClose={() => setDetail(null)} onSave={onSave} allowVerificationLink={false} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 0 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewTab: React.FC<{ rentals: EnrichedRental[]; onSave: (id: string, updates: RentalUpdatePayload) => Promise<void> }> = ({ rentals, onSave }) => {
  const dashboardRentals = rentals.filter(
    (rental) =>
      !HIDDEN_DASHBOARD_STATUSES.includes(
        String(rental.status ?? '').toLowerCase()
      )
  );
  const today = dayjs();
  const navigate = useNavigate();
  const [listDialog, setListDialog] = useState<{ title: string; items: EnrichedRental[]; verificationMode?: boolean } | null>(null);

  const upcomingDates = [...new Set(
    dashboardRentals
      .filter((r) => r.status !== 'completed' && dayjs(r.rent_date_start).isSameOrAfter(today, 'day'))
      .map((r) => dayjs(r.rent_date_start).format('YYYY-MM-DD'))
      .sort()
  )].slice(0, 3);

  const upcomingGroups = upcomingDates.map((ds) => ({
    date: dayjs(ds),
    rentals: dashboardRentals.filter((r) => dayjs(r.rent_date_start).format('YYYY-MM-DD') === ds),
  }));

  const monthlyData = MONTHS.map((month, i) => ({
    month,
    count: dashboardRentals.filter((r) => { const d = dayjs(r.created_at); return d.year() === today.year() && d.month() === i; }).length,
    rentals: dashboardRentals.filter((r) => { const d = dayjs(r.created_at); return d.year() === today.year() && d.month() === i; }),
  }));

  const thisMonth = dashboardRentals.filter((r) => {
    const d = dayjs(r.created_at);
    return d.year() === today.year() && d.month() === today.month();
  });

  const devMap: Record<string, { name: string; count: number; rentals: EnrichedRental[] }> = {};
  thisMonth.forEach((r) => {
    const name = formatCompactRentalItems(r);
    const key  = getPrimaryRentalItem(r)?.device_id_fk ?? 'unknown';
    if (!devMap[key]) devMap[key] = { name, count: 0, rentals: [] };
    devMap[key].count++;
    devMap[key].rentals.push(r);
  });
  const topDevices = Object.values(devMap).sort((a, b) => b.count - a.count).slice(0, 6);

  const statCards = [
    { label: 'Total Rentals', color: AMBER, items: dashboardRentals, count: dashboardRentals.length, verificationMode: false },
    { label: 'This Month', color: AMBER_LIGHT, items: thisMonth, count: thisMonth.length, verificationMode: false },
    { label: 'Active / Renting', color: '#2E7D32', items: dashboardRentals.filter((r) => ACTIVE_RENTAL_STATUSES.includes(r.status)), count: dashboardRentals.filter((r) => ACTIVE_RENTAL_STATUSES.includes(r.status)).length, verificationMode: false },
    {
      label: 'Pending Review',
      color: '#1565C0',
      items: rentals.filter((r) => Boolean(r.renter_id_fk)),
      count: rentals.filter((r) => r.status === 'submitted' || r.status === 'in-review').length,
      verificationMode: true,
    },
  ];


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {statCards.map((s) => (
          <Paper
            key={s.label} elevation={0}
            role="button"
            tabIndex={0}
            onClick={() => setListDialog({ title: s.label, items: s.items, verificationMode: s.verificationMode })}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setListDialog({ title: s.label, items: s.items, verificationMode: s.verificationMode }); }}
            sx={{
              flex: '1 1 130px', p: 2.5, borderRadius: 3, textAlign: 'center',
              background: CARD_BG, border: `1px solid ${BORDER}`,
              cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s',
              '&:hover': { boxShadow: '0 6px 24px rgba(201,151,58,0.14)', transform: 'translateY(-2px)' },
            }}
          >
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: s.color, fontFamily: '"Sora", sans-serif', lineHeight: 1, mb: 0.5 }}>
              {s.count}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: MUTED, fontFamily: '"Sora", sans-serif' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: AMBER, fontFamily: '"Sora", sans-serif', mt: 0.5 }}>
              {s.label === 'Pending Review' ? 'Review IDs →' : 'Click to view →'}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '20px', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', p: 3, border: `1px solid ${BORDER}` }}>
        <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.95rem', mb: 1.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Year To Date Analytics</Typography>
        {(() => {
          const yearStart = today.startOf('year');
          const ytdRentals = dashboardRentals.filter((r) => {
            const created = dayjs(r.created_at);
            return created.isSameOrAfter(yearStart, 'day') && created.isSameOrBefore(today, 'day');
          });
          const ytdAnalytics = buildRenterAnalytics(ytdRentals, {});
          return (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              <Box><Typography sx={{ fontWeight: 700 }}>New Renters</Typography><Typography sx={{ color: MUTED }}>{ytdAnalytics.newRenter.totalUnits} Units | ₱{pesoFormatter.format(ytdAnalytics.newRenter.totalRevenue)}</Typography></Box>
              <Box><Typography sx={{ fontWeight: 700 }}>Repeat Renters</Typography><Typography sx={{ color: MUTED }}>{ytdAnalytics.repeatRenter.totalUnits} Units | ₱{pesoFormatter.format(ytdAnalytics.repeatRenter.totalRevenue)}</Typography></Box>
              <Box><Typography sx={{ fontWeight: 700 }}>Overall</Typography><Typography sx={{ color: MUTED }}>{ytdAnalytics.overallUnits} Units | ₱{pesoFormatter.format(ytdAnalytics.overallRevenue)}</Typography></Box>
            </Box>
          );
        })()}
      </Paper>

      {/* Upcoming dates */}
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

                <Box sx={{ overflowX: { xs: 'visible', md: 'auto' } }}>
                  {group.map((r) => {
                    const meta = RENTAL_STATUS_META[r.status] ?? RENTAL_STATUS_META.submitted;
                    const isHubPickup = Boolean(r.hub_pick_up_addr);
                    const typeLabel = isHubPickup ? 'Hub' : 'Delivery';
                    const pickupLocation = r.pickupBranch?.location_name ?? r.delivery_addr ?? '—';

                    return (
                      <Box
                        key={r.id}
                        sx={{
                          px: 3,
                          py: 1.8,
                          minWidth: { xs: 'auto', md: 900 },
                          borderBottom: `1px solid rgba(201,151,58,0.06)`,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '56px minmax(0, 1fr)',
                            md: '64px minmax(220px, 1.6fr) minmax(180px, 1fr) minmax(150px, 0.8fr) minmax(120px, 0.7fr) 120px',
                          },
                          alignItems: 'center',
                          gap: { xs: 1.5, md: 2 },
                          '&:last-child': { borderBottom: 'none' },
                          '&:hover': { background: 'rgba(201,151,58,0.04)' },
                          transition: 'background 0.15s',
                        }}
                      >
                        {getPrimaryRentalItem(r)?.device?.device_img
                          ? <img src={getPrimaryRentalItem(r)?.device?.device_img ?? undefined} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />
                          : <Box sx={{ width: 56, height: 42, borderRadius: 2, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 18, color: AMBER }} /></Box>}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: ESPRESSO, fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCompactRentalItems(r)}</Typography>
                          <Typography sx={{ color: AMBER, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCompactRentalItemCodes(r)}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 0, gridColumn: { xs: '2', md: 'auto' } }}>
                          <Typography sx={{ color: INK, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.renter ? `${r.renter.renter_fname} ${r.renter.renter_lname}` : '—'}</Typography>
                          <Typography sx={{ color: MUTED, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.renter?.mobile_no ?? ''}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 0, gridColumn: { xs: '2', md: 'auto' } }}>
                          <Typography sx={{ color: MUTED, fontSize: '0.7rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Returns</Typography>
                          <Typography sx={{ color: INK, fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayjs(r.rent_date_end).format('MMM D, YYYY')}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 0, gridColumn: { xs: '2', md: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          {isHubPickup ? <StorefrontIcon sx={{ fontSize: 13, color: MUTED, flexShrink: 0 }} /> : <LocalShippingIcon sx={{ fontSize: 13, color: MUTED, flexShrink: 0 }} />}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontWeight: 700 }}>{typeLabel}</Typography>
                            <Typography sx={{ color: MUTED, fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickupLocation}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ gridColumn: { xs: '2', md: 'auto' }, justifySelf: { xs: 'start', md: 'end' } }}>
                          <Chip label={meta.label} size="small" sx={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Bar chart */}
        <Paper elevation={0} sx={{ flex: '2 1 340px', p: 3, borderRadius: 3, background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <TrendingUpIcon sx={{ color: AMBER, fontSize: 18 }} />
            <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rentals This Year</Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.72rem', ml: 'auto' }}>Click a bar to open monthly analytics</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 11, fontFamily: '"Sora", sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip
                cursor={{ fill: 'rgba(201,151,58,0.06)' }}
                contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: '"Sora", sans-serif', fontSize: 12, color: ESPRESSO }}
                labelStyle={{ color: AMBER_DARK, fontWeight: 600 }}
              />
              <Bar
                dataKey="count"
                name="Rentals"
                radius={[4, 4, 0, 0]}
                style={{ cursor: 'pointer' }}
                onClick={(entry) => {
                  const payload = (entry as unknown as { payload?: { rentals?: EnrichedRental[]; month?: string } })?.payload;
                  if (payload?.rentals && payload.rentals.length > 0) {
                    const monthIndex = MONTHS.findIndex((m) => m === payload.month);
                    navigate(`/admin/analytics?year=${today.year()}&month=${monthIndex + 1}`);
                  }
                }}
              >
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === today.month() ? AMBER : 'rgba(201,151,58,0.35)'} />
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

      {listDialog && (
        <RentalListDialog
          title={listDialog.title} rentals={listDialog.items}
          open={!!listDialog} onClose={() => setListDialog(null)} onSave={onSave}
          verificationMode={listDialog.verificationMode}
        />
      )}
    </Box>
  );
};

interface MonitoringEditForm {
  rent_date_start: string;
  pickup_time: Dayjs | null;
  rent_date_end: string;
  return_time: Dayjs | null;
  cam_name_id_fk: string;
  rentalType: 'pickup' | 'delivery';
  branch_id_fk: string;
  delivery_addr: string;
  rent_price: string;
  status: RentalStatus;
}

const MonitoringTab: React.FC<{ rentals: EnrichedRental[]; items: EnrichedItem[]; branches: RbBranch[]; onSaved: () => Promise<void> }> = ({ rentals, items, branches, onSaved }) => {
  const [editingRental, setEditingRental] = useState<EnrichedRental | null>(null);
  const [editForm, setEditForm] = useState<MonitoringEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'warning' }>({ open: false, msg: '', severity: 'success' });

  const openEditDialog = (rental: EnrichedRental) => {
    setEditingRental(rental);
    setEditForm({
      rent_date_start: dayjs(rental.rent_date_start).format('YYYY-MM-DD'),
      pickup_time: rental.pickup_time ? dayjs(`2000-01-01 ${rental.pickup_time}`) : null,
      rent_date_end: dayjs(rental.rent_date_end).format('YYYY-MM-DD'),
      return_time: rental.return_time ? dayjs(`2000-01-01 ${rental.return_time}`) : null,
      cam_name_id_fk: rental.cam_name_id_fk ?? '',
      rentalType: rental.delivery_addr ? 'delivery' : 'pickup',
      branch_id_fk: rental.branch_id_fk ?? rental.hub_pick_up_addr ?? rental.item?.branch_id_fk ?? '',
      delivery_addr: rental.delivery_addr ?? '',
      rent_price: rental.rent_price != null ? String(rental.rent_price) : '',
      status: rental.status,
    });
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditingRental(null);
    setEditForm(null);
  };

  const monitoringStatusValues = editingRental && isV2RentalStatus(editingRental.status) && editingRental.renter_type
    ? [editingRental.status, ...V2_NEXT_STATUSES[editingRental.status]]
    : editingRental
      ? [editingRental.status]
      : [];

  const saveMonitoringEdit = async () => {
    if (!editingRental || !editForm) return;
    if (!editForm.cam_name_id_fk || !editForm.rent_date_start || !editForm.rent_date_end) {
      setSnackbar({ open: true, msg: 'Please complete the required rental fields.', severity: 'error' });
      return;
    }
    if (dayjs(editForm.rent_date_end).isBefore(dayjs(editForm.rent_date_start), 'day')) {
      setSnackbar({ open: true, msg: 'Return date must be on or after pickup date.', severity: 'error' });
      return;
    }
    if (editForm.rentalType === 'pickup' && !editForm.branch_id_fk) {
      setSnackbar({ open: true, msg: 'Please select a pickup hub.', severity: 'error' });
      return;
    }
    if (editForm.rentalType === 'delivery' && !editForm.delivery_addr.trim()) {
      setSnackbar({ open: true, msg: 'Please enter the delivery address.', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      let emailFailed = false;
      const parsedRentPrice = editForm.rent_price.trim() === '' ? null : Number(editForm.rent_price);
      const payload = {
        rent_date_start: editForm.rent_date_start,
        pickup_time: editForm.pickup_time?.format('HH:mm:ss') ?? null,
        rent_date_end: editForm.rent_date_end,
        return_time: editForm.return_time?.format('HH:mm:ss') ?? null,
        cam_name_id_fk: editForm.cam_name_id_fk,
        branch_id_fk: editForm.branch_id_fk || null,
        hub_pick_up_addr: editForm.rentalType === 'pickup' ? editForm.branch_id_fk : null,
        delivery_addr: editForm.rentalType === 'delivery' ? editForm.delivery_addr.trim() : null,
        rent_price: parsedRentPrice == null || Number.isNaN(parsedRentPrice) ? null : Math.max(parsedRentPrice, 0),
        status: editForm.status,
      };

      const { error } = await supabase.from('RB_RENTAL_FORM').update(payload).eq('id', editingRental.id);
      if (error) throw error;

      const itemStatus = RENTAL_TO_ITEM_STATUS[editForm.status];
      if (itemStatus) {
        const itemIdsToUpdate = editingRental.rentalItems?.length ? getRentalItemIds(editingRental) : [editForm.cam_name_id_fk].filter(Boolean);
        await Promise.all(itemIdsToUpdate.map((itemId) => supabase.from('RB_ITEM').update({ status: itemStatus }).eq('id', itemId)));
      }

      if (editForm.status !== editingRental.status) {
        try {
          await sendRentalStatusEmail({ status: editForm.status, rental: editingRental });
        } catch (emailError) {
          console.error('Failed to send monitoring status email:', emailError);
          emailFailed = true;
        }
      }

      await onSaved();
      setSnackbar(emailFailed
        ? { open: true, msg: 'Rental updated, but the status email could not be sent.', severity: 'warning' }
        : { open: true, msg: 'Rental monitoring details updated.', severity: 'success' });
      setEditingRental(null);
      setEditForm(null);
    } catch (e) {
      console.error('Failed to update monitoring rental:', e);
      setSnackbar({ open: true, msg: 'Failed to update rental monitoring details.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const monitoringRows = rentals.map((r, index) => {
    const rentPrice = Number(r.rent_price ?? 0);
    const renterName = r.renter ? `${r.renter.renter_fname} ${r.renter.renter_lname}` : '—';
    const renterType = r.renter?.id ? getRentalRenterType(r, rentals) : null;

    return {
      id: r.id,
      no: index + 1,
      pd: r.rent_date_start,
      pt: r.pickup_time,
      rt: r.return_time,
      rd: r.rent_date_end,
      name: renterName,
      unit: formatCompactRentalItems(r),
      renter: renterType ? (renterType === 'repeat' ? 'Repeat' : 'New') : '—',
      type: r.delivery_addr == null ? 'Pick-up' : 'Deliver',
      hub: r.pickupBranch?.location_name ?? r.delivery_addr ?? '—',
      groupChat: Boolean(r.messenger_link),
      rentalFee: rentPrice,
      status: RENTAL_STATUS_META[r.status]?.label ?? r.status,
      availableUnit: formatCompactRentalItemCodes(r),
      rental: r,
    };
  });

  const monitoringColumns: GridColDef[] = [
    { field: 'actions', headerName: '', width: 70, sortable: false, filterable: false, renderCell: (params) => <Tooltip title="Edit rental details"><IconButton size="small" onClick={(event) => { event.stopPropagation(); openEditDialog(params.row.rental); }}><EditIcon fontSize="small" /></IconButton></Tooltip> },
    { field: 'no', headerName: 'No.', width: 80, type: 'number' },
    { field: 'pd', headerName: 'PD', width: 150, type: 'date', valueGetter: (value: unknown) => value ? dayjs(value as string).toDate() : null, valueFormatter: (value: unknown) => value ? dayjs(value as Date).format('MMM D, YYYY') : '—' },
    { field: 'pt', headerName: 'PT', width: 120, type: 'string', valueFormatter: (value: unknown) => value ? dayjs(`2000-01-01 ${value}`).format('h:mm A') : '—' },
    { field: 'rt', headerName: 'RT', width: 120, type: 'string', valueFormatter: (value: unknown) => (value ? dayjs(`2000-01-01 ${value}`).format('h:mm A') : '—'), sortComparator: (v1: string, v2: string) => dayjs(`2000-01-01 ${v1}`).valueOf() - dayjs(`2000-01-01 ${v2}`).valueOf() },
    { field: 'rd', headerName: 'RD', width: 150, type: 'date', valueGetter: (value: unknown) => value ? dayjs(value as string).toDate() : null, valueFormatter: (value: unknown) => value ? dayjs(value as Date).format('MMM D, YYYY') : '—' },
    { field: 'name', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'unit', headerName: 'Unit', minWidth: 120, flex: 1 },
    { field: 'renter', headerName: 'Renter', minWidth: 140, flex: 1 },
    { field: 'type', headerName: 'Type', minWidth: 120 },
    { field: 'hub', headerName: 'Hub', minWidth: 160, flex: 1 },
    { field: 'groupChat', headerName: 'Group Chat', type: 'boolean', minWidth: 130, renderCell: (params: { value?: boolean }) => params.value ? <CheckCircleIcon sx={{ color: '#2E7D32' }} /> : <CancelIcon sx={{ color: '#B71C1C' }} /> },
    { field: 'rentalFee', headerName: 'Rental Fee', type: 'number', minWidth: 140, valueFormatter: (value: unknown) => `₱${Number(value ?? 0).toLocaleString()}` },
    { field: 'status', headerName: 'Status', minWidth: 150 },
    { field: 'availableUnit', headerName: 'Available Unit', minWidth: 150 },
  ];

  return (
    <Paper elevation={0} sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: '#fff', border: `1px solid ${BORDER}`, p: 2, textAlign: 'center' }}>
      <Typography sx={{ color: ESPRESSO, fontFamily: '"Sora", sans-serif', fontWeight: 700, fontSize: '0.9rem', mb: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Admin Rental Monitoring
      </Typography>
      <Typography sx={{ color: MUTED, fontSize: '0.78rem', mb: 1.5 }}>
        Click a row or the edit icon to safely update rental details. Renter identity and Group Chat indicator are read-only here.
      </Typography>
      <DataGrid
        rows={monitoringRows}
        columns={monitoringColumns}
        disableRowSelectionOnClick
        pagination
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        slots={{ toolbar: GridToolbar }}
        onRowClick={(params) => openEditDialog(params.row.rental)}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': { backgroundColor: '#fafafa' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
          '& .MuiDataGrid-row': { transition: 'background-color 0.2s ease', cursor: 'pointer' },
          '& .MuiDataGrid-row:hover': { backgroundColor: '#f8f8f8' },
          ...MOBILE_DATA_GRID_PAGINATION_SX,
        }}
      />

      <Dialog open={!!editingRental && !!editForm} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit Rental Monitoring Details</DialogTitle>
        {editingRental && editForm && (
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Renter Name" value={editingRental.renter ? `${editingRental.renter.renter_fname} ${editingRental.renter.renter_lname}` : '—'} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="Renter Type" value={monitoringRows.find((row) => row.id === editingRental.id)?.renter ?? '—'} InputProps={{ readOnly: true }} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="PD" type="date" required value={editForm.rent_date_start} onChange={(e) => setEditForm((f) => f && ({ ...f, rent_date_start: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="RD" type="date" required value={editForm.rent_date_end} onChange={(e) => setEditForm((f) => f && ({ ...f, rent_date_end: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="PT" value={editForm.pickup_time} onChange={(value) => setEditForm((f) => f && ({ ...f, pickup_time: value }))} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="RT" value={editForm.return_time} onChange={(value) => setEditForm((f) => f && ({ ...f, return_time: value }))} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Box>
            <FormControl fullWidth required>
              <InputLabel>Unit / Available Unit</InputLabel>
              <Select value={editForm.cam_name_id_fk} label="Unit / Available Unit" onChange={(e: SelectChangeEvent) => setEditForm((f) => f && ({ ...f, cam_name_id_fk: e.target.value }))}>
                {items.map((item) => <MenuItem key={item.id} value={item.id}>{item.device?.cam_name ?? 'Unknown camera'} · {item.code_name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={editForm.rentalType} label="Type" onChange={(e: SelectChangeEvent) => setEditForm((f) => f && ({ ...f, rentalType: e.target.value as 'pickup' | 'delivery' }))}>
                <MenuItem value="pickup">Pick-up</MenuItem>
                <MenuItem value="delivery">Deliver</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required={editForm.rentalType === 'pickup'}>
              <InputLabel>Hub</InputLabel>
              <Select value={editForm.branch_id_fk} label="Hub" onChange={(e: SelectChangeEvent) => setEditForm((f) => f && ({ ...f, branch_id_fk: e.target.value }))}>
                {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.location_name}</MenuItem>)}
              </Select>
            </FormControl>
            {editForm.rentalType === 'delivery' && (
              <TextField label="Delivery Address" required multiline minRows={2} value={editForm.delivery_addr} onChange={(e) => setEditForm((f) => f && ({ ...f, delivery_addr: e.target.value }))} fullWidth />
            )}
            <TextField label="Rental Fee" type="number" value={editForm.rent_price} onChange={(e) => setEditForm((f) => f && ({ ...f, rent_price: e.target.value }))} inputProps={{ min: 0, step: '0.01' }} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={editForm.status} label="Status" onChange={(e: SelectChangeEvent) => setEditForm((f) => f && ({ ...f, status: e.target.value as RentalStatus }))}>
                {monitoringStatusValues.map((value) => <MenuItem key={value} value={value}>{RENTAL_STATUS_META[value]?.label ?? value}</MenuItem>)}
              </Select>
            </FormControl>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={closeEditDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveMonitoringEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.msg}</Alert>
      </Snackbar>
    </Paper>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — CALENDAR (Teams-style continuous span bars, first name label)
// ═══════════════════════════════════════════════════════════════════════════════

const CalendarTab: React.FC<{ rentals: EnrichedRental[]; items: EnrichedItem[]; onSave: (id: string, updates: RentalUpdatePayload) => Promise<void> }> = ({ rentals, items, onSave }) => {
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [selectedRental, setSelectedRental] = useState<EnrichedRental | null>(null);
  const [visibleRange, setVisibleRange] = useState<CalendarVisibleRange | null>(null);

  const preparedCalendarRentals = useMemo(() => prepareRentalCalendarEntries(rentals, {
    selectedCamera,
    visibleRange,
    getItemIds: getRentalItemIds,
  }), [rentals, selectedCamera, visibleRange]);

  const calendarEvents: EventInput[] = useMemo(() => preparedCalendarRentals.map((entry) => {
    const { rental } = entry;
    const primaryItem = getPrimaryRentalItem(rental);
    const cameraName = primaryItem?.device?.cam_name ?? primaryItem?.code_name ?? 'Camera';
    const firstName = rental.renter?.renter_fname?.trim() || 'Renter';
    const lastInitial = rental.renter?.renter_lname?.trim().charAt(0);
    const renterName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
    const meta = RENTAL_STATUS_META[rental.status] ?? RENTAL_STATUS_META.submitted;

    return buildRentalCalendarEvent(entry, {
      title: `${cameraName} — ${renterName}`,
      color: meta.bg,
      contrastColor: meta.color,
      extendedProps: {
        renterId: rental.renter_id_fk,
        status: rental.status,
        renterName,
        cameraName,
        unitCode: primaryItem?.code_name ?? null,
        branchId: rental.branch_id_fk,
      },
    });
  }), [preparedCalendarRentals]);

  const handleVisibleRangeChange = useCallback((nextRange: CalendarVisibleRange) => {
    setVisibleRange((current) => (
      current?.start === nextRange.start && current.endExclusive === nextRange.endExclusive
        ? current
        : nextRange
    ));
  }, []);

  const openRentalById = (rentalId: string) => {
    const rental = rentals.find((candidate) => candidate.id === rentalId);
    if (rental) setSelectedRental(rental);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 300 } }}>
          <InputLabel sx={{ color: MUTED, fontSize: '0.82rem' }}>Filter by camera</InputLabel>
          <Select value={selectedCamera} onChange={(event: SelectChangeEvent) => setSelectedCamera(event.target.value)} label="Filter by camera">
            <MenuItem value="all">All cameras</MenuItem>
            {items.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                <Typography sx={{ fontSize: '0.82rem' }}>{item.device?.cam_name ?? '—'} · {item.code_name}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <RentalCalendar
        events={calendarEvents}
        onRentalClick={openRentalById}
        onVisibleRangeChange={handleVisibleRangeChange}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2.5 }}>
        {V2_RENTAL_STATUSES.map((status) => {
          const meta = RENTAL_STATUS_META[status];
          return (
            <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 24, height: 10, borderRadius: 1, background: meta.bg, border: `1px solid ${meta.border}` }} />
              <Typography sx={{ color: MUTED, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif' }}>{meta.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {selectedRental && (
        <RentalDetailDialog
          rental={selectedRental}
          open
          onClose={() => setSelectedRental(null)}
          onSave={onSave}
          allowVerificationLink={false}
        />
      )}
    </Box>
  );
};

// TAB 2 — INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

const ImageViewDialog: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => (
  <Dialog open={!!src} onClose={onClose} maxWidth="md"
    PaperProps={{ sx: { background: 'transparent', boxShadow: 'none' } }}>
    <Box sx={{ position: 'relative' }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', zIndex: 10, '&:hover': { background: 'rgba(0,0,0,0.8)' } }}>
        <CloseIcon />
      </IconButton>
      {src && <img src={src} alt="full size" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />}
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
        device_img = data.path;
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
        <input type="text" placeholder="Camera name *" value={camName} onChange={(e) => { setCamName(e.target.value); setError(''); }}
          style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem', color: ESPRESSO, background: CARD_BG, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        {error && <Typography sx={{ color: '#C0392B', fontSize: '0.78rem' }}>{error}</Typography>}
        <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        {preview
          ? <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
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

const CreateBranchDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const [locationName, setLocationName] = useState('');
  const [locationAddr, setLocationAddr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!locationName.trim() || !locationAddr.trim()) {
      setError('Location name and address are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('RB_BRANCHES').insert({
        location_name: locationName.trim(),
        location_addr: locationAddr.trim(),
      });
      if (insertError) throw new Error(insertError.message);
      onSaved();
      onClose();
      setLocationName('');
      setLocationAddr('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to create branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Create Branch
        <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        <input
          value={locationName}
          onChange={(e) => { setLocationName(e.target.value); setError(''); }}
          placeholder="Location Name"
          style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: ESPRESSO, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem' }}
        />
        <input
          value={locationAddr}
          onChange={(e) => { setLocationAddr(e.target.value); setError(''); }}
          placeholder="Location Address"
          style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: ESPRESSO, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem' }}
        />
        {error && <Typography sx={{ color: '#C0392B', fontSize: '0.78rem' }}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}>Create</Button>
      </DialogActions>
    </Dialog>
  );
};

const AddItemDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void; devices: RbDevice[]; branches: RbBranch[]; createdBy: string }> = ({ open, onClose, onSaved, devices, branches, createdBy }) => {
  const [deviceId, setDeviceId]   = useState('');
  const [codeName, setCodeName]   = useState('');
  const [serialNo, setSerialNo]   = useState('');
  const [remarks, setRemarks]     = useState('');
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
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSubmitErr('');
    try {
          const { error } = await supabase.from('RB_ITEM').insert({ device_id_fk: deviceId, code_name: codeName, serial_no: serialNo, remarks: remarks.trim() || null, branch_id_fk: branchId || null, gps_installed: gps, current_condition: 'working', status: 'Available', created_by: createdBy });
      if (error) throw new Error(error.message);
      onSaved(); onClose();
      setDeviceId(''); setCodeName(''); setSerialNo(''); setRemarks(''); setBranchId(''); setGps(false);
    } catch (e: unknown) { setSubmitErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const inputSx: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem', color: ESPRESSO, background: CARD_BG, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add Camera Unit <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <FormControl fullWidth size="small" error={!!errors.deviceId}>
          <InputLabel>Camera Type *</InputLabel>
          <Select value={deviceId} onChange={(e: SelectChangeEvent) => { setDeviceId(e.target.value); setErrors((p) => ({ ...p, deviceId: '' })); }} label="Camera Type *">
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
          {[{ label: 'Code Name *', val: codeName, key: 'codeName', set: setCodeName }, { label: 'Serial No. *', val: serialNo, key: 'serialNo', set: setSerialNo }].map((f) => (
            <Box key={f.key} sx={{ flex: 1 }}>
              <input placeholder={f.label} value={f.val} onChange={(e) => { f.set(e.target.value); setErrors((p) => ({ ...p, [f.key]: '' })); }}
                style={{ ...inputSx, border: `1.5px solid ${errors[f.key] ? '#C0392B' : BORDER}` }} />
              {errors[f.key] && <Typography sx={{ color: '#C0392B', fontSize: '0.72rem', mt: 0.25 }}>{errors[f.key]}</Typography>}
            </Box>
          ))}
        </Box>
        <textarea
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          style={{ ...inputSx, border: `1px solid ${BORDER}`, resize: 'vertical' }}
        />
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
  const [condition, setCondition] = useState<ItemCondition>('working');
  const [codeName, setCodeName]   = useState('');
  const [serialNo, setSerialNo]   = useState('');
  const [remarks, setRemarks]     = useState('');
  const [gps, setGps]             = useState(false);
  const [rentPrice, setRentPrice] = useState('');
  const [imgFile, setImgFile]     = useState<File | null>(null);
  const [preview, setPreview]     = useState('');
  const [saving, setSaving]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setCondition(item.current_condition);
      setCodeName(item.code_name);
      setSerialNo(item.serial_no);
      setRemarks(item.remarks ?? '');
      setGps(item.gps_installed);
      setRentPrice(item.rent_price?.toString() ?? '');
      setPreview(item.device?.device_img ?? '');
      setImgFile(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (imgFile && item.device_id_fk) {
        const path = `devices/${Date.now()}_${imgFile.name}`;
        const { data, error } = await supabase.storage.from('verification-images').upload(path, imgFile, { upsert: true });
        if (!error) {
          await supabase.from('RB_DEVICES').update({ device_img: data.path }).eq('id', item.device_id_fk);
        }
      }
      await supabase.from('RB_ITEM').update({
        current_condition: condition,
        code_name: codeName,
        serial_no: serialNo,
        remarks: remarks.trim() || null,
        gps_installed: gps,
        rent_price: rentPrice ? Number(rentPrice) : null,
      }).eq('id', item.id);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const inputSx: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: '"DM Sans", sans-serif', fontSize: '0.88rem', color: ESPRESSO, background: CARD_BG, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit — {item.device?.cam_name} <IconButton onClick={onClose} size="small" sx={{ color: MUTED }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {/* Image */}
        <Box>
          <Typography sx={{ color: AMBER_DARK, fontSize: '0.65rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, fontWeight: 700 }}>Device Image</Typography>
          <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0] ?? null; setImgFile(f); if (f) setPreview(URL.createObjectURL(f)); }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: 110, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />
              : <Box sx={{ width: 110, height: 80, borderRadius: 2, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 28, color: AMBER }} /></Box>}
            <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>Replace</Button>
          </Box>
        </Box>

        {/* Editable fields */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.5 }}>Code Name</Typography>
            <input value={codeName} onChange={(e) => setCodeName(e.target.value)} style={inputSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.5 }}>Serial No.</Typography>
            <input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} style={inputSx} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: AMBER_DARK, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', textTransform: 'uppercase', mb: 0.5 }}>Rent Price (₱)</Typography>
            <input type="number" min="0" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} placeholder="0.00" style={inputSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Condition</InputLabel>
              <Select value={condition} onChange={(e: SelectChangeEvent) => setCondition(e.target.value as ItemCondition)} label="Condition">
                <MenuItem value="working">Working</MenuItem>
                <MenuItem value="damaged">Damaged</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Remarks (optional)"
          style={{ ...inputSx, resize: 'vertical' }}
        />

        <FormControlLabel
          control={<Switch checked={gps} onChange={(e) => setGps(e.target.checked)} />}
          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><GpsFixedIcon sx={{ fontSize: 16, color: AMBER }} /><Typography sx={{ color: INK, fontSize: '0.85rem' }}>GPS Installed</Typography></Box>}
        />
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
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [addItemOpen, setAddItemOpen]     = useState(false);
  const [editItem, setEditItem]           = useState<EnrichedItem | null>(null);
  const [viewImg, setViewImg]             = useState<string | null>(null);

  const handleDelete = async (item: EnrichedItem) => {
    if (!window.confirm(`Delete unit "${item.code_name}"? This cannot be undone.`)) return;
    await supabase.from('RB_ITEM').delete().eq('id', item.id);
    onRefresh();
  };

  type InventoryRow = {
    id: string;
    imageUrl: string | null;
    cameraCode: string;
    cameraName: string;
    codeName: string;
    serialNo: string;
    condition: ItemCondition;
    gps: boolean;
    item: EnrichedItem;
  };

  const inventoryRows: InventoryRow[] = items.map((item) => ({
    id: item.id,
    imageUrl: item.device?.device_img ?? null,
    cameraCode: `${item.device?.cam_name ?? '—'} ${item.code_name}`,
    cameraName: item.device?.cam_name ?? '—',
    codeName: item.code_name,
    serialNo: item.serial_no,
    condition: item.current_condition,
    gps: item.gps_installed,
    item,
  }));

  const inventoryColumns: GridColDef<InventoryRow>[] = [
    {
      field: 'imageUrl',
      headerName: 'Image',
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{ position: 'relative', width: 60, cursor: params.row.imageUrl ? 'pointer' : 'default' }}
            onClick={() => params.row.imageUrl && setViewImg(params.row.imageUrl)}
          >
            {params.row.imageUrl
              ? <>
                  <img src={params.row.imageUrl} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 7, border: `1px solid ${BORDER}`, display: 'block' }} />
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: 7, opacity: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', '&:hover': { background: 'rgba(0,0,0,0.28)', opacity: 1 } }}>
                    <ZoomInIcon sx={{ color: '#fff', fontSize: 20 }} />
                  </Box>
                </>
              : <Box sx={{ width: 60, height: 44, borderRadius: 1.5, background: 'rgba(201,151,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CameraAltIcon sx={{ fontSize: 22, color: AMBER }} /></Box>}
          </Box>
        </Box>
      ),
    },
    {
      field: 'cameraCode',
      headerName: 'Camera - Code',
      minWidth: 220,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography sx={{ color: ESPRESSO, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>{params.row.cameraName}</Typography>
          <Typography sx={{ color: AMBER, fontSize: '0.72rem', fontFamily: '"Sora", sans-serif', lineHeight: 1.3 }}>{params.row.codeName}</Typography>
        </Box>
      ),
    },
    {
      field: 'serialNo',
      headerName: 'Serial No.',
      minWidth: 150,
      flex: 0.7,
      renderCell: (params) => <Typography sx={{ color: MUTED, fontSize: '0.78rem', fontFamily: 'monospace' }}>{params.value}</Typography>,
    },
    {
      field: 'condition',
      headerName: 'Condition',
      minWidth: 150,
      renderCell: (params) => (
        <Chip
          label={params.row.condition}
          size="small"
          sx={{
            background: params.row.condition === 'working' ? 'rgba(105,219,124,0.1)' : 'rgba(211,47,47,0.1)',
            color: params.row.condition === 'working' ? '#2E7D32' : '#B71C1C',
            border: `1px solid ${params.row.condition === 'working' ? 'rgba(105,219,124,0.3)' : 'rgba(211,47,47,0.3)'}`,
            fontFamily: '"Sora", sans-serif',
            fontWeight: 600,
            fontSize: '0.68rem',
            height: 22,
            textTransform: 'capitalize',
            width: 'fit-content',
          }}
        />
      ),
    },
    {
      field: 'gps',
      headerName: 'GPS',
      type: 'boolean',
      minWidth: 110,
      renderCell: (params) => (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {params.row.gps ? <GpsFixedIcon sx={{ fontSize: 16, color: '#2E7D32' }} /> : <Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>—</Typography>}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, width: '100%' }}>
          <Tooltip title="Edit unit">
            <IconButton size="small" onClick={() => setEditItem(params.row.item)} sx={{ color: MUTED, '&:hover': { color: AMBER } }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete unit">
            <IconButton size="small" onClick={() => handleDelete(params.row.item)} sx={{ color: MUTED, '&:hover': { color: '#B71C1C' } }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ color: ESPRESSO, fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.15rem' }}>
          Camera Inventory <span style={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontWeight: 400, fontSize: '0.8rem' }}>({items.length} units)</span>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isAdmin && <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddDeviceOpen(true)}>Add Camera Type</Button>}
          {isAdmin && <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddBranchOpen(true)}>Create Branch</Button>}
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddItemOpen(true)}>Add Unit</Button>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #eee',
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <DataGrid
          rows={inventoryRows}
          columns={inventoryColumns}
          disableRowSelectionOnClick
          pagination
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          sx={{
            border: 0,
            minHeight: 520,
            '& .MuiDataGrid-columnHeaders': {
              minHeight: 56,
              backgroundColor: '#fafafa',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
            },
            '& .MuiDataGrid-columnHeader[data-field="imageUrl"]': {
              pl: 2,
            },
            '& .MuiDataGrid-cell[data-field="imageUrl"]': {
              pl: 2,
            },
            '& .MuiDataGrid-row': { transition: 'background-color 0.2s ease' },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f8f8f8' },
            '& .MuiDataGrid-cell': { py: 1, fontFamily: '"DM Sans", sans-serif' },
            '& .MuiDataGrid-toolbarContainer': { p: 1.5, gap: 1 },
            ...MOBILE_DATA_GRID_PAGINATION_SX,
          }}
        />
      </Paper>

      <AddDeviceDialog open={addDeviceOpen} onClose={() => setAddDeviceOpen(false)} onSaved={onRefresh} />
      <CreateBranchDialog open={addBranchOpen} onClose={() => setAddBranchOpen(false)} onSaved={onRefresh} />
      <AddItemDialog   open={addItemOpen}   onClose={() => setAddItemOpen(false)}   onSaved={onRefresh} devices={devices} branches={branches} createdBy={createdBy} />
      <EditItemDialog  item={editItem}      open={!!editItem}                        onClose={() => setEditItem(null)} onSaved={onRefresh} />
      <ImageViewDialog src={viewImg}        onClose={() => setViewImg(null)} />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOP BAR + ROOT
// ═══════════════════════════════════════════════════════════════════════════════

const drawerWidth = 260;
const collapsedDrawerWidth = 84;
const appBarHeight = 64;

const ADMIN_NAV_ITEMS: Array<{ label: string; icon: React.ReactNode }> = [
  { label: 'Overview', icon: <DashboardIcon /> },
  { label: 'Calendar', icon: <CalendarMonthIcon /> },
  { label: 'Monitoring', icon: <MonitorHeartIcon /> },
  { label: 'Inventory', icon: <InventoryIcon /> },
  { label: 'Others', icon: <SettingsSuggestIcon /> },
];

interface AdminHeaderProps {
  rbUser: RbUser;
  onMenuToggle: () => void;
  onLogout: () => void;
  rentals: EnrichedRental[];
  desktopDrawerWidth: number;
  isMobile: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ rbUser, onMenuToggle, onLogout, rentals, desktopDrawerWidth, isMobile }) => {
  const navigate = useNavigate();
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const submittedRentals = rentals.filter((r) => r.status === 'submitted');

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        ml: { md: `${desktopDrawerWidth}px` },
        width: { md: `calc(100% - ${desktopDrawerWidth}px)` },
        background: 'rgba(255,255,255,0.96)',
        color: INK,
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`,
        boxShadow: '0 1px 10px rgba(17,17,17,0.05)',
        transition: (theme) => theme.transitions.create(['margin-left', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.shorter,
        }),
      }}
    >
      <Toolbar sx={{ minHeight: { xs: appBarHeight, md: appBarHeight }, px: { xs: 1, sm: 2, md: 3 }, gap: { xs: 1, sm: 1.5 } }}>
        <Tooltip title={isMobile ? 'Open navigation' : 'Collapse navigation'}>
          <IconButton
            edge="start"
            onClick={onMenuToggle}
            sx={{
              color: INK,
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              background: '#fff',
              '&:hover': { background: 'rgba(201,151,58,0.08)' },
            }}
            aria-label="toggle admin navigation"
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <AdminPanelSettingsIcon sx={{ color: AMBER, fontSize: 22, display: { xs: 'none', sm: 'block' } }} />
          <Typography sx={{ fontFamily: '"Playfair Display", serif', color: ESPRESSO, fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, whiteSpace: 'nowrap' }}>
            recap buddies
          </Typography>
          <Chip label={rbUser.role.toUpperCase()} size="small" sx={{ background: 'rgba(201,151,58,0.14)', color: AMBER_DARK, border: `1px solid ${BORDER}`, fontSize: '0.62rem', fontFamily: '"Sora", sans-serif', height: 20, display: { xs: 'none', sm: 'inline-flex' } }} />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.25 }, flexShrink: 0 }}>
          <Tooltip title="Booking requests">
            <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} size="small" sx={{ color: MUTED }}>
              <Badge badgeContent={submittedRentals.length} color="error" max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={() => setNotifAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 360, maxWidth: '95vw', borderRadius: 2 } }}
          >
            {submittedRentals.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary="No new booking requests" />
              </MenuItem>
            ) : submittedRentals.map((r, index) => (
              <React.Fragment key={r.id}>
                <MenuItem
                  onClick={() => {
                    setNotifAnchor(null);
                    navigate(`/admin/verify/${r.id}`);
                  }}
                  sx={{
                    whiteSpace: 'normal',
                    alignItems: 'flex-start',
                    py: 1.25,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(201,151,58,0.08)' },
                  }}
                >
                  <ListItemText
                    primary={`${r.renter?.renter_fname ?? 'Unknown'} ${r.renter?.renter_lname ?? ''}`.trim()}
                    secondary={`${formatCompactRentalItems(r)} • ${dayjs(r.rent_date_start).format('MMM D, YYYY')} - ${dayjs(r.rent_date_end).format('MMM D, YYYY')}\nSubmitted ${dayjs(r.created_at).format('MMM D, YYYY h:mm A')}`}
                    secondaryTypographyProps={{ sx: { whiteSpace: 'pre-line' } }}
                  />
                </MenuItem>
                {index < submittedRentals.length - 1 && <Divider sx={{ my: 0.25 }} />}
              </React.Fragment>
            ))}
          </Menu>
          <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${AMBER}, ${AMBER_LIGHT})`, fontSize: '0.85rem', fontWeight: 700, fontFamily: '"Sora", sans-serif', color: '#fff' }}>
            {rbUser.user_fname[0]?.toUpperCase()}
          </Avatar>
          <Typography sx={{ color: MUTED, fontSize: '0.8rem', fontFamily: '"Sora", sans-serif', display: { xs: 'none', md: 'block' } }}>{rbUser.user_fname}</Typography>
          <Tooltip title="Sign out">
            <IconButton onClick={onLogout} size="small" sx={{ color: MUTED, '&:hover': { color: '#C0392B' } }}><LogoutIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

interface AdminDrawerProps {
  tab: number;
  onTab: (t: number) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  isMobile: boolean;
}

const AdminDrawer: React.FC<AdminDrawerProps> = ({ tab, onTab, mobileOpen, onMobileClose, collapsed, isMobile }) => {
  const effectiveWidth = collapsed && !isMobile ? collapsedDrawerWidth : drawerWidth;

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Toolbar sx={{ minHeight: appBarHeight, px: collapsed && !isMobile ? 1.5 : 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
          <AdminPanelSettingsIcon sx={{ color: AMBER, fontSize: 24, flexShrink: 0 }} />
          {(!collapsed || isMobile) && (
            <Box>
              <Typography sx={{ color: ESPRESSO, fontWeight: 800, fontSize: '0.95rem', fontFamily: '"Playfair Display", serif', whiteSpace: 'nowrap' }}>
                Admin Console
              </Typography>
              <Typography sx={{ color: MUTED, fontSize: '0.68rem', fontFamily: '"Sora", sans-serif', whiteSpace: 'nowrap' }}>
                Recap Buddies
              </Typography>
            </Box>
          )}
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ px: 1.5, py: 2 }}>
        {(!collapsed || isMobile) && (
          <Typography sx={{ px: 1, mb: 1, color: MUTED, fontSize: '0.72rem', fontWeight: 700, fontFamily: '"Sora", sans-serif' }}>
            Main items
          </Typography>
        )}
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {ADMIN_NAV_ITEMS.map((item, index) => {
            const selected = tab === index;
            return (
              <ListItemButton
                key={item.label}
                selected={selected}
                onClick={() => {
                  onTab(index);
                  if (isMobile) onMobileClose();
                }}
                sx={{
                  minHeight: 46,
                  borderRadius: 2.5,
                  px: collapsed && !isMobile ? 1.5 : 1.75,
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  color: selected ? INK : MUTED,
                  '&.Mui-selected': {
                    background: 'rgba(201,151,58,0.14)',
                    color: INK,
                    boxShadow: 'inset 0 0 0 1px rgba(201,151,58,0.18)',
                  },
                  '&.Mui-selected:hover, &:hover': {
                    background: selected ? 'rgba(201,151,58,0.18)' : 'rgba(17,17,17,0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed && !isMobile ? 0 : 38, justifyContent: 'center', '& .MuiSvgIcon-root': { fontSize: 20 } }}>
                  {item.icon}
                </ListItemIcon>
                {(!collapsed || isMobile) && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: { fontFamily: '"Sora", sans-serif', fontWeight: selected ? 800 : 600, fontSize: '0.86rem' },
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onMobileClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: effectiveWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: effectiveWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${BORDER}`,
          background: '#fff',
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tab, setTab]           = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopDrawerCollapsed, setDesktopDrawerCollapsed] = useState(false);
  const [rbUser, setRbUser]     = useState<RbUser | null>(null);
  const [rentals, setRentals]   = useState<EnrichedRental[]>([]);
  const [items, setItems]       = useState<EnrichedItem[]>([]);
  const [devices, setDevices]   = useState<RbDevice[]>([]);
  const [branches, setBranches] = useState<RbBranch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [authUid, setAuthUid]   = useState('');
  const [agreementMd, setAgreementMd] = useState('');
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementSaving, setAgreementSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'warning' }>({ open: false, msg: '', severity: 'success' });

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

    const signedDevices = await signDeviceImages((devsRaw ?? []) as RbDevice[]);
    const signedDeviceMap = new Map(signedDevices.map((device) => [device.id, device]));
    const hydrateItemDevice = (item: EnrichedItem): EnrichedItem => ({
      ...item,
      device: item.device?.id ? signedDeviceMap.get(item.device.id) ?? item.device : item.device,
    });
    setDevices(signedDevices);
    setBranches(branchesRaw ?? []);
    setItems(((itemsRaw ?? []) as EnrichedItem[]).map(hydrateItemDevice));

    const devMap: Record<string, RbDevice> = {};
    signedDevices.forEach((d) => { devMap[d.id] = d; });

    if (rentalsRaw && rentalsRaw.length > 0) {
      const rf = rentalsRaw as RbRentalForm[];
      const rentalIds = rf.map((r) => r.id);
      const { data: rentalItemsRaw } = rentalIds.length ? await supabase.from('RB_RENTAL_ITEMS').select('*').in('rental_form_id', rentalIds) : { data: [] };
      const linkedItemIds = [...new Set((rentalItemsRaw ?? []).map((link: RentalItemLink) => link.item_id_fk).filter(Boolean))] as string[];
      const legacyItemIds = rf.map((r) => r.cam_name_id_fk).filter(Boolean) as string[];
      const itemIds   = [...new Set([...linkedItemIds, ...legacyItemIds])];
      const renterIds = [...new Set(rf.map((r) => r.renter_id_fk).filter(Boolean))]   as string[];
      const bIds      = [...new Set([...rf.map((r) => r.branch_id_fk), ...rf.map((r) => r.hub_pick_up_addr), ...rf.map((r) => r.hub_return_addr)].filter(Boolean))] as string[];

      const [{ data: rentItemsRaw }, { data: rentersRaw }, { data: rentBranchesRaw }] = await Promise.all([
        itemIds.length   ? supabase.from('RB_ITEM').select('*, device:RB_DEVICES(id,cam_name,device_img)').in('id', itemIds) : Promise.resolve({ data: [] }),
        renterIds.length ? supabase.from('RB_RENTER').select('*').in('id', renterIds)                                        : Promise.resolve({ data: [] }),
        bIds.length      ? supabase.from('RB_BRANCHES').select('*').in('id', bIds)                                           : Promise.resolve({ data: [] }),
      ]);

      const iMap: Record<string, EnrichedItem> = {};
      const rMap: Record<string, RbRenter>     = {};
      const bMap: Record<string, RbBranch>     = {};
      (rentItemsRaw    ?? []).forEach((it: EnrichedItem) => { iMap[it.id] = hydrateItemDevice(it); });
      (rentersRaw      ?? []).forEach((r: RbRenter)      => { rMap[r.id]  = r; });
      (rentBranchesRaw ?? []).forEach((b: RbBranch)      => { bMap[b.id]  = b; });

      const selfieInstructionIds = [
        ...new Set((rentersRaw ?? [])
          .map((r: RbRenter) => r.selfie_verification_id)
          .filter(Boolean)),
      ] as string[];
      const { data: selfieInstructionsRaw } = selfieInstructionIds.length
        ? await supabase.from('RB_SELFIE_VERIFICATION_INST').select('id, instruction_name, instruction_desc').in('id', selfieInstructionIds)
        : { data: [] };
      const selfieInstructionMap = new Map<string, RbSelfieVerificationInst>(
        ((selfieInstructionsRaw ?? []) as RbSelfieVerificationInst[]).map((instruction) => [instruction.id, instruction])
      );

      const rentalItemsByRental = new Map<string, RentalItemLink[]>();
      (rentalItemsRaw ?? []).forEach((link: RentalItemLink) => {
        const enrichedLink = { ...link, item: iMap[link.item_id_fk] };
        rentalItemsByRental.set(link.rental_form_id, [...(rentalItemsByRental.get(link.rental_form_id) ?? []), enrichedLink]);
      });

      setRentals(rf.map((r) => {
        const renter = r.renter_id_fk ? rMap[r.renter_id_fk] : undefined;
        const rentalItems = rentalItemsByRental.get(r.id) ?? [];
        const items = rentalItems.map((link) => link.item).filter((item): item is EnrichedItem => !!item);
        return {
          ...r,
          rentalItems,
          items,
          item:              items[0] ?? (r.cam_name_id_fk ? iMap[r.cam_name_id_fk] : undefined),
          renter,
          pickupBranch:      r.hub_pick_up_addr ? bMap[r.hub_pick_up_addr] : undefined,
          returnBranch:      r.hub_return_addr  ? bMap[r.hub_return_addr]  : undefined,
          selfieInstruction: renter?.selfie_verification_id ? selfieInstructionMap.get(renter.selfie_verification_id) ?? null : null,
        };
      }));
    } else {
      setRentals([]);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => { void Promise.resolve().then(fetchAll); }, [fetchAll]);
  const loadAgreement = useCallback(async () => {
    setAgreementLoading(true);
    const { data, error } = await supabase.storage.from('terms_and_condition').download('agreement.md');
    if (error || !data) {
      setSnackbar({ open: true, msg: `Failed to load agreement: ${error?.message ?? 'Unknown error'}`, severity: 'error' });
      setAgreementLoading(false);
      return;
    }
    setAgreementMd(await data.text());
    setAgreementLoading(false);
  }, []);
  useEffect(() => {
    if (tab === 4 && !agreementMd && !agreementLoading) void Promise.resolve().then(loadAgreement);
  }, [tab, agreementMd, agreementLoading, loadAgreement]);

  const handleSaveStatus = useCallback(async (
    id: string,
    updates: RentalUpdatePayload
  ) => {
    const parsedRentPrice = updates.rent_price.trim() === '' ? null : Number(updates.rent_price);
    const nextRentalItems = updates.rentalItems ?? [{ itemId: updates.cam_name_id_fk }];
    const nextItemIds = nextRentalItems.map((row) => row.itemId).filter(Boolean);
    if (nextItemIds.length === 0) throw new Error('Please select at least one device for this rental.');
    if (new Set(nextItemIds).size !== nextItemIds.length) throw new Error('This unit is already selected for this rental.');
    const payload: {
      status: string;
      actual_return_date?: string | null;
      remarks: string | null;
      messenger_link: string | null;
      rent_price: number | null;
      cam_name_id_fk: string;
      rent_date_start: string;
      rent_date_end: string;
      pickup_time: string | null;
      return_time: string | null;
    } = {
      status: updates.status,
      remarks: updates.remarks.trim() || null,
      messenger_link: updates.messenger_link.trim() || null,
      rent_price: parsedRentPrice == null || Number.isNaN(parsedRentPrice) ? null : Math.max(parsedRentPrice, 0),
      cam_name_id_fk: nextItemIds[0] ?? updates.cam_name_id_fk,
      rent_date_start: updates.rent_date_start,
      rent_date_end: updates.rent_date_end,
      pickup_time: updates.pickup_time || null,
      return_time: updates.return_time || null,
    };
    if (updates.status === 'completed') payload.actual_return_date = dayjs().format('YYYY-MM-DD');

    const { error: updateError } = await supabase.from('RB_RENTAL_FORM').update(payload).eq('id', id);
    if (updateError) {
      console.error('Failed to update rental status:', updateError);
      throw updateError;
    }

    const targetRental = rentals.find((r) => r.id === id);
    if (targetRental) {
      await syncRentalItems(id, targetRental.rentalItems ?? [], nextRentalItems);
    }

    const itemStatus = RENTAL_TO_ITEM_STATUS[updates.status];
    if (targetRental && itemStatus) {
      const previousItemIds = getRentalItemIds(targetRental);
      await Promise.all(previousItemIds
        .filter((itemId) => !nextItemIds.includes(itemId))
        .map((itemId) => supabase.from('RB_ITEM').update({ status: 'Available' }).eq('id', itemId)));
      await Promise.all(nextItemIds.map((itemId) => supabase.from('RB_ITEM').update({ status: itemStatus }).eq('id', itemId)));
    }

    if (targetRental && updates.status !== targetRental.status) {
      const updatedRental = {
        ...targetRental,
        ...payload,
        remarks: updates.remarks.trim() || null,
      };

      try {
        await sendRentalStatusEmail({
          status: updates.status,
          rental: updatedRental,
          renter: targetRental.renter,
        });
      } catch (emailError) {
        console.error('Failed to send status email:', emailError);
        setSnackbar({
          open: true,
          msg: 'Status updated, but email notification failed.',
          severity: 'warning',
        });
      }

    }

    await fetchAll();
  }, [fetchAll, rentals]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: CREAM, flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: AMBER }} />
        <Typography sx={{ color: MUTED, fontFamily: '"Sora", sans-serif', fontSize: '0.82rem' }}>Loading dashboard…</Typography>
      </Box>
    );
  }

  if (!rbUser) return null;

  const desktopDrawerWidth = desktopDrawerCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex' }}>
      <AdminHeader
        rbUser={rbUser}
        onMenuToggle={() => {
          if (isMobile) setMobileDrawerOpen(true);
          else setDesktopDrawerCollapsed((collapsed) => !collapsed);
        }}
        onLogout={handleLogout}
        rentals={rentals}
        desktopDrawerWidth={desktopDrawerWidth}
        isMobile={isMobile}
      />
      <AdminDrawer
        tab={tab}
        onTab={setTab}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
        collapsed={desktopDrawerCollapsed}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${desktopDrawerWidth}px)` },
          pt: `${appBarHeight}px`,
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: 1400, mx: 'auto' }}>
          {tab === 0 && <OverviewTab  rentals={rentals} onSave={handleSaveStatus} />}
          {tab === 1 && <CalendarTab  rentals={rentals} items={items} onSave={handleSaveStatus} />}
          {tab === 2 && <MonitoringTab rentals={rentals} items={items} branches={branches} onSaved={fetchAll} />}
          {tab === 3 && <InventoryTab items={items} devices={devices} branches={branches} isAdmin={rbUser.role === 'admin'} createdBy={authUid} onRefresh={fetchAll} />}
          {tab === 4 && (
            <Paper sx={{ p: 3, borderRadius: 4, border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
              <Typography sx={{ mb: 2, fontWeight: 700 }}>Terms & Conditions</Typography>
              <TextField multiline minRows={14} fullWidth value={agreementMd} onChange={(e) => setAgreementMd(e.target.value)} placeholder="Write markdown content here..." />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button variant="outlined" onClick={() => void loadAgreement()} disabled={agreementLoading}>Reload</Button>
                <Button variant="contained" disabled={agreementSaving || !agreementMd.trim()} onClick={async () => {
                  setAgreementSaving(true);
                  const blob = new Blob([agreementMd], { type: 'text/markdown;charset=utf-8' });
                  const { error } = await supabase.storage.from('terms_and_condition').upload('agreement.md', blob, { upsert: true, contentType: 'text/markdown' });
                  setAgreementSaving(false);
                  if (error) setSnackbar({ open: true, msg: `Save failed: ${error.message}`, severity: 'error' });
                  else setSnackbar({ open: true, msg: 'Terms & Conditions updated successfully.', severity: 'success' });
                }}>Save Changes</Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
