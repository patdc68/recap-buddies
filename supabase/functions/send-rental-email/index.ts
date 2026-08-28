import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildEmailWrapper } from "./template.ts";
import { buildAdminPdf } from "./pdf.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL_VALUE = Deno.env.get("FROM_EMAIL") ?? "noreply@recap-buddies.com";
const ADMIN_BOOKING_EMAIL = Deno.env.get("ADMIN_BOOKING_EMAIL") ?? "patriiiiicky@gmail.com";
const FROM_EMAIL = FROM_EMAIL_VALUE.includes("<") ? FROM_EMAIL_VALUE : `Recap Buddies <${FROM_EMAIL_VALUE}>`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

type RentalEmailType =
  | "submitted"
  | "in_review"
  | "confirmed"
  | "declined"
  | "start_reminder"
  | "return_reminder"
  | "admin_new_booking";

interface SendRentalEmailPayload {
  type: RentalEmailType;
  rentalId: string;
}

interface RentalRecord {
  id: string;
  renter_id_fk: string;
  branch_id_fk: string | null;
  cam_name_id_fk: string | null;
  renter_type: "new" | "returnee" | null;
  returnee_matched_existing: boolean | null;
  legacy_returnee: boolean | null;
  notification_email: string | null;
  returnee_selfie_img: string | null;
  created_at: string | null;
  status: string | null;
  rent_date_start: string | null;
  rent_date_end: string | null;
  pickup_time: string | null;
  return_time: string | null;
  loc_usage: string | null;
  hub_pick_up_addr: string | null;
  delivery_addr: string | null;
  hub_return_addr: string | null;
  return_addr: string | null;
  rent_price: number | null;
  remarks: string | null;
  username: string | null;
  proof_of_purpose_of_rental: string | null;
}

interface RenterRecord {
  id: string;
  renter_fname: string | null;
  renter_lname: string | null;
  mobile_no: number | string | null;
  emergency_contact_no: number | string | null;
  emergency_contact_person: string | null;
  emergency_contact_relationship: string | null;
  email: string | null;
  primary_id_front: string | null;
  primary_id_back: string | null;
  secondary_id_front: string | null;
  secondary_id_back: string | null;
  proof_of_billing: string | null;
  selfie_verification_img: string | null;
}

interface ItemRecord {
  id: string;
  code_name: string | null;
  branch_id_fk: string | null;
  device: { cam_name: string | null; device_img: string | null } | Array<{ cam_name: string | null; device_img: string | null }> | null;
}

