import { Resend } from 'npm:resend@4.4.0';
import { buildEmailWrapper } from './template.ts';

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Recap Buddies <noreply@recap-buddies.com>';

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable.');
}

const resend = new Resend(resendApiKey);

type RentalEmailType =
  | 'submitted'
  | 'confirmed'
  | 'declined'
  | 'start_reminder'
  | 'return_reminder';

interface SendRentalEmailPayload {
  type: RentalEmailType;
  to: string;
  renterName?: string;
  rentalCode?: string;
  startDate?: string;
  endDate?: string;
  remarks?: string;
}

const getTemplate = (payload: SendRentalEmailPayload) => {
  const name = payload.renterName?.trim() || 'Valued Renter';
  const code = payload.rentalCode ? `<strong>${payload.rentalCode}</strong>` : 'your rental request';

  const templates: Record<RentalEmailType, { subject: string; preheader: string; heading: string; bodyHtml: string }> = {
    submitted: {
      subject: 'Rental request submitted successfully',
      preheader: 'Your camera rental request has been received.',
      heading: 'Request Received',
      bodyHtml: `<p>Hi ${name},</p><p>Thanks for choosing Recap Buddies. We received ${code} and our team will review it shortly.</p><p>We will notify you as soon as there is a status update.</p>`,
    },
    confirmed: {
      subject: 'Your rental request is confirmed',
      preheader: 'Your booking has been confirmed.',
      heading: 'Booking Confirmed',
      bodyHtml: `<p>Hi ${name},</p><p>Your booking has been confirmed. Kindly wait for the official group chat link with your full rental details. This will be available at least 1–2 days before your rental starts. Thank you, buddy!</p>`,
    },
    declined: {
      subject: 'Update about your rental request',
      preheader: 'We were unable to approve your request at this time.',
      heading: 'Request Declined',
      bodyHtml: `<p>Hi ${name},</p><p>We appreciate your interest, but ${code} could not be approved at this time.</p><p>${payload.remarks ? `Reason: ${payload.remarks}` : 'Please contact our team if you would like to submit a new request.'}</p>`,
    },
    start_reminder: {
      subject: 'Reminder: your rental starts soon',
      preheader: 'Your rental period is about to start.',
      heading: 'Rental Start Reminder',
      bodyHtml: `<p>Hi ${name},</p><p>This is a reminder that ${code} is scheduled to start on <strong>${payload.startDate ?? 'your selected date'}</strong>.</p><p>Please prepare the required documents and coordinate with our team if needed.</p>`,
    },
    return_reminder: {
      subject: 'Reminder: upcoming rental return',
      preheader: 'Your rental return schedule is approaching.',
      heading: 'Rental Return Reminder',
      bodyHtml: `<p>Hi ${name},</p><p>This is a reminder that ${code} is due for return on <strong>${payload.endDate ?? 'your selected date'}</strong>.</p><p>Please return the equipment on time to avoid any penalties.</p>`,
    },
  };

  return templates[payload.type];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload = (await req.json()) as SendRentalEmailPayload;

    if (!payload?.to || !payload?.type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const template = getTemplate(payload);
    const html = buildEmailWrapper({
      title: template.subject,
      preheader: template.preheader,
      heading: template.heading,
      bodyHtml: template.bodyHtml,
    });

    const result = await resend.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: template.subject,
      html,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return new Response(JSON.stringify({ error: result.error.message ?? 'Failed to send email' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.data?.id ?? null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Unexpected send-rental-email error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
