import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IP_HASH_PEPPER = Deno.env.get("PUBLIC_FLOW_HASH_PEPPER") ?? SUPABASE_URL;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const FLOW_BUCKET = "verification-images";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const configuredOrigins = (Deno.env.get("PUBLIC_APP_ORIGINS") ??
  "https://recap-buddies.com,https://www.recap-buddies.com,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const encoder = new TextEncoder();

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && configuredOrigins.includes(origin) ? origin : configuredOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (origin: string | null, body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders(origin) });

const safeText = (value: FormDataEntryValue | null, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createFlowToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

const normalizePhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("63")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? digits : null;
};

const extensionFor = (file: File) => {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
};

const requireFile = (form: FormData, key: string, allowPdf = false) => {
  const value = form.get(key);
  if (!(value instanceof File) || value.size === 0) throw new Error(`Missing required document: ${key}`);
  const allowedImage = value.type === "image/jpeg" || value.type === "image/png";
  const allowed = allowedImage || (allowPdf && value.type === "application/pdf");
  if (!allowed) throw new Error(`Unsupported document type: ${key}`);
  if (value.size > MAX_FILE_BYTES) throw new Error(`Document is too large: ${key}`);
  return value;
};

const validateFileSignature = async (file: File, allowPdf = false) => {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
    && header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a;
  const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  if (!isJpeg && !isPng && !(allowPdf && isPdf)) throw new Error("Unsupported document content.");
};

const uploadFile = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(FLOW_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error("A verification document could not be stored.");
  return path;
};

const requestIpHash = async (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || "unknown";
  return sha256(`${IP_HASH_PEPPER}:${ip}`);
};

const enforceRateLimit = async (ipHash: string) => {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("RB_PUBLIC_BOOKING_FLOW")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw new Error("Unable to start the booking flow.");
  if ((count ?? 0) >= 8) throw new Error("Too many attempts. Please try again later.");
};

