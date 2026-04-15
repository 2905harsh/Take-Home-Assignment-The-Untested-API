# Bug Report

During the inspection of `src/services/taskService.js`, the following bugs were found:

## Bug 1: Pagination skip offset error
- **Expected behavior:** When a user requests `page=1`, the API should return the first `limit` number of tasks (e.g. index 0 to 9 if limit is 10).
- **Actual behavior:** The `taskService.getPaginated` function computes `offset = page * limit`. If `page=1` and `limit=10`, the offset is 10, skipping the first 10 items.
- **How I discovered it:** Reading the code in `getPaginated` and analyzing the boundary condition for `page=1` logic.
- **Fix:** Update the logic to be 1-based indexed: `const offset = (page - 1) * limit;`. *(Note: this has been fixed in this submission)*

## Bug 2: `completeTask` overwrites priority
- **Expected behavior:** Marking a task as complete should update its status to `done` and its `completedAt` timestamp, while retaining its current `priority`.
- **Actual behavior:** The `taskService.completeTask` function contains a hardcoded update to `priority: 'medium'`, erasing any existing high or low priority.
- **How I discovered it:** Auditing the code modification section inside `completeTask(id)`.
- **Fix:** Remove `priority: 'medium'` from the updated properties in `completeTask`.

## Bug 3: `getByStatus` matches substrings broadly
- **Expected behavior:** Querying tasks with `status=do` should result in an empty list or error out, but `status=done` should return `done` tasks.
- **Actual behavior:** The `taskService.getByStatus` uses `t.status.includes(status)`. This means that passing `status=do` will match both `todo` and `done` statuses since `do` is a substring of both.
- **How I discovered it:** Scanning the filter condition inside `getByStatus`, checking the string usage vs exact matches.
- **Fix:** Change the check to strict equality: `t.status === status`.
