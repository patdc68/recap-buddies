import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase service configuration.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const manilaToday = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

Deno.serve(async () => {
  const today = manilaToday();
  const { data, error } = await supabase
    .from('RB_RENTAL_FORM')
    .update({ status: 'ongoing' })
    .in('status', ['confirmed', 'extended'])
    .lte('rent_date_start', today)
    .gte('rent_date_end', today)
    .select('id,status,rent_date_start,rent_date_end');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ today, updated: data?.length ?? 0, rentals: data ?? [] }), { headers: { 'Content-Type': 'application/json' } });
});