const handleNewRenter = async (req: Request, origin: string | null, form: FormData) => {
  const renterFname = safeText(form.get("renter_fname"), 80);
  const renterLname = safeText(form.get("renter_lname"), 80);
  const email = safeText(form.get("email"), 254).toLowerCase();
  const mobile = normalizePhone(safeText(form.get("mobile_no"), 40));
  const emergency = normalizePhone(safeText(form.get("emergency_contact_no"), 40));
  const emergencyPerson = safeText(form.get("emergency_contact_person"), 160);
  const emergencyRelationship = safeText(form.get("emergency_contact_relationship"), 80);

  if (!renterFname || !renterLname || !mobile || !emergency || !emergencyPerson || !emergencyRelationship) {
    return json(origin, { error: "Please complete all required renter information." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(origin, { error: "Please enter a valid email address." }, 400);
  }

  const files = {
    primary_id_front: requireFile(form, "primary_id_front"),
    primary_id_back: requireFile(form, "primary_id_back"),
    secondary_id_front: requireFile(form, "secondary_id_front"),
    secondary_id_back: requireFile(form, "secondary_id_back"),
    proof_of_billing: requireFile(form, "proof_of_billing", true),
    selfie_verification_img: requireFile(form, "selfie_verification_img"),
  };
  await Promise.all(Object.entries(files).map(([key, file]) => (
    validateFileSignature(file, key === "proof_of_billing")
  )));

  const ipHash = await requestIpHash(req);
  await enforceRateLimit(ipHash);
  const token = createFlowToken();
  const tokenHash = await sha256(token);
  const flowFolder = crypto.randomUUID();
  const uploaded: string[] = [];
  let renterId: string | null = null;

  try {
    const stored: Record<string, string> = {};
    for (const [key, file] of Object.entries(files)) {
      const path = `flows/${flowFolder}/identity/${key}.${extensionFor(file)}`;
      stored[key] = await uploadFile(path, file);
      uploaded.push(path);
    }

    const { data: renter, error: renterError } = await supabase
      .from("RB_RENTER")
      .insert({
        renter_fname: renterFname,
        renter_lname: renterLname,
        mobile_no: mobile,
        emergency_contact_no: emergency,
        emergency_contact_person: emergencyPerson,
        emergency_contact_relationship: emergencyRelationship,
        email,
        auth_user_id: null,
        primary_id_front: stored.primary_id_front,
        primary_id_back: stored.primary_id_back,
        secondary_id_front: stored.secondary_id_front,
        secondary_id_back: stored.secondary_id_back,
        proof_of_billing: stored.proof_of_billing,
        selfie_verification_id: null,
        selfie_verification_img: stored.selfie_verification_img,
      })
      .select("id")
      .single();
    if (renterError || !renter) throw new Error("Your renter information could not be saved.");
    renterId = renter.id;

    const { error: flowError } = await supabase.from("RB_PUBLIC_BOOKING_FLOW").insert({
      token_hash: tokenHash,
      renter_id: renter.id,
      renter_type: "new",
      returnee_matched_existing: false,
      legacy_returnee: false,
      ip_hash: ipHash,
    });
    if (flowError) throw new Error("Your booking session could not be created.");

    return json(origin, { flowToken: token, renterType: "new", expiresInSeconds: 7200 }, 201);
  } catch (error) {
    if (renterId) await supabase.from("RB_RENTER").delete().eq("id", renterId);
    if (uploaded.length) await supabase.storage.from(FLOW_BUCKET).remove(uploaded);
    throw error;
  }
};

const handleReturnee = async (req: Request, origin: string | null, form: FormData) => {
  const fullName = safeText(form.get("fullName"), 160);
  const contactNumber = safeText(form.get("contactNumber"), 40);
  const email = safeText(form.get("email"), 254).toLowerCase();
  const selfie = requireFile(form, "selfie_verification_img");
  if (fullName.split(/\s+/).length < 2 || !normalizePhone(contactNumber)) {
    return json(origin, { error: "Please enter your full name and a valid Philippine contact number." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(origin, { error: "Please enter a valid email address." }, 400);
  }
  await validateFileSignature(selfie);

  const ipHash = await requestIpHash(req);
  await enforceRateLimit(ipHash);
  const token = createFlowToken();
  const tokenHash = await sha256(token);
  const flowFolder = crypto.randomUUID();
  const selfiePath = `returnees/${flowFolder}/selfie.${extensionFor(selfie)}`;
  await uploadFile(selfiePath, selfie);

  const { error } = await supabase.rpc("rb_create_returnee_flow", {
    p_full_name: fullName,
    p_phone: contactNumber,
    p_email: email,
    p_selfie_path: selfiePath,
    p_token_hash: tokenHash,
    p_ip_hash: ipHash,
  });
  if (error) {
    await supabase.storage.from(FLOW_BUCKET).remove([selfiePath]);
    const message = error.message.includes("Too many attempts")
      ? "Too many attempts. Please try again later."
      : error.message.includes("email")
        ? "Please enter a valid email address."
        : error.message.includes("complete name") || error.message.includes("Invalid returnee")
          ? "Please enter your complete name and a valid contact number."
          : "We could not start your booking session. Please try again.";
    return json(origin, { error: message }, error.message.includes("Too many") ? 429 : 400);
  }

  // Deliberately return no match result or renter data: both matched and legacy
  // returnees receive the same response to prevent account enumeration.
  return json(origin, {
    flowToken: token,
    renterType: "returnee",
    expiresInSeconds: 7200,
    message: "Your returning-renter booking session is ready.",
  }, 201);
};

const handleCatalog = async (origin: string | null) => {
  const [{ data: devices, error: devicesError }, { data: branches, error: branchesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("RB_DEVICES").select("id,cam_name,device_img").order("cam_name"),
    supabase.from("RB_BRANCHES").select("id,location_name,location_addr").order("location_name"),
    supabase.from("RB_ITEM").select("id,device_id_fk,branch_id_fk,rent_price,status,current_condition"),
  ]);
  if (devicesError || branchesError || itemsError) throw new Error("The rental catalog is temporarily unavailable.");

  const available = new Map<string, { count: number; minPrice: number | null }>();
  for (const item of items ?? []) {
    if (item.status !== "Available" || (item.current_condition && item.current_condition !== "working") || !item.device_id_fk) continue;
    const current = available.get(item.device_id_fk) ?? { count: 0, minPrice: null };
    const price = typeof item.rent_price === "number" ? item.rent_price : null;
    available.set(item.device_id_fk, {
      count: current.count + 1,
      minPrice: price == null ? current.minPrice : current.minPrice == null ? price : Math.min(current.minPrice, price),
    });
  }

  const publicDevices = await Promise.all((devices ?? []).map(async (device) => {
    const marker = "/verification-images/";
    const markerIndex = device.device_img?.indexOf(marker) ?? -1;
    const imagePath = markerIndex >= 0
      ? decodeURIComponent(device.device_img.slice(markerIndex + marker.length).split("?")[0])
      : device.device_img && !device.device_img.startsWith("http")
        ? device.device_img.replace(/^verification-images\//, "")
        : null;
    const { data: signedImage } = imagePath
      ? await supabase.storage.from(FLOW_BUCKET).createSignedUrl(imagePath, 60 * 60)
      : { data: null };
    return {
      id: device.id,
      cam_name: device.cam_name,
      device_img: signedImage?.signedUrl ?? (imagePath ? null : device.device_img),
      availableCount: available.get(device.id)?.count ?? 0,
      rentPrice: available.get(device.id)?.minPrice ?? null,
    };
  }));

  return json(origin, {
    devices: publicDevices,
    branches: branches ?? [],
  });
};

const notifyBooking = async (rentalId: string, type: "submitted" | "admin_new_booking") => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-rental-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ type, rentalId }),
  });
  if (!response.ok) throw new Error(`${type} notification failed with ${response.status}`);
};

