# Recap Buddies V2 — PDF + Calendar Bug Fixes

Continue the existing Recap Buddies V2 implementation.

Follow `AGENTS.md`.

Use:

* `supabase` MCP
* `resend` MCP

when relevant.

Inspect the current implementation before modifying anything.

Do not rewrite unrelated V2 features.

Implement and validate the following fixes.

---

# 1. IMPORTANT REQUIREMENT CHANGE — Returnee PDF Verification Images

The previous requirement saying that returnee PDFs should not contain verification images is now obsolete.

**Supersede that rule.**

Returnee PDFs must now include all verification images that are actually available for that returnee.

The final rule is now:

```text
NEW RENTER
→ Agreement
→ Renter/Rental Details
→ Verification Images

RETURNING RENTER
→ Agreement
→ Renter/Rental Details
→ Available Verification Images
```

---

# 2. Existing-System Returnee PDF

For a returnee that successfully matches an existing `RB_RENTER` record, retrieve the existing verification data from Supabase.

Inspect the real `RB_RENTER` schema first.

Known fields may include:

```text
primary_id_front
primary_id_back

secondary_id_front
secondary_id_back

proof_of_billing

selfie_verification_img
selfie_verification_id
```

Also include the **new selfie submitted through `/returnee`** according to the current V2 implementation.

The PDF should display every verification image that is available.

Expected sections:

```text
Requirement 1: Primary ID
- Front
- Back

Requirement 2: Secondary ID
- Front
- Back

Requirement 3: Proof of Billing

Requirement 4/5: Selfie Verification
```

Use the actual current labels from the project where appropriate.

Do not trust image URLs passed from the browser.

Use:

```text
renter_id
        ↓
query RB_RENTER
        ↓
resolve Storage objects server-side
        ↓
download image bytes
        ↓
embed into PDF
```

---

# 3. Legacy Returnee PDF

A legacy returnee may not have previous IDs because they rented before the system existed.

They now submit a selfie through `/returnee`.

For a legacy returnee:

```text
Primary ID
→ omit or show "Not available" if none exists

Secondary ID
→ omit or show "Not available" if none exists

Proof of Billing
→ omit or show "Not available" if none exists

Selfie Verification
→ MUST display the selfie submitted through /returnee
```

Missing historical documents must not cause PDF generation to fail.

The important requirement is:

```text
Legacy returnee
→ include current returnee selfie
→ include any other verification document that actually exists
→ gracefully handle missing historical documents
```

---

# 4. Debug Why Returnee Images Are Missing

Do not simply add image tags blindly.

Trace the actual failure.

Inspect:

```text
/returnee selfie upload
        ↓
Storage upload
        ↓
database field/path persistence
        ↓
renter/rental record
        ↓
admin_new_booking Edge Function
        ↓
PDF data query
        ↓
Storage download
        ↓
PDF image conversion
        ↓
PDF output
```

Check whether the problem is caused by:

* returnee PDF intentionally excluding images from the previous requirement;
* missing `select()` fields;
* wrong `renter_id`;
* incorrect Storage object path;
* private bucket access;
* signed URL expiration;
* failed Storage download;
* unsupported image format;
* incorrect image byte/base64 conversion;
* PDF generator not awaiting image downloads;
* legacy returnee null fields.

Use Supabase MCP and Edge Function logs where useful.

Fix the actual root cause.

---

# 5. Preserve the Existing PDF Agreement

Continue using:

```text
Supabase Storage bucket:
terms_and_condition

File:
agreement.md
```

Do not hard-code another agreement.

Generated Admin PDF should continue to follow:

```text
1. Rental Contract Agreement
2. Renter + Rental Details
3. Verification Images
```

For both new and returning renters.

---

# 6. Replace the Current Custom Calendar With FullCalendar

Replace the current custom month-grid implementation with **FullCalendar**.

The target UI should be inspired by the supplied FullCalendar reference screenshot:

```text
<  >  Today                 August 2026             Month Week Day List
-----------------------------------------------------------------------
Sun      Mon      Tue      Wed      Thu      Fri      Sat
-----------------------------------------------------------------------

                  multi-day event bars stretch horizontally
```

