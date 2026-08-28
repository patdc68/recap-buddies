# AGENTS.md

## Project Identity

This repository is **Recap Buddies**, a camera-rental web application.

Treat this file as the primary Codex instruction set for this repository.

Before changing anything, inspect the current repository and, when relevant, use the connected MCP servers as live development sources of truth.

The currently configured MCP servers are:

- `supabase`
- `resend`

Do not assume MCP is unavailable without checking the active MCP inventory first.

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

Prefer the smallest complete solution that satisfies the request.

Do not turn focused tasks into broad rewrites.

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
  - Authentication
  - Storage
  - Edge Functions
- Vercel
- Resend for transactional email
- Codex MCP integrations for Supabase and Resend

Do not replace these core technologies or add overlapping alternatives unless the task clearly requires it.

Always inspect `package.json`, project configuration, and nearby implementation before choosing a new dependency or pattern.

## Codex Working Process

For every non-trivial task:

1. Read the relevant repository files.
2. Inspect the existing implementation before editing it.
3. Identify affected components, hooks, types, forms, validation, Supabase queries, migrations, RLS policies, Edge Functions, email logic, analytics, and tests.
4. Use MCP when live service state is relevant.
5. Prefer the smallest correct change.
6. Review the diff.
7. Run relevant validation.
8. Report only checks and MCP actions actually performed.

Do not ask the user for information that the repository or connected MCP tools can safely answer.

## Scope Discipline

- Keep edits focused on the requested task.
- Preserve unrelated working behavior.
- Do not perform unrelated cleanup.
- Do not mass-format unrelated files.
- Do not silently change business rules.
- Do not remove working features that were not requested.
- If an unrelated issue is found, mention it separately.

## Project Domain

Recap Buddies manages renter registration and verification, Admin/Staff access, branches, camera/device models, physical camera inventory, rentals, rental status workflow, scheduling/calendar behavior, operational monitoring, pricing, analytics, email notifications, and editable public/footer content.

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

The connected development Supabase project is the preferred live source of truth for the current schema.

Never fabricate a column, relationship, policy, trigger, or function.

Before relying on a database field:

1. inspect the repository;
2. inspect Supabase through MCP when relevant;
3. inspect migrations;
4. reconcile any mismatch before coding against it.

## Known Core Fields

### `RB_USER`

Known fields include `id`, `role`, `branch_id`, `user_fname`, `user_lname`, `auth_user_id`, and `created_at`.

### `RB_BRANCHES`

Known fields include `id`, `location_name`, `location_addr`, and `created_at`.

### `RB_DEVICES`

Known fields include `id`, `cam_name`, `device_img`, and `created_at`.

### `RB_ITEM`

Known fields include `id`, `cam_name`, `serial_no`, `code_name`, `branch_id`, `avail_qty`, `total_qty`, `condition`, `gps`, `image_url`, `rent_price`, and `created_at`.

### `RB_RENTER`

Known fields include `id`, `renter_fname`, `renter_lname`, `mobile_no`, `emergency_contact_no`, `email`, `auth_user_id`, `primary_id_front`, `primary_id_back`, `secondary_id_front`, `secondary_id_back`, `proof_of_billing`, `selfie_verification_id`, `selfie_verification_img`, and `created_at`.

### `RB_RENTAL_FORM`

Known fields include `id`, `renter_id`, `branch_id`, `status`, `rent_date_start`, `rent_date_end`, `pickup_time`, `return_time`, `actual_return_date`, `total_price`, `rent_price`, `remarks`, `messenger_link`, `delivery_addr`, and `created_at`.

If MCP or migration history shows a different current schema, follow the actual connected development schema and update repository contracts accordingly.

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

Use the current source of truth in the repository.

Do not maintain duplicate status arrays or enums that can drift apart.

When adding or changing a status, inspect forms, dropdowns, filters, renter dashboard, Admin/Staff views, monitoring, calendar, inventory availability, analytics, email notifications, and status-dependent actions.

## Roles and Authorization

Known application roles include Admin and Staff.

Preserve permission boundaries.

Do not accidentally give Staff Admin-only operations.

Hidden UI is not authorization.

Where applicable, preserve authorization at frontend route level, server/Edge Function level, and database/RLS level.

## Renter Verification

Renter setup may include primary ID, secondary ID, proof of billing, and selfie verification.

The selfie requirement should remain practical. Known guidance may include a clear face, good lighting, no mask, no shades, and no cap or obstruction.

