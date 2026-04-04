import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface RbBranch {
  id: string;
  location_name: string;
  location_addr: string;
  created_at: string;
}
 
export interface RbItem {
  id: string;
  cam_name: string;
  serial_no: string;
  code_name: string;
  branch_id: string;
  avail_qty: number;
  total_qty: number;
  created_at: string;
}
 
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
 
export type RentalStatus = 'submitted' | 'in-review' | 'completed';
export type LocUsage = 'domestic' | 'international';
 
export interface RbRentalForm {
  id: string;
  cam_name_id_fk: string;
  rental_id_fk: string;
  loc_usage: LocUsage;
  proof_of_purpose_of_rental: string | null;
  discount_code: string | null;
  username: string | null;
  refund_info: string | null;
  rent_date_start: string;
  rent_date_end: string;
  hub_pick_up_addr: string | null;
  delivery_addr: string | null;
  hub_return_addr: string | null;
  return_addr: string | null;
  status: RentalStatus;
  created_at: string;
}