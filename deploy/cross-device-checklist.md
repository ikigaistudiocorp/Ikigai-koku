# Koku — Cross-device pre-launch checklist

Walk through every item on iPhone (iOS 26, Safari, PWA installed) and
desktop Chrome at 1280px. Tick each box; any failure blocks launch.

## Auth & onboarding
- [ ] Login page renders and submits
- [ ] First user gets owner role and hits onboarding baseline
- [ ] Baseline form submits and redirects to /clock
- [ ] Dev user (invited by owner) completes the flow without baseline

## PWA
- [ ] PWA installs to home screen on iOS 26
- [ ] Push permission prompt appears on first login
- [ ] Test push notification received while the app is closed
- [ ] `/manifest.json` returns the correct name/theme/icons

## Clock
- [ ] Start flow: project picker, work type picker, START tap starts timer
- [ ] Active timer visible and counting
- [ ] Active timer banner shows on every other screen
- [ ] Session feedback picker appears after STOP — human, fast, bilingual
- [ ] Work-type switch mid-session creates two DB rows with correct durations
- [ ] Clock-out under 3 min: session discarded, correct toast
- [ ] Custom work types: global + project-scoped render correctly
- [ ] Archiving a custom type removes it from picker, history still reads the name

## Dashboards
- [ ] Developer dashboard hydrates; AI Leverage Ratio correct
- [ ] Feedback sentiment row only appears with data
- [ ] Fragmentation score NOT present anywhere
- [ ] Owner dashboard Hire Signal renders all three conditions
- [ ] Baseline weeks visually distinct in capacity trend
- [ ] Pipeline toggle persists across reload

## Projects & reports
- [ ] Projects list + detail with correct per-member AI Leverage Ratio
- [ ] Owner creates a new project and scopes a custom work type
- [ ] Session history pagination works
- [ ] Session edit: work_type + note update; protected fields untouched
- [ ] Kinko CSV export downloads, no baseline rows, UTF-8 intact
- [ ] AI Leverage Report shows feedback correlation card + owner team comparison

## Weekly Mirror
- [ ] `/api/weekly-mirror/preview` returns real Claude content (correct language)
- [ ] Mirror email previewed in Apple Mail looks correct
- [ ] Friday-context screen saves and GET echoes back

## Settings & i18n
- [ ] Language toggle switches every string (including feedback emojis/labels)
- [ ] After-hours and mirror toggle persist across reload
- [ ] Dark mode toggle — clock, dashboards, bottom nav, feedback picker, onboarding all readable

## Resilience
- [ ] Airplane mode → clock-out attempt → pending banner → reconnect → auto-retry within 30 s
- [ ] API 500 → toast appears, no crash
- [ ] Session note typing blocked at 140 characters
- [ ] All loading spinners visible when expected

## Mobile specifics
- [ ] Primary tap targets ≥ 64 px
- [ ] No horizontal scroll at 375 px viewport
- [ ] Bottom nav respects the home-bar safe area inset
- [ ] Keyboard never obscures an active form field

## Security spot-checks
- [ ] Unauthenticated GET of every `/api/*` (except `/api/auth/*`) returns 401
- [ ] Developer GET of an owner-only route returns 403
- [ ] `/api/cron/notifications` and `/api/cron/weekly-mirror` return 401 without secret
- [ ] No console errors or warnings during a full walk-through
