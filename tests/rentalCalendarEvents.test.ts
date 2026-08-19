import assert from 'node:assert/strict';
import test from 'node:test';
import { dateOnlyFromRentalValue, getContinuationOnlyOverflowDates } from '../src/utils/fullCalendarDates.ts';
import { buildRentalCalendarEvent, prepareRentalCalendarEntries } from '../src/utils/rentalCalendarEvents.ts';

interface RentalFixture {
  id: string;
  status: string;
  rent_date_start: string;
  rent_date_end: string;
  itemIds: string[];
}

const rental = (
  id: string,
  start: string,
  end: string,
  status = 'submitted',
  itemIds = ['item-a'],
): RentalFixture => ({ id, status, rent_date_start: start, rent_date_end: end, itemIds });

const prepare = (
  rentals: RentalFixture[],
  selectedCamera = 'all',
  visibleRange: { start: string; endExclusive: string } | null = { start: '2026-08-01', endExclusive: '2026-09-01' },
) => prepareRentalCalendarEntries(rentals, {
  selectedCamera,
  visibleRange,
  getItemIds: (entry) => entry.itemIds,
});

test('normalizes Supabase timestamp values as date-only business dates without a timezone shift', () => {
  assert.equal(dateOnlyFromRentalValue('2026-08-18T00:00:00'), '2026-08-18');
  assert.equal(dateOnlyFromRentalValue('2026-08-18 00:00:00'), '2026-08-18');
  assert.equal(dateOnlyFromRentalValue('2026-08-18'), '2026-08-18');
  assert.equal(dateOnlyFromRentalValue('2026-02-30T00:00:00'), null);
});

test('maps single-day and inclusive multi-day rentals to valid exclusive FullCalendar ends', () => {
  const entries = prepare([
    rental('single', '2026-08-18T00:00:00', '2026-08-18T00:00:00'),
    rental('multi', '2026-08-18T00:00:00', '2026-08-20T00:00:00'),
    rental('week-boundary', '2026-08-22T00:00:00', '2026-08-24T00:00:00'),
  ]);
  assert.deepEqual(entries.map(({ rental: entry, start, endExclusive }) => [entry.id, start, endExclusive]), [
    ['single', '2026-08-18', '2026-08-19'],
    ['multi', '2026-08-18', '2026-08-21'],
    ['week-boundary', '2026-08-22', '2026-08-25'],
  ]);
});

test('includes rentals that overlap the visible month at either boundary', () => {
  const entries = prepare([
    rental('starts-july', '2026-07-31T00:00:00', '2026-08-02T00:00:00'),
    rental('ends-september', '2026-08-30T00:00:00', '2026-09-03T00:00:00'),
    rental('outside', '2026-09-01T00:00:00', '2026-09-02T00:00:00'),
  ]);
  assert.deepEqual(entries.map((entry) => entry.rental.id), ['starts-july', 'ends-september']);
});

test('keeps every V2 status visible, including declined', () => {
  const statuses = ['submitted', 'in-review', 'confirmed', 'renting', 'completed', 'declined'];
  const entries = prepare(statuses.map((status) => rental(status, '2026-08-18', '2026-08-18', status)));
  assert.deepEqual(entries.map((entry) => entry.rental.status), statuses);
});

test('preserves the legacy canceled exclusion', () => {
  assert.equal(prepare([rental('canceled', '2026-08-18', '2026-08-18', 'canceled')]).length, 0);
});

test('All cameras bypasses item filtering while a specific camera matches physical item IDs', () => {
  const rentals = [
    rental('camera-a', '2026-08-18', '2026-08-18', 'submitted', ['item-a']),
    rental('camera-b', '2026-08-18', '2026-08-18', 'submitted', ['item-b']),
  ];
  assert.deepEqual(prepare(rentals, 'all').map((entry) => entry.rental.id), ['camera-a', 'camera-b']);
  assert.deepEqual(prepare(rentals, 'item-b').map((entry) => entry.rental.id), ['camera-b']);
});

test('previous/next navigation and Month -> Week -> Month range changes do not lose authoritative rentals', () => {
  const rentals = [
    rental('aug-18', '2026-08-18T00:00:00', '2026-08-20T00:00:00'),
    rental('sep-02', '2026-09-02T00:00:00', '2026-09-02T00:00:00'),
  ];
  const august = { start: '2026-07-26', endExclusive: '2026-09-06' };
  const previous = { start: '2026-06-28', endExclusive: '2026-08-02' };
  const next = { start: '2026-08-30', endExclusive: '2026-10-04' };
  const week = { start: '2026-08-16', endExclusive: '2026-08-23' };
  assert.deepEqual(prepare(rentals, 'all', august).map((entry) => entry.rental.id), ['aug-18', 'sep-02']);
  assert.deepEqual(prepare(rentals, 'all', previous).map((entry) => entry.rental.id), []);
  assert.deepEqual(prepare(rentals, 'all', august).map((entry) => entry.rental.id), ['aug-18', 'sep-02']);
  assert.deepEqual(prepare(rentals, 'all', next).map((entry) => entry.rental.id), ['sep-02']);
  assert.deepEqual(prepare(rentals, 'all', august).map((entry) => entry.rental.id), ['aug-18', 'sep-02']);
  assert.deepEqual(prepare(rentals, 'all', week).map((entry) => entry.rental.id), ['aug-18']);
  assert.deepEqual(prepare(rentals, 'all', august).map((entry) => entry.rental.id), ['aug-18', 'sep-02']);
});

test('event mapping preserves the full rental UUID and normalized dates', () => {
  const fullId = 'dbfa267e-1e14-4047-b811-9b010f09c4dc';
  const [entry] = prepare([rental(fullId, '2026-08-18T00:00:00', '2026-08-20T00:00:00')]);
  const event = buildRentalCalendarEvent(entry, {
    title: 'Camera — Renter',
    color: '#fff',
    contrastColor: '#000',
  });
  assert.equal(event.id, fullId);
  assert.equal(event.extendedProps.rentalId, fullId);
  assert.equal(event.start, '2026-08-18');
  assert.equal(event.end, '2026-08-21');
});

test('overflow keeps four visible rows and suppresses duplicate continuation-only more links', () => {
  const events = Array.from({ length: 6 }, (_, index) => ({
    start: index < 5 ? '2026-08-18' : '2026-08-19',
    end: '2026-08-21',
  }));
  const continuationOnlyDates = getContinuationOnlyOverflowDates(events, 4);
  assert.equal(continuationOnlyDates.has('2026-08-18'), false);
  assert.equal(continuationOnlyDates.has('2026-08-19'), false);
  assert.equal(continuationOnlyDates.has('2026-08-20'), true);
});
