---
name: Google Sheets Sync — History Preservation
description: Key bugs and fixes around syncing application history to Google Sheets without data loss.
type: project
---

History is stored as JSON in sheet column R. A prior migration bug produced malformed JSON (`"from":"bookmarked,"to":"applied"` — missing closing quote), causing silent parse failures that blanked existing history on the next write.

**Fix applied in `src/utils/sheet-mapper.ts`:**
- `parseHistory` repairs the malformed pattern via regex before `JSON.parse`
- `applicationToRow` only writes history if `(app.history ?? []).length > 0`, otherwise writes `""`

**`src/services/storage/google-sheets-service.ts`:**
- `writeAll` uses `valueInputOption: "RAW"` (not `"USER_ENTERED"`) to prevent Sheets from interpreting JSON values

**`src/providers/application-provider.tsx`:**
- Uses `isLoadingRef` to block sync from running during the initial load phase, preventing a race where an empty-history state writes over freshly loaded data

**How to apply:** When touching sync or sheet write logic, verify these invariants hold. Never change `valueInputOption` back to `USER_ENTERED` for the history column.
