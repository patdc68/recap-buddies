# AGENTS.md

## Project Identity

This repository is **Recap Buddies**, a camera-rental web application.

Treat this file as the primary Codex instruction set for this repository. Before making changes, inspect the current codebase and use the repository and connected development Supabase project as the source of truth when implementation details have evolved.

## Engineering Role

Act as a senior software engineer maintaining an existing production-oriented application.

Prioritize:

1. Correctness
2. Security and data protection
3. Preservation of existing business behavior
4. Maintainability
5. Simplicity
6. Consistency with existing code
7. Performance where it materially matters

Prefer small, complete, validated changes over broad rewrites.

## Current Technology Stack

The project currently uses:

- React
- TypeScript
- Vite
- Material UI (MUI)
- React Hook Form
- Zod
- Day.js
- Recharts
- Supabase
  - PostgreSQL
  - Auth
  - Storage
  - Edge Functions
- Vercel
- Resend for transactional email

Do not replace these core technologies or introduce overlapping alternatives unless clearly required.

## Before Making Changes

For non-trivial work:

1. Inspect relevant repository files.
2. Inspect the applicable database/schema state through `supabase_recap` MCP when connected.
3. Trace the complete affected workflow.
4. Identify affected:
   - components;
   - hooks;
   - types;
   - forms;
   - validation;
   - queries;
   - migrations;
   - RLS/security policies;
   - Storage;
   - Edge Functions;
   - analytics;
   - notifications.
5. Search for existing project patterns before creating new ones.
6. Implement the smallest complete solution.
7. Review the diff and any generated migration.
8. Run relevant validation.
9. Report only checks actually performed.

Do not ask the user for information that the repository or safely connected MCP tools can answer.

## Scope Discipline

- Keep changes focused on the requested task.
- Preserve unrelated behavior.
- Do not perform unrelated cleanup.
- Do not mass-format files.
- Do not silently change business rules.
- Do not remove working behavior not mentioned by the task.
- Mention unrelated issues separately.

## Core Domain

Recap Buddies manages:

- renter registration and verification;
- Admin/Staff access;
- branches;
- camera/device models;
- rentable inventory;
- rentals;
- rental statuses;
- scheduling/calendar behavior;
- operational monitoring;
- pricing;
- analytics;
- email notifications;
- editable public/footer content.

## Database Conventions

Project tables commonly use the `RB_` prefix.

Known tables include:

- `RB_USER`
- `RB_BRANCHES`
- `RB_DEVICES`
- `RB_ITEM`
- `RB_RENTER`
- `RB_RENTAL_FORM`
- `SELFIE_VERIFICATION_INST`

Before relying on a column or relationship:

1. inspect repository query/type definitions;
2. inspect the development database using `supabase_recap`;
3. verify migrations;
4. never fabricate missing fields.

## Known Core Fields

### `RB_USER`

Known fields:

- `id`
- `role`
- `branch_id`
- `user_fname`
- `user_lname`
- `auth_user_id`
- `created_at`

### `RB_BRANCHES`

Known fields:

- `id`
- `location_name`
- `location_addr`
- `created_at`

### `RB_DEVICES`

Known fields:

- `id`
- `cam_name`
- `device_img`
- `created_at`

### `RB_ITEM`

Known fields:

- `id`
- `cam_name`
- `serial_no`
- `code_name`
- `branch_id`
- `avail_qty`
- `total_qty`
- `condition`
- `gps`
- `image_url`
- `rent_price`
- `created_at`

### `RB_RENTER`

Known fields:

- `id`
- `renter_fname`
- `renter_lname`
- `mobile_no`
- `emergency_contact_no`
- `email`
- `auth_user_id`
- `primary_id_front`
- `primary_id_back`
- `secondary_id_front`
- `secondary_id_back`
- `proof_of_billing`
- `selfie_verification_id`
- `selfie_verification_img`
- `created_at`

### `RB_RENTAL_FORM`

Known fields:

- `id`
- `renter_id`
- `branch_id`
- `status`
- `rent_date_start`
- `rent_date_end`
- `pickup_time`
- `return_time`
- `actual_return_date`
- `total_price`
- `rent_price`
- `remarks`
- `messenger_link`
- `delivery_addr`
- `created_at`

The connected development schema takes precedence if these details have changed.

## Rental Statuses

Known statuses include:

- Available
- In review
- For Delivery
- Renting
- Delivered
- For Return
- For Refund
- For Penalty
- Canceled
- Declined
- Completed

Use the existing source of truth.

Do not maintain duplicate status lists.

When adding/changing a status, inspect:

- forms;
- dropdowns;
- filters;
- renter dashboard;
- Admin/Staff views;
- monitoring;
- calendar;
- inventory availability;
- analytics;
- notifications;
- status-dependent actions.

## Roles and Authorization

Known roles:

- Admin
- Staff

Preserve permission boundaries.

Do not accidentally grant Staff Admin-only operations.

Hidden UI is not authorization.

Preserve backend/database authorization where applicable.

## Renter Verification

