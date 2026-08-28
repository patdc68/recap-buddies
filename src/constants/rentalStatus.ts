export const V2_RENTAL_STATUS_META = {
  submitted: { label: 'Submitted', color: '#B8860B', bg: 'rgba(255,212,59,0.10)', border: 'rgba(255,212,59,0.30)' },
  'in-review': { label: 'In Review', color: '#1565C0', bg: 'rgba(100,149,237,0.10)', border: 'rgba(100,149,237,0.30)' },
  confirmed: { label: 'Confirmed', color: '#00695C', bg: 'rgba(0,150,136,0.10)', border: 'rgba(0,150,136,0.30)' },
  renting: { label: 'Renting', color: '#7A4F00', bg: 'rgba(201,151,58,0.12)', border: 'rgba(201,151,58,0.40)' },
  completed: { label: 'Completed', color: '#2E7D32', bg: 'rgba(105,219,124,0.10)', border: 'rgba(105,219,124,0.30)' },
  declined: { label: 'Declined', color: '#B71C1C', bg: 'rgba(211,47,47,0.08)', border: 'rgba(211,47,47,0.25)' },
} as const;

export type V2RentalStatus = keyof typeof V2_RENTAL_STATUS_META;

export const V2_RENTAL_STATUSES = Object.keys(V2_RENTAL_STATUS_META) as V2RentalStatus[];

export const V2_NEXT_STATUSES: Record<V2RentalStatus, V2RentalStatus[]> = {
  submitted: ['in-review'],
  'in-review': ['confirmed', 'declined'],
  confirmed: ['renting'],
  renting: ['completed'],
  completed: [],
  declined: [],
};

export const getV2StatusLabel = (status: string | null | undefined) =>
  V2_RENTAL_STATUS_META[status as V2RentalStatus]?.label ?? status ?? 'Unknown';

export const isV2RentalStatus = (status: string): status is V2RentalStatus =>
  status in V2_RENTAL_STATUS_META;