Do not add unnecessary verification friction unless explicitly requested.

## Repeat Renter Logic

Repeat-renter behavior is based on prior completed rentals.

Keep one source of truth across monitoring, calendar details, analytics, renter labels, and reports.

Do not implement separate competing repeat-renter calculations.

## Inventory

`RB_ITEM` represents physical rentable inventory.

Known concepts include branch, camera/device type, `code_name`, serial number, condition, GPS, image, rental price, and availability.

When modifying assignment logic:

- preserve active-rental protections;
- do not assign unavailable items;
- preserve branch relationships;
- keep quantity/availability calculations consistent;
- avoid duplicate availability logic.

`RB_DEVICES` may be used for model-level renter selection to avoid displaying duplicate physical units.

Verify the current intended usage before changing selection logic.

## Calendar and Date Safety

Date behavior is high-risk.

Known expectations:

- rentals can span multiple days;
- start/end dates must display exactly as selected/stored;
- clicking an event must open the correct rental;
- overlapping rentals must remain readable;
- overflow may use `+X more`.

Avoid off-by-one-day regressions.

For date-only database values:

- treat them as calendar dates;
- avoid UTC conversion unless intentionally required;
- be cautious with `toISOString()`;
- use existing Day.js conventions.

When modifying rental dates, verify same-day rentals, multi-day rentals, month boundaries, displayed start/end dates, edit-dialog values, and calendar event-to-rental mapping.

## Time Fields

`pickup_time` and `return_time` may be SQL time strings.

Do not assume they contain a date, timezone, or browser-parseable timestamp.

Do not blindly pass raw SQL `TIME` values to browser date constructors.

Reuse existing time parsing/formatting helpers when available.

## Monitoring

The operational monitoring view may include PD, PT, RD, RT, renter full name, camera/unit, New/Repeat renter, Pick-up/Deliver type, branch/hub, messenger/group-chat link, rental fee, status, and actual unit / `code_name`.

Preserve existing DataGrid/table behavior including filtering, sorting, links, image interactions, and responsive behavior.

## Pricing

Treat rental pricing as business-critical.

Known fields can include `rent_price` and `total_price`.

Before changing calculations, determine whether each represents a daily rate, stored final total, or calculated total.

Avoid double multiplication.

Trace pricing through rental creation, rental editing, monitoring, analytics, email, and reporting.

Do not change pricing semantics during unrelated UI work.

## Analytics

Known analytics may include total rentals per branch, revenue per branch, most-rented items/cameras, overall revenue, New vs Repeat renters, monthly analytics, and YTD analytics.

Use consistent calculation and filter logic.

When changing analytics verify branch filters, date filters, inclusion/exclusion rules, canceled/declined treatment, no double counting, no-data states, current-period totals, and YTD totals.

Charts, cards, and tables representing the same metric should derive from the same logic where possible.

## Forms

Use established React Hook Form + Zod patterns.

When adding or changing a field, update as applicable:

- Zod schema;
- TypeScript type;
- default value;
- UI control;
- edit population;
- validation;
- insert payload;
- update payload;
- display/reporting;
- analytics.

Prevent duplicate async submissions.

Preserve entered values after validation errors where practical.

## TypeScript

Keep TypeScript type-safe.

- Avoid `any` as an error-suppression shortcut.
- Reuse shared types.
- Handle nullable Supabase values explicitly.
- Update query-result/enriched types when selects change.
- Avoid unsafe assertions.
- Do not use `@ts-ignore` merely to silence errors.
- Regenerate/check Supabase TypeScript types after relevant schema changes.

Fix the underlying contract.

## Material UI and UX

MUI is the primary component library.

- Reuse existing theme/components.
- Follow current `sx`/styling conventions.
- Preserve responsiveness.
- Keep tables, dialogs, inputs, typography, and buttons consistent.
- Reuse existing image-preview behavior where available.
- Do not add another UI framework.

Preserve the established Recap Buddies black/grey/white visual direction and configured project fonts where already implemented.

Do not redesign unrelated screens during functional work.

## MCP Configuration

This project currently has two working MCP servers:

- `supabase`
- `resend`

Codex should check `/mcp` or the active MCP inventory before concluding that either service is unavailable.

A startup warning alone is not sufficient evidence that an MCP server failed.

If the MCP inventory exposes tools for a server, treat that server as available.

## Supabase MCP

Expected server name:

```text
supabase
```

