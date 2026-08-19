import { supabase } from '../service/supabaseClient';

export type PublicRenterType = 'new' | 'returnee';

export interface PublicBookingSession {
  flowToken: string;
  renterType: PublicRenterType;
  createdAt: number;
}

export interface PublicCatalogDevice {
  id: string;
  cam_name: string | null;
  device_img: string | null;
  availableCount: number;
  rentPrice: number | null;
}

export interface PublicCatalogBranch {
  id: string;
  location_name: string | null;
  location_addr: string | null;
}

const SESSION_KEY = 'recap-buddies-v2-booking-session';

const readFunctionError = async (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      const body = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (body?.error) return body.error;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

const saveSession = (flowToken: string, renterType: PublicRenterType) => {
  const session: PublicBookingSession = { flowToken, renterType, createdAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getPublicBookingSession = (): PublicBookingSession | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<PublicBookingSession> | null;
    if (!parsed?.flowToken || (parsed.renterType !== 'new' && parsed.renterType !== 'returnee') || typeof parsed.createdAt !== 'number') return null;
    if (Date.now() - parsed.createdAt > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed as PublicBookingSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearPublicBookingSession = () => localStorage.removeItem(SESSION_KEY);

export const createNewRenterFlow = async (formData: FormData) => {
  formData.set('action', 'new_renter');
  const { data, error } = await supabase.functions.invoke('public-booking', { body: formData });
  if (error) throw new Error(await readFunctionError(error, 'Unable to create your renter record.'));
  if (!data?.flowToken) throw new Error(data?.error ?? 'Unable to create your booking session.');
  return saveSession(data.flowToken, 'new');
};

export const createReturneeFlow = async (formData: FormData) => {
  formData.set('action', 'returnee');
  const { data, error } = await supabase.functions.invoke('public-booking', { body: formData });
  if (error) throw new Error(await readFunctionError(error, 'Unable to start the returning-renter flow.'));
  if (!data?.flowToken) throw new Error(data?.error ?? 'Unable to create your booking session.');
  return saveSession(data.flowToken, 'returnee');
};

export const loadPublicCatalog = async () => {
  const { data, error } = await supabase.functions.invoke('public-booking', { body: { action: 'catalog' } });
  if (error) throw new Error(await readFunctionError(error, 'Unable to load available cameras.'));
  if (data?.error) throw new Error(data.error);
  return {
    devices: (data?.devices ?? []) as PublicCatalogDevice[],
    branches: (data?.branches ?? []) as PublicCatalogBranch[],
  };
};

export const submitPublicBooking = async (formData: FormData) => {
  const session = getPublicBookingSession();
  if (!session) throw new Error('Your booking session has expired. Please start again.');
  formData.set('action', 'submit_booking');
  formData.set('flowToken', session.flowToken);
  const { data, error } = await supabase.functions.invoke('public-booking', { body: formData });
  if (error) throw new Error(await readFunctionError(error, 'Your booking could not be submitted.'));
  if (!data?.success) throw new Error(data?.error ?? 'Your booking could not be submitted.');
  clearPublicBookingSession();
  return data as { success: true; rentalId: string; notificationWarning?: boolean };
};
