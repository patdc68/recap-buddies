import { supabase } from '../service/supabaseClient';
import type { RbRentalForm } from '../service/supabaseClient';
import type { RentalEmailType } from '../types/email';

export interface RentalEmailPayload {
  type: RentalEmailType;
  rentalId: string;
}

export const EMAIL_TYPE_BY_STATUS: Partial<Record<string, RentalEmailType>> = {
  submitted: 'submitted',
  'in-review': 'in_review',
  in_review: 'in_review',
  confirmed: 'confirmed',
  declined: 'declined',
};

const invokeSendRentalEmail = async (payload: RentalEmailPayload) => {
  const { data, error } = await supabase.functions.invoke('send-rental-email', {
    body: payload,
  });

  if (error) {
    console.error('Edge function invocation failed:', error);
    if (typeof error === 'object' && error && 'context' in error) {
      const context = (error as { context?: Response }).context;
      if (context instanceof Response) {
        const responseBody = await context.clone().json().catch(() => null) as { error?: string } | null;
        if (responseBody?.error) throw new Error(responseBody.error);
      }
    }
    throw new Error(error.message || 'Failed to invoke email function');
  }

  if (!data || data.success !== true) {
    throw new Error(data?.error || 'The email service did not confirm delivery acceptance.');
  }

  return data as { success: true; id: string | null };
};

export const sendRentalEmail = async (payload: RentalEmailPayload) => invokeSendRentalEmail(payload);

export const sendRentalStatusEmail = async ({
  status,
  rental,
}: {
  status: string;
  rental: Pick<RbRentalForm, 'id'>;
  renter?: unknown;
}) => {
  const normalizedStatus = status.toLowerCase();
  const emailType = EMAIL_TYPE_BY_STATUS[normalizedStatus];

  if (!emailType || !rental?.id) return null;

  return sendRentalEmail({
    type: emailType,
    rentalId: rental.id,
  });
};

export const emailService = {
  sendSubmittedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'submitted' }),
  sendInReviewEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'in_review' }),
  sendConfirmedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'confirmed' }),
  sendDeclinedEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'declined' }),
  sendStartReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'start_reminder' }),
  sendReturnReminderEmail: (payload: Omit<RentalEmailPayload, 'type'>) => invokeSendRentalEmail({ ...payload, type: 'return_reminder' }),
};