Known renter setup can include:

- primary ID;
- secondary ID;
- proof of billing;
- selfie verification.

Selfie guidance should remain practical:

- clear face;
- good lighting;
- no mask;
- no shades;
- no cap/face obstruction.

Do not add unnecessary verification friction.

## Repeat Renter Logic

Repeat-renter behavior is based on prior completed rentals.

Keep a single source of truth across:

- calendar details;
- monitoring;
- analytics;
- renter labels.

Do not implement competing calculations.

## Inventory

`RB_ITEM` represents actual rentable inventory.

Known concepts:

- branch;
- camera/device;
- `code_name`;
- serial number;
- condition;
- GPS;
- image;
- rental price;
- availability.

When changing assignment:

- preserve active-rental protection;
- avoid unavailable items;
- preserve branch relationships;
- keep quantity/availability logic consistent.

`RB_DEVICES` may be used for renter-facing model selection to avoid duplicate physical units.

Verify before implementation.

## Calendar and Date Safety

Date behavior is high-risk.

Known expectations:

- rentals may span multiple days;
- start/end dates must display exactly as stored/selected;
- clicking an event opens the matching rental;
- overlapping rentals remain readable;
- overflow may use `+X more`.

Avoid off-by-one-day regressions.

For date-only values:

- treat them as calendar dates;
- avoid UTC conversion unless intentionally required;
- be cautious with `toISOString()`;
- use existing Day.js conventions.

When modifying rental dates, verify:

- same-day rental;
- multi-day rental;
- month boundary;
- displayed start;
- displayed end;
- edit dialog values;
- event click mapping.

## Time Fields

`pickup_time` and `return_time` may be SQL time strings.

Do not assume they contain a date or timezone.

Do not blindly parse raw SQL `TIME` values with browser date constructors.

Reuse existing time helpers.

## Monitoring

Known monitoring concepts can include:

- PD = start date;
- PT = pickup time;
- RD = end date;
- RT = return time;
- renter name;
- camera/unit;
- New/Repeat;
- Pick-up/Deliver;
- branch/hub;
- messenger/group-chat link;
- rental fee;
- status;
- actual unit / `code_name`.

Preserve DataGrid/table sorting/filtering/link/image behavior.

## Pricing

Treat pricing as business-critical.

Known fields may include:

- `rent_price`;
- `total_price`.

Determine whether each means:

- daily price;
- stored final price;
- calculated total.

Avoid double multiplication.

Trace price use through forms, monitoring, analytics, email, and reporting.

## Analytics

Known analytics may include:

- rentals per branch;
- revenue per branch;
- most-rented items;
- overall revenue;
- New vs Repeat renters;
- monthly;
- YTD.

Use consistent calculation/filter rules.

Verify:

- branch filtering;
- date filtering;
- inclusion/exclusion rules;
- no double-counting;
- no-data state;
- current-period and YTD totals.

Do not silently redefine canceled/declined treatment.

## Forms

Use React Hook Form + Zod patterns already present.

For field changes review:

- schema;
- TypeScript type;
- default;
- UI;
- edit population;
- validation;
- insert/update payload;
- reporting/analytics impact.

Prevent duplicate async submissions.

## TypeScript

- Avoid `any` as a shortcut.
- Reuse shared types.
- Handle nullable Supabase values.
- Update query-result types when select shapes change.
- Avoid unsafe assertions.
- Do not use `@ts-ignore` just to silence errors.

After schema changes, regenerate/check Supabase TypeScript types when appropriate.

## Material UI and UX

MUI is the primary component library.

- Reuse theme/components.
- Preserve responsive behavior.
- Keep tables/dialogs/inputs/buttons consistent.
- Reuse existing image-preview patterns.
- Do not add another UI framework.

Preserve the established Recap Buddies visual language.

## Supabase — Codex Is Allowed to Configure It

Codex is allowed to configure the **connected development/test Supabase project** when the requested task requires backend changes.

Expected MCP server:

- `supabase_recap`

Codex may use Supabase MCP to:

- inspect tables/schema;
- inspect migrations;
- create and apply migrations;
- execute necessary SQL;
- create/alter tables, columns, constraints, indexes, views, functions, triggers, and policies when required;
- configure Row Level Security through migrations/SQL;
- inspect security/performance advisors;
- inspect project logs;
- generate TypeScript types;
- inspect Edge Functions;
- deploy/update Edge Functions;
- inspect Storage buckets/config;
- update Storage configuration when required;
- search official Supabase documentation.

### Supabase Configuration Workflow

When a task needs a Supabase change:

1. Inspect current schema/config first.
2. Determine the smallest required change.
3. Prefer a migration for durable database/schema/RLS changes.
4. Keep the migration represented in repository source control when the project uses migration files.
5. Review the migration for destructive behavior.
6. Apply it to the connected development/test project when necessary.
7. Regenerate/check application types.
8. Update frontend/backend code.
9. Run relevant validation.
10. Check security/performance advisors when the change affects schema, RLS, or queries.
11. Report exactly what was configured.