const handleSubmitBooking = async (origin: string | null, form: FormData) => {
  const token = safeText(form.get("flowToken"), 512);
  const purpose = requireFile(form, "proof_of_purpose", true);
  await validateFileSignature(purpose, true);
  let deviceIds: string[] = [];
  try {
    const parsed = JSON.parse(safeText(form.get("deviceIds"), 2000));
    if (Array.isArray(parsed)) deviceIds = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return json(origin, { error: "Please select your rental devices again." }, 400);
  }
  if (!token || deviceIds.length < 1 || deviceIds.length > 5) {
    return json(origin, { error: "This booking session or device selection is invalid." }, 400);
  }

  const tokenHash = await sha256(token);
  const { data: flow, error: flowError } = await supabase
    .from("RB_PUBLIC_BOOKING_FLOW")
    .select("id,expires_at,consumed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (flowError || !flow || flow.consumed_at || new Date(flow.expires_at).getTime() <= Date.now()) {
    return json(origin, { error: "This booking session has expired. Please start again." }, 401);
  }

  const purposePath = `flows/${flow.id}/booking/proof_of_purpose.${extensionFor(purpose)}`;
  await uploadFile(purposePath, purpose);

  const nullable = (key: string, max: number) => safeText(form.get(key), max) || null;
  const { data, error } = await supabase.rpc("rb_submit_public_booking", {
    p_token_hash: tokenHash,
    p_device_ids: deviceIds,
    p_loc_usage: safeText(form.get("loc_usage"), 40),
    p_proof_path: purposePath,
    p_discount_code: nullable("discount_code", 80),
    p_username: safeText(form.get("username"), 160),
    p_refund_info: safeText(form.get("refund_info"), 1000),
    p_start_date: safeText(form.get("rent_date_start"), 10),
    p_end_date: safeText(form.get("rent_date_end"), 10),
    p_pickup_time: nullable("pickup_time", 16),
    p_return_time: nullable("return_time", 16),
    p_hub_pick_up: nullable("hub_pick_up_addr", 64),
    p_delivery_addr: nullable("delivery_addr", 500),
    p_hub_return: nullable("hub_return_addr", 64),
    p_return_addr: nullable("return_addr", 500),
  });

  if (error || !data?.[0]?.rental_id) {
    await supabase.storage.from(FLOW_BUCKET).remove([purposePath]);
    const message = error?.message.includes("no longer available")
      ? "A selected camera is no longer available. Please update your selection."
      : error?.message.includes("invalid or expired")
        ? "This booking session has expired. Please start again."
        : error?.message.includes("Invalid") || error?.message.includes("Required") || error?.message.includes("Choose exactly")
          ? error.message
          : "Your booking could not be submitted. Please review the form and try again.";
    return json(origin, { error: message }, 400);
  }

  const rentalId = data[0].rental_id as string;
  const notificationWarnings: string[] = [];
  for (const type of ["submitted", "admin_new_booking"] as const) {
    try {
      await notifyBooking(rentalId, type);
    } catch (error) {
      console.error("Booking notification failure", { rentalId, type, error: error instanceof Error ? error.message : "unknown" });
      notificationWarnings.push(type);
    }
  }

  return json(origin, {
    success: true,
    rentalId,
    notificationWarning: notificationWarnings.length > 0,
  }, 201);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { error: "Method not allowed." }, 405);
  if (origin && !configuredOrigins.includes(origin)) return json(origin, { error: "Origin not allowed." }, 403);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const action = safeText(form.get("action"), 40);
      if (action === "new_renter") return await handleNewRenter(req, origin, form);
      if (action === "returnee") return await handleReturnee(req, origin, form);
      if (action === "submit_booking") return await handleSubmitBooking(origin, form);
      return json(origin, { error: "Invalid action." }, 400);
    }

    const payload = await req.json() as Record<string, unknown>;
    if (payload.action === "catalog") return await handleCatalog(origin);
    return json(origin, { error: "Invalid action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected request failure.";
    console.error("public-booking request failed", { message });
    const safeMessage = message.startsWith("Missing required") || message.startsWith("Unsupported") || message.startsWith("Document is too large") || message.startsWith("Too many")
      ? message
      : "We could not process your request. Please try again.";
    return json(origin, { error: safeMessage }, message.startsWith("Too many") ? 429 : 400);
  }
});
