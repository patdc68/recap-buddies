import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Auth / Staff ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'staff';

export interface RbUser {
  id: string;
  role: UserRole;
  branch_id: string | null;
  user_fname: string;
  user_lname: string;
  auth_user_id: string;
  created_at: string;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface RbBranch {
  id: string;
  location_name: string;
  location_addr: string;
  created_at: string;
}

// ─── Devices (camera type catalogue — admin-managed) ─────────────────────────

export interface RbDevice {
  id: string;
  cam_name: string;
  device_img: string | null;
  created_at: string;
}

// ─── Items (physical units) ───────────────────────────────────────────────────

export type ItemStatus =
  | 'Available'
  | 'In Review'
  | 'For Delivery'
  | 'Delivered'
  | 'Renting'
  | 'For Return'
  | 'For Refund'
  | 'For Penalty';

export type ItemCondition = 'working' | 'damaged';

export interface RbItem {
  id: string;
  device_id_fk: string;
  code_name: string;
  serial_no: string;
  branch_id: string | null;
  status: ItemStatus;
  gps_installed: boolean;
  current_condition: ItemCondition;
  rent_price: number | null;
  created_by: string;
  created_at: string;
  // joined via Supabase FK:
  device?: RbDevice;
}

// ─── Renter ───────────────────────────────────────────────────────────────────

export interface RbRenter {
  id: string;
  renter_fname: string;
  renter_lname: string;
  mobile_no: string;
  emergency_contact_no: string;
  email: string;
  auth_user_id: string;
  primary_id_front: string | null;
  primary_id_back: string | null;
  secondary_id_front: string | null;
  secondary_id_back: string | null;
  proof_of_billing: string | null;
  selfie_verification_id: string | null;
  selfie_verification_img: string | null;
  created_at: string;
}

export interface RbSelfieVerificationInst {
  id: string;
  instruction_name: string;
  instruction_desc: string;
}

// ─── Rental Form ──────────────────────────────────────────────────────────────

export type RentalStatus = 'submitted' | 'in-review' | 'renting' | 'completed' | 'canceled' | 'declined';
export type LocUsage     = 'domestic' | 'international';

export interface RbRentalForm {
  id: string;
  cam_name_id_fk: string;            // FK → RB_ITEM.id
  renter_id_fk: string;              // FK → RB_RENTER.id
  branch_id_fk: string | null;       // FK → RB_BRANCHES.id (auto-set from item's branch)
  loc_usage: LocUsage;
  proof_of_purpose_of_rental: string | null;
  discount_code: string | null;
  username: string | null;
  refund_info: string | null;
  rent_date_start: string;
  rent_date_end: string;
  hub_pick_up_addr: string | null;   // FK → RB_BRANCHES.id
  delivery_addr: string | null;
  hub_return_addr: string | null;    // FK → RB_BRANCHES.id
  return_addr: string | null;
  status: RentalStatus;
  created_at: string;
}