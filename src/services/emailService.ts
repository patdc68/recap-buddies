import { supabase } from '../service/supabaseClient';
import type { RentalEmailType } from '../types/email';

interface RentalEmailPayload {
  type: RentalEmailType;
  to: string;
  renterName?: string;
  rentalCode?: string;
  startDate?: string;
  endDate?: string;
  remarks?: string;
}

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

export const emailService = {
  sendSubmittedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'submitted' }),
  sendInReviewEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'in_review' }),
  sendDeclinedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'declined' }),
  sendStartReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'start_reminder' }),
  sendReturnReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'return_reminder' }),
};