### Database Change Rules

Prefer `apply_migration` for:

- tables;
- columns;
- constraints;
- indexes;
- functions;
- triggers;
- views;
- RLS policies;
- other durable DDL/config changes.

Use direct SQL thoughtfully for inspection or changes that are genuinely appropriate outside a migration.

Do not make ad-hoc live schema changes without also preserving the intended schema change in repository migrations when migrations are part of this project.

### RLS and Policies

Codex may create/update RLS policies when required.

Before changing RLS:

- inspect current policies;
- understand Admin/Staff/Renter access paths;
- avoid broad `USING (true)` / unrestricted write policies unless explicitly justified;
- preserve least privilege;
- ensure authenticated users cannot access another renter's private records/documents.

Do not disable RLS as a shortcut.

### Edge Functions

Codex may inspect and deploy Edge Functions when required.

For Edge Functions:

- keep secrets server-side;
- validate input;
- preserve CORS;
- return safe errors;
- avoid leaking provider/internal details;
- update repository source and deployed function consistently.

### Storage

Codex may inspect/update Storage configuration if the MCP Storage feature is enabled.

When changing Storage:

- inspect current buckets and usage;
- preserve existing paths;
- avoid accidental deletion;
- apply least-privilege access;
- coordinate Storage policies with renter/admin access;
- do not expose private verification documents publicly.

### Auth Configuration

For Supabase Auth-related work:

- inspect current application Auth flow;
- use available Supabase tools and repository configuration;
- configure database-side Auth relationships/triggers/policies through migrations when appropriate;
- do not invent provider settings;
- do not disable authentication for convenience.

If a required Auth dashboard setting is not exposed by the available MCP tools, clearly identify that limitation instead of pretending it was configured.

### Supabase MCP Safety

This permission is for a **development/test project**, not normal production data.

Never:

- drop/truncate business tables casually;
- destroy existing user data;
- reset the database;
- disable RLS to make a task pass;
- delete buckets/files unrelated to the task;
- rotate keys;
- create/pause/delete unrelated projects;
- make account/billing changes;
- connect normal Codex development to real production customer data.

The project-scoped MCP configuration intentionally excludes account-management access.

MCP write operations should remain approval-gated.

## Resend

Resend is used for transactional email, typically through server-side/Supabase Edge Functions.

Keep provider credentials server-side.

Known events may include:

- rental submitted;
- in review;
- declined;
- start reminder;
- return reminder.

Avoid duplicate sends.

Preserve templates/footer behavior unless requested.

## Resend MCP

Expected MCP server:

- `resend_recap`

Use it for:

- delivery/API logs;
- sent-email status;
- templates;
- domains;
- webhooks;
- received email when relevant.

Prefer inspection first.

Do not send real customer emails only to test connectivity.

Do not make broad account-impacting changes without an explicit task.

## Email Debugging Workflow

For email failures, trace:

1. frontend trigger;
2. Supabase invocation;
3. Edge Function source;
4. Edge Function logs;
5. Resend request/log;
6. delivery result.

Use Supabase and Resend MCP together when available.

## Error Handling

Use existing Snackbar/notification patterns.

Provide useful feedback without exposing raw SQL, Supabase internals, stack traces, or provider secrets.

Remove temporary debug logs.

## Dependencies

Before adding dependencies:

1. inspect current packages;
2. prefer existing libraries;
3. avoid overlap;
4. avoid unrelated upgrades;
5. keep current package manager.

## Validation

Use `package.json` as the command source of truth.

For normal frontend changes, run relevant available commands such as:

```bash
npm run build
npm run lint
```

Run type-check/tests if defined.

After Supabase changes, also verify as applicable:

- migration applied successfully;
- generated types are aligned;
- relevant queries work;
- RLS behavior is correct;
- advisors do not show a newly introduced issue;
- Edge Function deployed when required.

Never claim success for checks not run.

## Git Safety

Do not:

- discard unrelated changes;
- run `git reset --hard`;
- delete untracked work;
- rewrite history;
- commit unless requested;
- push unless requested;
- force-push unless explicitly requested;
- merge/tag/release unless requested.

Never commit secrets or real `.env` values.

Review diffs and migrations before finishing.

## Definition of Done

A task is complete when, as applicable:

1. Requested behavior works.
2. Relevant Supabase configuration is also implemented, not merely described.
3. Durable Supabase changes are represented safely in migrations/source where appropriate.
4. Existing business behavior remains intact.
5. Role/RLS restrictions remain correct.
6. Dates/times remain safe.
7. Types and schema are aligned.
8. Pricing/analytics semantics remain correct.
9. Relevant MCP checks and build/lint/tests were run.
10. No security/data-integrity regression was introduced.
11. No unrelated changes were added.

## Final Response

### Changed
- Application changes.
- Supabase/database/Edge Function/Storage/RLS configuration actually changed.

### Validation
- Commands and MCP checks actually run.

### Notes
- Migration, RLS, Storage, Auth, date/time, email, analytics, or deployment implications.
