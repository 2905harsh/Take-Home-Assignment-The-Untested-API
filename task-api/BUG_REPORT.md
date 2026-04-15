# Bug Report

Three bugs were found during code review and testing of `src/services/taskService.js`.
Bug #2 (pagination) has been fixed. Bugs #1 and #3 are documented below and left
unfixed intentionally per the assignment instructions (fix one bug only).

---

## Bug #1 — `getByStatus` matches substrings (UNFIXED)

**Expected behavior:** `getByStatus('do')` should return an empty array.
Only tasks with status exactly equal to the query string should be returned.

**Actual behavior:** The function uses `t.status.includes(status)`, so partial
strings match incorrectly. Querying `status=do` returns both `todo` and `done`
tasks because `'do'` is a substring of both.

**How I discovered it:** Reading the filter condition in `getByStatus()` and
checking what `.includes()` does vs strict equality on short substrings.

**Where in the code:** `src/services/taskService.js` — `getByStatus` function.

**Fix:** Change `t.status.includes(status)` to `t.status === status`.

---

## Bug #2 — Pagination offset is off by one page (FIXED)

**Expected behavior:** Requesting `page=1&limit=10` should return tasks 1–10
(array indices 0–9).

**Actual behavior:** The original code computed `offset = page * limit`, so
`page=1, limit=10` produced offset 10, skipping the first 10 tasks entirely.
Page 1 returned what should have been page 2.

**How I discovered it:** Analysing the boundary condition for `page=1` in
`getPaginated()` — multiplying page directly by limit means page 1 never
starts at index 0.

**Where in the code:** `src/services/taskService.js` — `getPaginated` function.

**Fix applied:** Changed to `const offset = (page - 1) * limit` so page 1
correctly starts at index 0.

**Tests updated to verify the fix:**
- `taskService.getPaginated()` → "page 1 returns the first set of results"
- `taskService.getPaginated()` → "page 2 returns the next set"  
- `GET /tasks` → "page 1 returns the first batch correctly"
- `GET /tasks` → "page 2 returns the next batch"

These four tests would have failed on the original buggy code and all pass now.

---

## Bug #3 — `completeTask` overwrites priority with 'medium' (UNFIXED)

**Expected behavior:** Marking a task complete should set `status` to `'done'`
and stamp `completedAt`. The task's existing `priority` should be untouched.

**Actual behavior:** The function spreads the task object but then explicitly
sets `priority: 'medium'`, silently overwriting any existing high or low priority.
A high-priority urgent task becomes medium priority the moment it is completed.

**How I discovered it:** Auditing every field in the updated object inside
`completeTask()` and noticing `priority: 'medium'` was hardcoded with no
conditional logic.

**Where in the code:** `src/services/taskService.js` — `completeTask` function.

**Fix:** Remove `priority: 'medium'` from the spread object. Since the task is
already spread with `...task`, the original priority is preserved automatically.