interface BookingData {
  rental: RentalRecord;
  renter: RenterRecord;
  items: ItemRecord[];
  branchName: string | null;
  pickupBranchName: string | null;
  returnBranchName: string | null;
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatShortId = (id: string) => id.slice(0, 8);

const formatBookingSubjectDate = (createdAt: string | null) => {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) throw new Error("Booking submission date is unavailable.");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}-${get("day")}-${get("year")}`;
};

const deviceName = (item: ItemRecord) => {
  const device = Array.isArray(item.device) ? item.device[0] : item.device;
  const name = device?.cam_name ?? "Unknown camera";
  return item.code_name ? `${name} (${item.code_name})` : name;
};

const loadBookingData = async (rentalId: string): Promise<BookingData> => {
  const { data: rentalRaw, error: rentalError } = await supabase
    .from("RB_RENTAL_FORM")
    .select("*")
    .eq("id", rentalId)
    .single();
  if (rentalError || !rentalRaw) throw new Error("Rental not found.");
  const rental = rentalRaw as RentalRecord;

  const [{ data: renterRaw, error: renterError }, { data: rentalItemsRaw }] = await Promise.all([
    supabase.from("RB_RENTER").select("*").eq("id", rental.renter_id_fk).single(),
    supabase.from("RB_RENTAL_ITEMS").select("item_id_fk").eq("rental_form_id", rental.id),
  ]);
  if (renterError || !renterRaw) throw new Error("Renter not found.");

  const itemIds = [...new Set([
    ...(rentalItemsRaw ?? []).map((link) => link.item_id_fk),
    ...(rental.cam_name_id_fk ? [rental.cam_name_id_fk] : []),
  ])];
  const { data: itemsRaw } = itemIds.length
    ? await supabase.from("RB_ITEM").select("id,code_name,branch_id_fk,device:RB_DEVICES(cam_name,device_img)").in("id", itemIds)
    : { data: [] };
  const items = (itemsRaw ?? []) as ItemRecord[];

  const branchIds = [...new Set([
    rental.branch_id_fk,
    rental.hub_pick_up_addr,
    rental.hub_return_addr,
  ].filter((value): value is string => Boolean(value)))];
  const { data: branchesRaw } = branchIds.length
    ? await supabase.from("RB_BRANCHES").select("id,location_name").in("id", branchIds)
    : { data: [] };
  const branches = new Map((branchesRaw ?? []).map((branch) => [branch.id, branch.location_name as string | null]));

  return {
    rental,
    renter: renterRaw as RenterRecord,
    items,
    branchName: rental.branch_id_fk ? branches.get(rental.branch_id_fk) ?? null : null,
    pickupBranchName: rental.hub_pick_up_addr ? branches.get(rental.hub_pick_up_addr) ?? null : null,
    returnBranchName: rental.hub_return_addr ? branches.get(rental.hub_return_addr) ?? null : null,
  };
};

const authorize = async (req: Request) => {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearer) return false;
  if (bearer === SERVICE_ROLE_KEY) return true;

  const { data: { user }, error } = await supabase.auth.getUser(bearer);
  if (error || !user) return false;
  const { data: staff } = await supabase
    .from("RB_USER")
    .select("id,role")
    .eq("auth_user_id", user.id)
    .in("role", ["admin", "staff"])
    .maybeSingle();
  return Boolean(staff);
};

const getTemplate = (type: Exclude<RentalEmailType, "admin_new_booking">, data: BookingData) => {
  const name = escapeHtml(`${data.renter.renter_fname ?? ""} ${data.renter.renter_lname ?? ""}`.trim() || "Buddy");
  const rentalCode = `<strong>${escapeHtml(formatShortId(data.rental.id))}</strong>`;
  const remarks = data.rental.remarks ? `<p>Reason: ${escapeHtml(data.rental.remarks)}</p>` : "";

  const templates = {
    submitted: {
      subject: "Booking Request Received",
      preheader: "Your booking request has been received and will be reviewed.",
      heading: "Booking Request Received",
      bodyHtml: `<p>Hi ${name},</p><p>We received booking request ${rentalCode}. Our team will review your submitted details and requirements.</p><p>We'll notify you once there is an update.</p>`,
    },
    in_review: {
      subject: "Booking Under Review",
      preheader: "Your booking request and requirements are being reviewed.",
      heading: "Booking Under Review",
      bodyHtml: `<p>Hi ${name},</p><p>Your booking request ${rentalCode} and submitted requirements are currently being reviewed by our team.</p><p>We'll notify you once the review is complete.</p>`,
    },
    confirmed: {
      subject: "Your Booking Has Been Confirmed",
      preheader: "Your Recap Buddies booking has been approved and confirmed.",
      heading: "Booking Confirmed",
      bodyHtml: `<p>Hi ${name},</p><p>Your booking request ${rentalCode} has been approved and is now confirmed.</p><p>Please wait for the official group chat and complete rental details. These may be provided 1-2 days before your rental starts.</p>`,
    },
    declined: {
      subject: "Update About Your Booking Request",
      preheader: "We were unable to approve your request at this time.",
      heading: "Booking Request Declined",
      bodyHtml: `<p>Hi ${name},</p><p>We appreciate your interest, but booking request ${rentalCode} could not be approved at this time.</p>${remarks}<p>Please contact our team if you need assistance.</p>`,
    },
    start_reminder: {
      subject: "Your Rental Starts Tomorrow",
      preheader: "Your confirmed rental starts soon.",
      heading: "Your Rental Starts Soon",
      bodyHtml: `<p>Hi ${name},</p><p>Your rental ${rentalCode} starts on <strong>${escapeHtml(data.rental.rent_date_start)}</strong>.</p><p>Please keep your lines open for delivery or pickup coordination. Full details and reminders will be available in your assigned group chat.</p>`,
    },
    return_reminder: {
      subject: "Rental Return Reminder",
      preheader: "Your rental return schedule is approaching.",
      heading: "Rental Return Reminder",
      bodyHtml: `<p>Hi ${name},</p><p>Your rental ${rentalCode} is due for return on <strong>${escapeHtml(data.rental.rent_date_end)}</strong>.</p><p>Please coordinate with our team for the return process and follow the turnover guidelines.</p>`,
    },
  } satisfies Record<Exclude<RentalEmailType, "admin_new_booking">, { subject: string; preheader: string; heading: string; bodyHtml: string }>;
  return templates[type];
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const sendViaResend = async (message: { to: string; subject: string; html: string; attachment?: Uint8Array; rentalId: string; type: RentalEmailType }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Idempotency-Key": `recap-buddies-${message.rentalId}-${message.type}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.attachment ? {
        attachments: [{
          filename: `recap-buddies-booking-${formatShortId(message.rentalId)}.pdf`,
          content: toBase64(message.attachment),
        }],
      } : {}),
      tags: [
        { name: "rental_id", value: message.rentalId },
        { name: "email_type", value: message.type },
      ],
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Resend request failed", { status: response.status, type: message.type, rentalId: message.rentalId });
    throw new Error(typeof result?.message === "string" ? result.message : "Email provider request failed.");
  }
  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    if (!await authorize(req)) return json({ error: "Unauthorized." }, 401);
    const payload = await req.json() as Partial<SendRentalEmailPayload>;
    const allowed: RentalEmailType[] = ["submitted", "in_review", "confirmed", "declined", "start_reminder", "return_reminder", "admin_new_booking"];
    if (!payload.type || !allowed.includes(payload.type) || !payload.rentalId || !/^[0-9a-f-]{36}$/i.test(payload.rentalId)) {
      return json({ error: "Invalid email request." }, 400);
    }

    const data = await loadBookingData(payload.rentalId);
    if (payload.type === "admin_new_booking") {
      const renterType = data.rental.renter_type === "returnee" ? "Returnee" : "New";
      const devices = data.items.map(deviceName).join(", ") || "Not assigned";
      const recipientEmail = data.rental.notification_email?.trim() || data.renter.email?.trim() || "Not provided";
      const shortId = formatShortId(data.rental.id);
      const bodyHtml = `
        <p>A new booking request was submitted.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6">
          <tr><td><strong>Booking ID</strong></td><td>${escapeHtml(shortId)}</td></tr>
          <tr><td><strong>Renter</strong></td><td>${escapeHtml(`${data.renter.renter_fname ?? ""} ${data.renter.renter_lname ?? ""}`.trim())}</td></tr>
          <tr><td><strong>Renter type</strong></td><td>${renterType}</td></tr>
          <tr><td><strong>Contact</strong></td><td>${escapeHtml(data.renter.mobile_no)}</td></tr>
          <tr><td><strong>Email</strong></td><td>${escapeHtml(recipientEmail)}</td></tr>
          <tr><td><strong>Camera / unit</strong></td><td>${escapeHtml(devices)}</td></tr>
          <tr><td><strong>Rental dates</strong></td><td>${escapeHtml(data.rental.rent_date_start)} - ${escapeHtml(data.rental.rent_date_end)}</td></tr>
          <tr><td><strong>Branch</strong></td><td>${escapeHtml(data.branchName)}</td></tr>
          <tr><td><strong>Status</strong></td><td>${escapeHtml(data.rental.status)}</td></tr>
        </table>
        <p>The official agreement and complete application are attached as a PDF.</p>`;
      const html = buildEmailWrapper({ title: "New Booking Submitted", preheader: "A new Recap Buddies booking requires review.", heading: "New Booking Submitted", bodyHtml });
      const pdf = await buildAdminPdf(data);
      const subject = `New Booking (${shortId}) (${formatBookingSubjectDate(data.rental.created_at)})`;
      const result = await sendViaResend({ to: ADMIN_BOOKING_EMAIL, subject, html, attachment: pdf, rentalId: data.rental.id, type: payload.type });
      return json({ success: true, id: result.id ?? null });
    }

    const destination = data.rental.notification_email?.trim() || data.renter.email?.trim();
    if (!destination) {
      console.warn("Rental email skipped because no destination is available", { rentalId: data.rental.id, type: payload.type });
      return json({ success: false, code: "missing_destination", error: "No usable renter email address is available for this booking." }, 422);
    }

    const template = getTemplate(payload.type, data);
    const html = buildEmailWrapper({ title: template.subject, preheader: template.preheader, heading: template.heading, bodyHtml: template.bodyHtml });
    const result = await sendViaResend({ to: destination, subject: template.subject, html, rentalId: data.rental.id, type: payload.type });
    return json({ success: true, id: result.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("send-rental-email failed", { error: message });
    if (message.includes("authoritative rental agreement")) {
      return json({ code: "agreement_unavailable", error: "The authoritative rental agreement could not be loaded; no Admin PDF or email was generated." }, 502);
    }
    return json({ error: "The email could not be sent." }, 500);
  }
});
