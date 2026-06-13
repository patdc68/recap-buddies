import type { RentalStatus } from '../service/supabaseClient';

export const RENTAL_STATUSES: RentalStatus[] = ['for-review', 'confirmed', 'declined', 'canceled', 'extended', 'ongoing', 'completed'];

export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  'for-review': 'For Review',
  confirmed: 'Confirmed',
  declined: 'Declined',
  canceled: 'Canceled',
  extended: 'Extended',
  ongoing: 'Ongoing',
  completed: 'Completed',
};

const LEGACY_STATUS_MAP: Record<string, RentalStatus> = {
  submitted: 'for-review',
  'in-review': 'confirmed',
  in_review: 'confirmed',
  renting: 'ongoing',
  cancelled: 'canceled',
  Canceled: 'canceled',
  Cancelled: 'canceled',
};

export const normalizeRentalStatus = (status?: string | null): RentalStatus => {
  if (!status) return 'for-review';
  const trimmed = status.trim();
  const lower = trimmed.toLowerCase();
  return (LEGACY_STATUS_MAP[trimmed] ?? LEGACY_STATUS_MAP[lower] ?? (RENTAL_STATUSES.includes(lower as RentalStatus) ? lower : 'for-review')) as RentalStatus;
};

export const isActiveRentalStatus = (status?: string | null) => {
  const normalized = normalizeRentalStatus(status);
  return !['declined', 'canceled', 'completed'].includes(normalized);
};

export const isOngoingLikeRentalStatus = (status?: string | null) => ['extended', 'ongoing'].includes(normalizeRentalStatus(status));
export const isTerminalRentalStatus = (status?: string | null) => ['declined', 'canceled', 'completed'].includes(normalizeRentalStatus(status));

export const shouldDisplayAsOngoing = (status: string | null | undefined, rentDateStart?: string | null) => {
  const normalized = normalizeRentalStatus(status);
  if (!['confirmed', 'extended'].includes(normalized) || !rentDateStart) return normalized;
  const nowInManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const today = `${nowInManila.getFullYear()}-${String(nowInManila.getMonth() + 1).padStart(2, '0')}-${String(nowInManila.getDate()).padStart(2, '0')}`;
  return rentDateStart <= today ? 'ongoing' : normalized;
};