Do not reproduce the sample's colors exactly.

Keep the Recap Buddies visual identity.

---

# 7. Inspect FullCalendar Version Before Installing/Importing

Before implementation:

1. inspect `package.json`;
2. determine whether FullCalendar is already installed;
3. determine its version if installed;
4. check React compatibility;
5. use the correct packages/import strategy for that FullCalendar version.

Do not blindly reuse old FullCalendar CSS imports.

The project previously encountered FullCalendar CSS/export issues.

Use the correct integration strategy for the installed/current version.

If installing FullCalendar, use packages compatible with the project's current React version.

Use only the plugins actually required.

---

# 8. Calendar Views

Implement these views where supported by the installed FullCalendar version:

```text
Month
Week
Day
List
```

Recommended mapping:

```text
Month → dayGridMonth
Week  → timeGridWeek
Day   → timeGridDay
List  → listMonth or listWeek
```

The default Admin calendar view should be:

```text
dayGridMonth
```

Use a toolbar similar to:

```text
LEFT
prev
next
today

CENTER
current month/title

RIGHT
Month
Week
Day
List
```

Keep it responsive.

---

# 9. FullCalendar Event Mapping — CRITICAL

Each rental must be represented as **ONE FullCalendar event**.

Do NOT create one event per rental date.

Wrong:

```text
Rental Aug 18–20

event Aug 18
event Aug 19
event Aug 20
```

Correct:

```text
ONE event

start = Aug 18
end   = Aug 21 exclusive
```

The database rental dates are conceptually:

```text
rent_date_start = inclusive
rent_date_end   = inclusive
```

FullCalendar's event end is exclusive.

Therefore create a helper such as:

```ts
toFullCalendarExclusiveEnd(rentDateEnd)
```

that returns the calendar date immediately after the rental end date.

Example:

```text
DB:

Start:
2026-08-18

End:
2026-08-20


FullCalendar:

start:
2026-08-18

end:
2026-08-21

allDay:
true
```

Expected UI:

```text
18          19          20
┌──────────────────────────────┐
│ G7X Mark 3 — Patrick         │
└──────────────────────────────┘
```

The event color/background must visually stretch through the **20th**.

---

# 10. Do Not Use UTC Conversion for Rental Dates

Rental start/end fields are date-only business dates.

Do not use:

```ts
new Date(date).toISOString()
```

in a way that can shift the rental by one day.

Use date-only utilities consistent with the current project.

Keep:

```text
2026-08-18
```

as August 18 regardless of browser timezone.

The existing project has historically had off-by-one-day calendar issues, so verify this carefully.

---

# 11. Multi-Day Event Rendering

Multi-day rentals must display as continuous horizontal event bars.

For example:

```text
G7X Mark 3
Aug 18 → Aug 20
```

must render approximately as:

```text
18                 19                 20

┌───────────────────────────────────────────────┐
│ G7X Mark 3 — Patrick                         │
└───────────────────────────────────────────────┘
```

Do not render:

```text
18
[G7X Mark 3]

19
(empty)

20
(empty)
```

Do not create CSS overlays manually across unrelated day cells when FullCalendar can represent the range natively.

Use an all-day / block-style multi-day event.

---

# 12. Events Crossing Week Boundaries

Bookings that cross a calendar week must render correctly.

Example:

```text
Aug 20 → Aug 25
```

may visually be split by FullCalendar at the week boundary, but it must remain clearly the same event.

Use the same:

```text
event.id = full rental UUID
```

for the FullCalendar event.

Do not create separate rental IDs for visual segments.

---

# 13. Event Content

Display concise event text.

For example:

```text
G7X Mark 3 — Patrick
```

or:

```text
G7X Mark 3 — Patrick C.
```

depending on available space.

Store additional data in `extendedProps`, for example:

```ts
extendedProps: {
  rentalId,
  renterId,
  status,
  renterName,
  cameraName,
  unitCode,
  branchId,
  ...
}
```

