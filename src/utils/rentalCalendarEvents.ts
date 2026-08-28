import { dateOnlyFromRentalValue, toFullCalendarExclusiveEnd } from './fullCalendarDates.ts';

export interface RentalCalendarRange {
  start: string;
  endExclusive: string;
}

export interface RentalCalendarSource {
  id: string;
  status: string | null;
  rent_date_start: string | null;
  rent_date_end: string | null;
}

export interface PreparedRentalCalendarEntry<T extends RentalCalendarSource> {
  rental: T;
  start: string;
  endExclusive: string;
}

interface PrepareRentalCalendarOptions<T extends RentalCalendarSource> {
  selectedCamera: string;
  visibleRange: RentalCalendarRange | null;
  getItemIds: (rental: T) => string[];
}

export const prepareRentalCalendarEntries = <T extends RentalCalendarSource>(
  rentals: T[],
  { selectedCamera, visibleRange, getItemIds }: PrepareRentalCalendarOptions<T>,
): PreparedRentalCalendarEntry<T>[] => rentals.flatMap((rental) => {
  // Preserve the previous legacy-canceled exclusion, but all V2 statuses,
  // including declined, remain valid calendar bookings.
  if (rental.status?.toLowerCase() === 'canceled') return [];

  const start = dateOnlyFromRentalValue(rental.rent_date_start);
  const inclusiveEnd = dateOnlyFromRentalValue(rental.rent_date_end);
  if (!start || !inclusiveEnd || inclusiveEnd < start) return [];

  if (selectedCamera !== 'all' && !getItemIds(rental).includes(selectedCamera)) return [];

  const endExclusive = toFullCalendarExclusiveEnd(inclusiveEnd);
  if (visibleRange && !(start < visibleRange.endExclusive && endExclusive > visibleRange.start)) return [];

  return [{ rental, start, endExclusive }];
});

interface RentalCalendarEventPresentation {
  title: string;
  color: string;
  contrastColor: string;
  extendedProps?: Record<string, unknown>;
}

export const buildRentalCalendarEvent = <T extends RentalCalendarSource>(
  entry: PreparedRentalCalendarEntry<T>,
  presentation: RentalCalendarEventPresentation,
) => ({
  id: entry.rental.id,
  title: presentation.title,
  start: entry.start,
  end: entry.endExclusive,
  allDay: true as const,
  display: 'block' as const,
  color: presentation.color,
  contrastColor: presentation.contrastColor,
  extendedProps: {
    ...presentation.extendedProps,
    rentalId: entry.rental.id,
  },
});
