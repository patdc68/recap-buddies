import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const manilaDate = (daysFromToday: number) => {
  const date = new Date(Date.now() + daysFromToday * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const sendReminder = async (rentalId: string, type: "start_reminder" | "return_reminder") => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-rental-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ type, rentalId }),
  });
  if (!response.ok) throw new Error(`${type} failed with ${response.status}`);
};

Deno.serve(async (req) => {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token !== SERVICE_ROLE_KEY) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const tomorrow = manilaDate(1);
  const dayAfterTomorrow = manilaDate(2);
  let startSent = 0;
  let returnSent = 0;
  let failed = 0;

  try {
    const [{ data: starts, error: startError }, { data: returns, error: returnError }] = await Promise.all([
      supabase
        .from("RB_RENTAL_FORM")
        .select("id")
        .gte("rent_date_start", tomorrow)
        .lt("rent_date_start", dayAfterTomorrow)
        .in("status", ["confirmed"])
        .or("start_reminder_sent.is.false,start_reminder_sent.is.null"),
      supabase
        .from("RB_RENTAL_FORM")
        .select("id")
        .gte("rent_date_end", tomorrow)
        .lt("rent_date_end", dayAfterTomorrow)
        .in("status", ["confirmed", "renting"])
        .or("return_reminder_sent.is.false,return_reminder_sent.is.null"),
    ]);
    if (startError || returnError) throw startError ?? returnError;

    for (const rental of starts ?? []) {
      try {
        await sendReminder(rental.id, "start_reminder");
        await supabase.from("RB_RENTAL_FORM").update({ start_reminder_sent: true }).eq("id", rental.id);
        startSent += 1;
      } catch (error) {
        console.error("Start reminder failed", { rentalId: rental.id, reason: error instanceof Error ? error.message : "unknown" });
        failed += 1;
      }
    }

    for (const rental of returns ?? []) {
      try {
        await sendReminder(rental.id, "return_reminder");
        await supabase.from("RB_RENTAL_FORM").update({ return_reminder_sent: true }).eq("id", rental.id);
        returnSent += 1;
      } catch (error) {
        console.error("Return reminder failed", { rentalId: rental.id, reason: error instanceof Error ? error.message : "unknown" });
        failed += 1;
      }
    }

    return Response.json({ success: true, date: tomorrow, startSent, returnSent, failed });
  } catch (error) {
    console.error("Reminder cron failed", { reason: error instanceof Error ? error.message : "unknown" });
    return Response.json({ error: "Reminder processing failed." }, { status: 500 });
  }
});
