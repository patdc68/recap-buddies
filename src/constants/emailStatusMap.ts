import type { RentalEmailType } from '../types/email';

export const EMAIL_STATUS_MAP: Partial<Record<string, RentalEmailType>> = {
  submitted: 'submitted',
  'in-review': 'in_review',
  declined: 'declined',
};
