import { supabase } from '../service/supabaseClient';

export type RentalEmailType = 'submitted' | 'in_review' | 'declined' | 'start_reminder' | 'return_reminder';

interface SendRentalEmailParams {
  type: RentalEmailType;
  email: string;
  renterName?: string;
}

export const sendRentalEmail = async ({ type, email, renterName }: SendRentalEmailParams) => {
  const { data, error } = await supabase.functions.invoke('send-rental-email', {
    body: {
      type,
      email,
      renterName,
    },
  });

  if (error) {
    console.error('Email sending failed:', error);
    throw error;
  }

  return data;
};

export const sendSubmittedEmail = async (email: string, renterName?: string) => sendRentalEmail({
  type: 'submitted',
  email,
  renterName,
});

export const sendInReviewEmail = async (email: string, renterName?: string) => sendRentalEmail({
  type: 'in_review',
  email,
  renterName,
});

export const sendDeclinedEmail = async (email: string, renterName?: string) => sendRentalEmail({
  type: 'declined',
  email,
  renterName,
});

export const sendStartReminderEmail = async (email: string, renterName?: string) => sendRentalEmail({
  type: 'start_reminder',
  email,
  renterName,
});

export const sendReturnReminderEmail = async (email: string, renterName?: string) => sendRentalEmail({
  type: 'return_reminder',
  email,
  renterName,
});
