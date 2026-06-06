import { supabase } from '../service/supabaseClient';
import type { RbRentalForm, RbRenter } from '../service/supabaseClient';
import { sendRentalEmail } from './emailService';

const REMINDER_ALLOWED_STATUSES = ['in-review', 'approved'];

type ReminderRental = Pick<
  RbRentalForm,
  'id' | 'rent_date_start' | 'rent_date_end' | 'start_reminder_sent' | 'return_reminder_sent'
> & { status?: string | null };

type ReminderRenter = Pick<RbRenter, 'email' | 'renter_fname'> | null | undefined;

const getTomorrowManilaDate = () => {
  const now = new Date();

  const manilaDate = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );

  manilaDate.setDate(manilaDate.getDate() + 1);

  return (
    manilaDate.getFullYear() +
    '-' +
    String(manilaDate.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(manilaDate.getDate()).padStart(2, '0')
  );
};

export const sendDueReminderEmailsIfNeeded = async ({
  rental,
  renter,
}: {
  rental?: ReminderRental | null;
  renter?: ReminderRenter;
}) => {
  if (!rental || !renter?.email) return;

  const normalizedStatus = String(rental.status ?? '').toLowerCase();

  if (!REMINDER_ALLOWED_STATUSES.includes(normalizedStatus)) return;

  const tomorrow = getTomorrowManilaDate();

  if (
    rental.rent_date_start === tomorrow &&
    !rental.start_reminder_sent
  ) {
    await sendRentalEmail({
      type: 'start_reminder',
      email: renter.email,
      renterName: renter.renter_fname,
      rentalCode: rental.id,
      startDate: rental.rent_date_start,
    });

    await supabase
      .from('RB_RENTAL_FORM')
      .update({ start_reminder_sent: true })
      .eq('id', rental.id);
  }

  if (
    rental.rent_date_end === tomorrow &&
    !rental.return_reminder_sent
  ) {
    await sendRentalEmail({
      type: 'return_reminder',
      email: renter.email,
      renterName: renter.renter_fname,
      rentalCode: rental.id,
      endDate: rental.rent_date_end,
    });

    await supabase
      .from('RB_RENTAL_FORM')
      .update({ return_reminder_sent: true })
      .eq('id', rental.id);
  }
};
