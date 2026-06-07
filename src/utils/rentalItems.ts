import type { RbBranch, RbDevice, RbItem, RbRentalForm } from '../service/supabaseClient';

export interface EnrichedItem extends RbItem {
  device?: RbDevice;
  branch?: RbBranch;
}

export interface RentalItemLink {
  id?: string;
  rental_form_id: string;
  item_id_fk: string;
  item?: EnrichedItem;
}

export interface RentalWithItems extends RbRentalForm {
  item?: EnrichedItem;
  rentalItems?: RentalItemLink[];
  items?: EnrichedItem[];
}

export const getRentalItems = <T extends RentalWithItems>(rental: T): EnrichedItem[] => {
  const linked = rental.items?.length
    ? rental.items
    : rental.rentalItems?.map((link) => link.item).filter((item): item is EnrichedItem => !!item) ?? [];
  if (linked.length > 0) return linked;
  return rental.item ? [rental.item] : [];
};

export const getRentalItemIds = <T extends RentalWithItems>(rental: T): string[] => {
  const ids = getRentalItems(rental).map((item) => item.id).filter(Boolean);
  if (ids.length > 0) return [...new Set(ids)];
  return rental.cam_name_id_fk ? [rental.cam_name_id_fk] : [];
};

export const getPrimaryRentalItem = <T extends RentalWithItems>(rental: T) => getRentalItems(rental)[0];

export const formatItemName = (item?: EnrichedItem | null) =>
  item?.device?.cam_name ?? item?.code_name ?? 'Unknown device';

export const formatItemCode = (item?: EnrichedItem | null) => item?.code_name ?? '—';

export const formatCompactRentalItems = <T extends RentalWithItems>(rental: T) => {
  const items = getRentalItems(rental);
  if (items.length === 0) return '—';
  const firstName = formatItemName(items[0]);
  return items.length > 1 ? `${firstName} +${items.length - 1} more` : firstName;
};

export const formatCompactRentalItemCodes = <T extends RentalWithItems>(rental: T) => {
  const items = getRentalItems(rental);
  if (items.length === 0) return '—';
  const firstCode = formatItemCode(items[0]);
  return items.length > 1 ? `${firstCode} +${items.length - 1} more` : firstCode;
};

export const formatRentalItemsTooltip = <T extends RentalWithItems>(rental: T) => {
  const items = getRentalItems(rental);
  return items.map((item) => `${formatItemName(item)}${item.code_name ? ` (${item.code_name})` : ''}`).join('\n') || '—';
};

export const calculateRentalItemsTotal = (items: EnrichedItem[]) =>
  items.reduce((total, item) => total + (Number(item.rent_price ?? 0) || 0), 0);