The current MCP toolset includes capabilities such as:

- `apply_migration`
- `create_branch`
- `delete_branch`
- `deploy_edge_function`
- `execute_sql`
- `generate_typescript_types`
- `get_advisors`
- `get_edge_function`
- `get_project_url`
- `get_publishable_keys`
- `list_branches`
- `list_edge_functions`
- `list_extensions`
- `list_migrations`
- `list_tables`
- `merge_branch`
- `query_logs`
- `rebase_branch`
- `reset_branch`
- `search_docs`

Use the actual active MCP tool inventory as the source of truth because available tools can change.

## Supabase MCP Is Allowed to Configure Development

Codex is allowed to configure the connected **development/test Supabase project** when the requested task requires backend changes.

Codex may use Supabase MCP to inspect the live development schema, inspect tables and migrations, create and apply migrations, execute required SQL, create/alter tables and columns, create indexes, add constraints, create views, create database functions, create triggers, configure RLS policies through SQL/migrations, inspect logs, inspect security/performance advisors, generate TypeScript types, inspect Edge Functions, deploy Edge Functions, manage development branches when genuinely useful, and search official Supabase documentation.

Do not stop after frontend implementation when the requested feature clearly requires a backend change.

## Supabase Change Workflow

When a task requires Supabase changes:

1. Inspect the current repository implementation.
2. Inspect the connected Supabase schema using MCP.
3. Inspect migrations.
4. Identify the minimum required change.
5. Create a proper migration for durable schema/RLS changes.
6. Review the migration for destructive behavior.
7. Apply the migration to the connected development/test project when required.
8. Generate/check TypeScript types.
9. Update application code.
10. Run relevant build/lint/tests.
11. Check advisors/logs when useful.
12. Report exactly what changed.

Prefer durable migrations over undocumented live-only changes.

## Database Write Rules

Use migrations for durable changes such as tables, columns, indexes, foreign keys, constraints, RLS policies, views, database functions, and triggers.

`execute_sql` may be used when appropriate, but do not use ad-hoc SQL as a substitute for a migration when the change should be reproducible.

Do not apply destructive SQL without explicit user instruction.

Never casually drop business tables, truncate customer/rental data, reset the database, destroy renter records, or remove unrelated columns.

## RLS Rules

Codex may configure RLS when required.

Before changing RLS:

1. inspect current policies;
2. understand renter/Admin/Staff access paths;
3. preserve least privilege;
4. avoid unrestricted access as a shortcut.

Do not disable RLS merely to make a query succeed.

Do not create broad unrestricted policies unless explicitly required and justified.

Private renter verification data must not become broadly accessible.

## Supabase Branching

Supabase MCP currently exposes branch operations.

Branching may be used for risky or larger database work when it materially reduces risk.

Before using `create_branch`, `delete_branch`, `merge_branch`, `rebase_branch`, or `reset_branch`, understand the task and avoid destructive branch actions.

Do not create/delete/reset branches unnecessarily.

## Edge Functions

Codex may inspect and deploy Supabase Edge Functions when the task requires it.

For Edge Functions:

- keep secrets server-side;
- validate inputs;
- preserve CORS behavior;
- return meaningful HTTP statuses;
- expose safe error payloads;
- do not leak Resend credentials or internal errors;
- keep repository source aligned with deployed code.

When debugging an Edge Function, inspect both source code and Supabase logs.

## Supabase Auth Limitations

Codex may configure database-side Auth behavior through triggers, functions, tables, RLS, application Auth code, and available MCP tools.

Not every Supabase Dashboard Auth setting is guaranteed to be exposed through MCP.

If a required provider/dashboard setting is unavailable through the current MCP tools:

- clearly say what remains;
- do not pretend it was configured;
- do not invent an unsupported MCP action.

## Supabase Security

Never expose `service_role` in frontend code, commit secrets, hard-code database credentials, expose privileged keys, disable security controls as a shortcut, rotate keys unless explicitly requested, alter unrelated projects, or make account/billing changes.

Use MCP against the intended development/test project.

Production changes should follow the project's controlled release process.

## Resend MCP

Expected server name:

```text
resend
```

The active Resend MCP currently exposes tools for email sending, email status, email cancellation/update, API logs, domains, domain verification, templates, broadcasts, automations, contacts, contact imports, segments, suppressions, topics, webhooks, received email, OAuth grants, and API keys.

Use the actual current MCP inventory as the source of truth.

