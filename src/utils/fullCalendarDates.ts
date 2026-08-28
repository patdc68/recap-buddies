const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number) => {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] ?? 0;
};

const padDatePart = (value: number) => String(value).padStart(2, '0');

export const isDateOnly = (value: string | null | undefined): value is string => {
  const match = value?.match(DATE_ONLY_PATTERN);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

/**
 * Supabase returns RB_RENTAL_FORM's timestamp columns as timestamp strings,
 * while the application treats their leading date as a calendar business
 * date. Preserve that date verbatim instead of parsing it through Date/UTC.
 */
export const dateOnlyFromRentalValue = (value: string | null | undefined) => {
  if (!value || (value.length !== 10 && value[10] !== 'T' && value[10] !== ' ')) return null;
  const date = value.slice(0, 10);
  return isDateOnly(date) ? date : null;
};

/**
 * Converts Recap Buddies' inclusive business end date to FullCalendar's
 * exclusive all-day end date without constructing a Date or converting to UTC.
 */
export const toFullCalendarExclusiveEnd = (rentDateEnd: string) => {
  if (!isDateOnly(rentDateEnd)) throw new Error(`Invalid rental end date: ${rentDateEnd}`);

  const [yearValue, monthValue, dayValue] = rentDateEnd.split('-').map(Number);
  let year = yearValue;
  let month = monthValue;
  let day = dayValue + 1;

  if (day > daysInMonth(year, month)) {
    day = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
};

export const dateOnlyFromCalendarValue = (value: string) => value.slice(0, 10);

interface CalendarRangeInput {
  start?: unknown;
  end?: unknown;
}

/**
 * FullCalendar's overflow links are date-based. When every overflowing item on
 * a date is only continuing from an earlier start, the original start-date
 * popover is the useful anchor and the repeated continuation link is noise.
 */
export const getContinuationOnlyOverflowDates = (
  events: CalendarRangeInput[],
  visibleEventLimit = 4,
) => {
  const activeCounts = new Map<string, number>();
  const startCounts = new Map<string, number>();

  for (const event of events) {
    if (typeof event.start !== 'string' || typeof event.end !== 'string') continue;
    const start = dateOnlyFromCalendarValue(event.start);
    const endExclusive = dateOnlyFromCalendarValue(event.end);
    if (!isDateOnly(start) || !isDateOnly(endExclusive) || start >= endExclusive) continue;

    startCounts.set(start, (startCounts.get(start) ?? 0) + 1);
    for (let date = start; date < endExclusive; date = toFullCalendarExclusiveEnd(date)) {
      activeCounts.set(date, (activeCounts.get(date) ?? 0) + 1);
    }
  }

  const continuationOnlyDates = new Set<string>();
  for (const [date, activeCount] of activeCounts) {
    if (activeCount > visibleEventLimit && !startCounts.has(date)) continuationOnlyDates.add(date);
  }
  return continuationOnlyDates;
};
