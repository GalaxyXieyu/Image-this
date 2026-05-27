# Quick Task: Log Diagnostics Readability

## Goal
Improve in-app log diagnostics so long error lines and stack traces are readable inside the Settings page.

## Scope
- Keep existing Electron IPC and tail-read behavior.
- Improve only UI formatting and lightweight client-side parsing.
- Preserve copy behavior for raw log content.

## Plan
1. Add client-side log line classification for timestamp, level, stack, and continuation lines.
2. Render logs as readable rows with wrapping, indentation, severity styling, and line numbers.
3. Improve file list and viewer layout density, empty/loading states, and summary metadata.
4. Run TypeScript/build checks and commit atomically.

## Acceptance
- Long log lines wrap instead of forcing horizontal scanning.
- ERROR/WARN/INFO levels are visually distinguishable.
- Stack trace lines are indented and muted without losing content.
- Raw copy still copies original log text.

## Execution Notes
- Extracted log diagnostics into `src/components/settings/LogDiagnosticsCard.tsx` instead of growing `src/app/settings/page.tsx`.
- Added readable log rows with line numbers, severity badges, stack styling, wrapping, and raw-copy behavior.
- Added Electron navigation guards so same-origin app popups route back into the main window and external links open in the system browser.
- Removed Volcengine fallback to localhost `/api/files` URLs because external Volcengine services cannot download local desktop URLs.