## Resend Usage

Resend is used for transactional email.

Known rental email events may include:

- rental submitted;
- in review;
- declined;
- start reminder;
- return reminder.

Provider secrets must remain server-side.

Do not move Resend API credentials into React/browser code.

Avoid duplicate email sends.

Preserve the existing auto-generated email footer and template behavior unless requested.

## Resend MCP Safety

Prefer inspection before mutation.

Appropriate inspection tasks include recent email logs, delivery failures, sent email metadata, verified domains, templates, webhooks, and provider-side errors.

Do not use a real customer email as a connectivity test.

Do not perform account-impacting actions unless required by the task.

Avoid unnecessary use of tools that create/remove API keys, remove domains, revoke OAuth grants, send broadcasts, remove templates, remove webhooks, alter large contact lists, or send batch emails.

If a write action is required, perform only the minimum necessary action.

## Email Debugging Workflow

When an email fails, trace the full path:

1. React/frontend trigger.
2. Supabase invocation.
3. Edge Function code.
4. Edge Function logs through Supabase MCP.
5. Resend API/log entry through Resend MCP.
6. Delivery result.
7. Template/domain state if relevant.

Do not guess whether the failure is in Supabase or Resend when both MCP sources can be inspected.

## MCP Write Approval Philosophy

Both Supabase and Resend MCP expose powerful write-capable tools.

Codex should inspect first, make the minimum required change, avoid destructive operations, respect configured approval behavior, never work around MCP approval restrictions, and clearly summarize mutations performed.

A request to implement a feature is permission to make the necessary development changes, not permission to perform unrelated destructive actions.

## Error Handling

Use existing Snackbar/notification patterns where available.

Provide useful feedback for failed fetches, saves, uploads, invalid forms, Edge Function failures, and email failures.

Do not expose raw SQL, stack traces, internal Supabase details, provider secrets, or API keys.

Remove temporary debug logs before finishing.

## Dependencies

Before adding a dependency:

1. inspect existing packages;
2. check whether an installed library already solves the problem;
3. prefer existing project libraries;
4. avoid overlapping dependencies;
5. avoid unrelated upgrades.

Do not switch package managers.

Do not update the lockfile unless dependency changes actually require it.

## Validation

Treat `package.json` as the source of truth for commands.

For normal frontend changes, run relevant available scripts such as:

```bash
npm run build
npm run lint
```

Run type-check/test scripts if defined.

After Supabase changes, verify as applicable:

- migration applied successfully;
- schema is correct;
- generated TypeScript types are aligned;
- affected queries work;
- RLS behavior is correct;
- Edge Function is deployed when required;
- logs show expected behavior;
- advisors do not show a newly introduced issue.

After email changes, verify as applicable:

- Edge Function invocation;
- Resend API/log result;
- delivery status;
- no duplicate-send behavior.

Never claim validation passed unless it actually ran.

## Git Safety

Protect existing user work.

Do not:

- discard unrelated local changes;
- run `git reset --hard`;
- delete untracked work;
- rewrite history;
- commit unless requested;
- push unless requested;
- force-push unless explicitly requested;
- merge unless requested;
- create releases/tags unless requested.

Never commit secrets, API keys, real `.env` values, or service-role credentials.

Review the relevant diff and migrations before finishing.

## Definition of Done

A task is complete when, as applicable:

1. The requested behavior works.
2. Existing relevant behavior remains intact.
3. Required Supabase changes are actually implemented, not merely described.
4. Durable database/RLS changes are represented in migrations when appropriate.
5. Supabase types/contracts are aligned.
6. Edge Functions are deployed when required.
7. Email behavior is verified through code/logs when relevant.
8. Role and RLS restrictions remain correct.
9. Dates/times remain safe.
10. Pricing/analytics semantics remain correct.
11. Relevant build/lint/tests were run.
12. No security/data-integrity regression was introduced.
13. No unrelated changes were included.
14. The final response accurately describes code changes and MCP actions.

## Final Response Format

### Changed
- Application changes.
- Supabase schema/migration/RLS/Edge Function changes actually made.
- Resend/template/email-related changes actually made.

### Validation
- Commands actually run.
- MCP inspections/actions actually performed.
- Results.

### Notes
- Migrations.
- RLS implications.
- Edge Function deployment.
- Email delivery findings.
- Date/time considerations.
- Analytics/business-rule implications.
- Any remaining manual dashboard-only configuration.
