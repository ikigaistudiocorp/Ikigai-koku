# Design — Work-type color cues + forgot-to-clock-out retroactive stop

Date: 2026-04-14

## Motivation

Two small UX gaps surfaced during the first production day:

1. **No visual cue for work type in session lists.** The picker uses colors, but every list of past sessions only shows an emoji + label, so users cannot scan for "which sessions were debugging vs polish" at a glance.
2. **Clocking out late produces garbage data.** If a user forgets to stop, the STOP endpoint hardcodes `ended_at = NOW()`, so returning the next morning logs a 15-hour session. A push reminder (`checkForgottenClockOuts`) already exists and fires after 3h, but the UI offers no way to specify an accurate end time.

## Feature 1 — Work-type color cues

### Where

- `/reports/sessions` (session history list)
- Project detail page — "recent sessions" block
- `/clock` — today's sessions list

### How

Each session row gains a small colored dot rendered from `WORK_TYPE_META[work_type].color` (the same Tailwind `bg-*` class already used by the picker). Placement: left of or replacing the current emoji, without changing row height.

Custom work types already carry a color field — reuse it when `custom_work_type_id` is set.

### Legend

A compact legend is needed once users start scanning by color. Implementation: an inline "?" icon at the top of each affected list, opening a popover that lists each work type with its color + localized label. No dedicated page.

## Feature 2 — Retroactive stop time

### Keep

`checkForgottenClockOuts` stays at the existing **3-hour** threshold. No change to the cron or push logic.

### New: retroactive-stop modal on `/clock`

When the user taps STOP on an active session whose duration is **> 3 hours**, intercept the action with a modal:

> "When did you actually stop working?"
>
> - **Now** (default)
> - **At after-hours end** (uses `after_hours_end` from the user's settings; only offered if that time falls between `started_at` and now)
> - **Custom time** (datetime picker, constrained `started_at < x ≤ now`)

Sessions ≤ 3h stop as today with no modal.

### API change — `POST /api/sessions/stop`

Accept an optional `ended_at` field (ISO string).

Validation:

- If omitted → behaves as today (`ended_at = NOW()`).
- If present → must parse as a valid Date, be strictly greater than `started_at`, and ≤ server `NOW()` (with a small clock-skew tolerance, e.g. +60s).
- `duration_minutes` is recomputed from the accepted `ended_at`.
- The existing `MIN_DURATION_MINUTES` rule still applies; sub-minimum sessions are still discarded.

No schema changes.

## Out of scope

- Auto-closing sessions server-side (explicitly rejected — fabricates data silently).
- Editing end time of already-closed sessions. (Users can delete + recreate via existing endpoints for now; revisit if it becomes a pain point.)
- Per-user configurable threshold.
- Notification-action "quick stop" buttons (iOS web-push limitations).

## Testing

- Session list rows render the correct color for built-in and custom work types across all three surfaces.
- Legend popover opens/closes and shows localized labels (es/en).
- STOP on a <3h session: no modal, end time = now.
- STOP on a >3h session: modal appears; each option writes the expected `ended_at` and `duration_minutes`.
- API: `ended_at` before `started_at` → 400. `ended_at` in the future → 400. Missing field → legacy behavior. Duration < `MIN_DURATION_MINUTES` → discard.