Keep the full UUID internally.

Use the existing short-ID helper only for display where applicable.

---

# 14. Event Click

Clicking a FullCalendar rental event must open the correct rental edit/details flow.

Use:

```text
event.id
```

or:

```text
extendedProps.rentalId
```

with the actual full rental UUID.

Do not infer a rental from:

* clicked date;
* renter name;
* event index;
* visible text.

Clicking a rental should continue to support the current Edit Rental Monitoring Details functionality where appropriate.

---

# 15. Calendar Overflow — Maximum Visible Events

Do not let high booking volume stretch individual calendar cells vertically and break the month layout.

Show approximately four visible rentals before overflow.

Prefer FullCalendar's built-in DayGrid overflow functionality.

Use an appropriate configuration such as:

```text
dayMaxEvents
```

or:

```text
dayMaxEventRows
```

according to the installed FullCalendar version and desired visual behavior.

The desired result is:

```text
18

Rental 1
Rental 2
Rental 3
Rental 4
+5 more
```

Clicking `+5 more` should open the additional events through a FullCalendar popover or an equivalent clean details UI.

---

# 16. Fix Duplicate `+N More`

Current bug:

A rental range causes overflow indicators to repeat on continuation dates.

Example of incorrect behavior:

```text
18
+5 more

19
+5 more

20
+3 more

21
+3 more

22
+3 more
```

when those entries are simply continuation segments of rentals that began on the 18th.

This must be fixed.

### Root requirement

Do not create a separate rental/event instance for every day.

Represent one rental as one multi-day FullCalendar event.

That should be the first fix.

---

# 17. `+N More` Start-Date Behavior

For a group of hidden bookings originating on the same rental start date, do not repeat the same overflow indicator across every continuation date.

Desired:

```text
18
Rental 1
Rental 2
Rental 3
Rental 4
+5 more

19
[continuation bars]

20
[continuation bars]
```

Not:

```text
18  +5 more
19  +5 more
20  +5 more
```

Use FullCalendar's built-in event segmentation/overflow behavior where it satisfies this requirement.

If the installed FullCalendar version still produces duplicate overflow links for continuation segments:

* inspect its event slicing / more-link APIs;
* implement the smallest customization required;
* treat the booking start date as the overflow anchor;
* do not reintroduce per-day duplicate rental records.

If the installed FullCalendar version supports an `eventSlicing` option, evaluate whether disabling slicing provides the desired uninterrupted multi-day behavior.

Verify visually before finalizing.

---

# 18. `+N More` Click Behavior

Clicking the overflow indicator should show all relevant hidden bookings for the selected start/date context.

Each row/item should still retain:

```text
full rental UUID
```

and clicking a hidden rental should open the correct rental.

Do not lose identity when events are hidden inside the overflow UI.

---

# 19. Event Colors

Preserve or improve the current status-based event colors.

The event's entire multi-day bar must use the same status color.

Example:

```text
Submitted
→ same event color from Aug 18 through Aug 20
```

Do not color only the first day.

Use FullCalendar event color/class properties rather than styling only the start-date cell.

Keep sufficient text contrast.

---

# 20. Calendar Status Updates

Preserve the existing status editing behavior.

If changing status from the calendar currently opens:

```text
Edit Rental Monitoring Details
```

continue using that existing flow where practical.

After a successful status change:

```text
database
        ↓
email notification
        ↓
calendar event
```

must all refresh consistently.

Do not require a full browser refresh.

Also preserve the previously fixed rule:

```text
status update + email succeeds
→ normal success

status succeeds + email genuinely fails
→ show email warning

status update fails
→ show failure
```

Do not reintroduce duplicate email sends.

---

# 21. FullCalendar Styling

Match the supplied modern FullCalendar reference more closely than the current rounded-cell custom calendar.

Desired:

* standard month grid
* visible weekday headers
* cleaner rectangular day cells
* current date highlight
* month title centered
* navigation controls
* Today button
* Month / Week / Day / List switch
* compact horizontal event bars
* subtle borders
* clear hover/click states
* responsive layout

