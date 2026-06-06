import { supabase } from '../service/supabaseClient';
import type { RbRentalForm, RbRenter } from '../service/supabaseClient';
import type { RentalEmailType } from '../types/email';

export interface RentalEmailPayload {
  type: RentalEmailType;
  to: string;
  renterName?: string;
  rentalCode?: string;
  startDate?: string;
  endDate?: string;
  remarks?: string | null;
}

export const EMAIL_TYPE_BY_STATUS: Partial<Record<string, RentalEmailType>> = {
  submitted: 'submitted',
  'in-review': 'in_review',
  in_review: 'in_review',
  declined: 'declined',
};

const invokeSendRentalEmail = async (payload: RentalEmailPayload) => {
  const { data, error } = await supabase.functions.invoke('send-rental-email', { body: payload });

  if (error) {
    console.error('Edge function invocation failed:', error);
    throw new Error(error.message || 'Failed to invoke email function');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};

export const sendRentalEmail = async ({ type, to, ...payload }: RentalEmailPayload) => {
  if (!to) return null;
  return invokeSendRentalEmail({ ...payload, type, to });
};

export const sendRentalStatusEmail = async ({
  status,
  rental,
  renter,
}: {
  status: string;
  rental: Pick<RbRentalForm, 'id' | 'rent_date_start' | 'rent_date_end' | 'remarks'>;
  renter?: Pick<RbRenter, 'email' | 'renter_fname' | 'renter_lname'> | null;
}) => {
  const normalizedStatus = status.toLowerCase();
  const emailType = EMAIL_TYPE_BY_STATUS[normalizedStatus];

  console.log('Sending rental email:', {
    status,
    emailType,
    renterEmail: renter?.email,
    rentalId: rental?.id,
  });

  if (!emailType || !renter?.email) return null;

  return sendRentalEmail({
    type: emailType,
    to: renter.email,
    renterName: `${renter.renter_fname ?? ''} ${renter.renter_lname ?? ''}`.trim(),
    rentalCode: rental.id,
    startDate: rental.rent_date_start,
    endDate: rental.rent_date_end,
    remarks: rental.remarks,
  });
};

export const emailService = {
  sendSubmittedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'submitted' }),
  sendInReviewEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'in_review' }),
  sendDeclinedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'declined' }),
  sendStartReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'start_reminder' }),
  sendReturnReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'return_reminder' }),
};