Do not preserve the current oversized rounded cards for each calendar date.

Keep the surrounding Recap Buddies Admin shell:

* sidebar
* top navigation
* branding
* typography
* Admin layout

Only redesign the calendar area.

---

# 22. FullCalendar + Existing MUI

The project uses Material UI.

FullCalendar should integrate cleanly without replacing MUI.

Use MUI for surrounding:

* dialogs
* buttons where appropriate
* edit dialogs
* popovers if custom UI is required
* loading/error states

Do not introduce another general-purpose component framework.

---

# 23. Loading and Empty States

While calendar data is loading, show an appropriate loading state.

If no rentals exist for the visible period, show the empty FullCalendar month normally.

Do not render fake bookings.

---

# 24. Performance

Do not query Supabase once per calendar cell.

Load rentals for the visible date range efficiently.

When the FullCalendar visible range changes:

```text
previous month
next month
week
day
```

fetch or filter the required rental data using the current application's best pattern.

Avoid N+1 queries.

---

# 25. Regression Tests / Manual Verification

Verify at minimum:

## PDF

```text
New renter
→ PDF agreement loads
→ details load
→ Primary ID front/back display
→ Secondary ID front/back display
→ Proof of Billing displays
→ selfie displays
```

```text
Existing returnee
→ PDF agreement loads
→ details load
→ existing available IDs display
→ proof of billing displays if available
→ newly submitted returnee selfie displays
```

```text
Legacy returnee
→ PDF agreement loads
→ details load
→ missing historical IDs do not crash PDF
→ current returnee selfie displays
```

---

## Calendar single-day

```text
Aug 18 → Aug 18

event displays only Aug 18
```

---

## Calendar multi-day

```text
Aug 18 → Aug 20

one FullCalendar event
visual color/bar spans:
18
19
20

does NOT stop on 18
```

---

## FullCalendar exclusive end

Verify:

```text
DB end:
2026-08-20

FullCalendar end:
2026-08-21
```

without modifying the database end date itself.

---

## Multiple bookings

Test:

```text
1 booking
4 bookings
5 bookings
8+ bookings
```

The month layout must remain aligned.

---

## Overflow

For many bookings beginning Aug 18:

```text
18
4 visible
+N more
```

Continuation days must not display duplicate copies of the same overflow indicator unnecessarily.

---

## Week boundary

Verify a rental such as:

```text
Aug 20 → Aug 25
```

renders correctly across the week boundary.

---

## Month boundary

Verify a rental such as:

```text
Aug 30 → Sep 3
```

renders correctly.

---

## Event click

Every visible and overflow event must open the correct rental based on its full UUID.

---

# 26. Validation

Use `package.json` as the source of truth.

Run relevant commands such as:

```bash
npm run build
npm run lint
```

Run tests/type checking if configured.

If FullCalendar dependencies are added:

* verify the production build;
* ensure package versions are compatible;
* verify there are no CSS/export/import errors.

Use Supabase MCP when debugging data/date-range issues.

Use Edge Function logs to validate PDF image loading.

Do not claim success for checks that were not run.

---

# 27. Final Report

When complete report:

## PDF Fix

* root cause of missing returnee verification images
* files/data paths changed
* existing-returnee behavior
* legacy-returnee behavior
* selfie behavior

## Calendar Migration

* FullCalendar version used
* packages/plugins added
* views implemented
* old custom calendar code removed/replaced
* event mapping strategy

## Multi-Day Fix

Explain:

```text
DB inclusive end
→ FullCalendar exclusive end conversion
```

and confirm multi-day bars now span the complete rental range.

## Overflow Fix

Explain:

* why `+N more` was repeating before;
* how one-rental/one-event mapping fixed it;
* any additional FullCalendar overflow customization used.

## Validation

List only:

* commands actually run;
* scenarios actually tested;
* relevant Supabase/Edge Function checks.

Do not mark this task complete if:

* returnee verification images remain missing;
* multi-day event bars do not stretch;
* duplicate `+N more` remains;
* FullCalendar build/import errors remain.
