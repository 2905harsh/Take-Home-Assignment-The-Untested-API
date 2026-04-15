# Submission Notes

 ## Bug Fixed — Bug #2: Pagination offset (one-page skip)

The assignment asked to fix one bug. I chose Bug #2 (pagination offset) because
it was the most impactful — every single paginated request returned the wrong
data silently, with no error to indicate something was wrong. Users on page 1
were always seeing page 2's data.

**The fix:** Changed `offset = page * limit` to `offset = (page - 1) * limit`
in `taskService.getPaginated()`. One line, but it corrects all pagination.

**Tests that now pass because of this fix:**
- `taskService.getPaginated()` → "page 1 returns the first set of results"
- `taskService.getPaginated()` → "page 2 returns the next set"
- `GET /tasks` → "page 1 returns the first batch correctly"
- `GET /tasks` → "page 2 returns the next batch"

Bugs #1 and #3 are intentionally left unfixed per the assignment instructions.
Their tests are marked `it.failing()` in `tasks.test.js` so the suite documents
known broken behaviour without hiding it.

---

## PATCH /tasks/:id/assign — Design Decisions

**Empty string validation:**
An empty or whitespace-only string is rejected with 400. A name like `"   "`
has no meaning as an assignee — it would show up blank in any UI and make
filtering/searching by assignee impossible. Rejecting it early is cleaner than
storing garbage data.

**What if the task is already assigned?**
Reassignment is allowed freely. I decided against blocking it because:
- Task ownership legitimately transfers (handoffs, team changes)
- There's no authentication layer yet, so "protecting" assignment is meaningless
- If reassignment needs to be restricted later, that belongs in an auth/permissions
  layer, not in the task service itself

**Unassigning:**
Passing `null` explicitly unassigns the task (`assignee` goes back to `null`).
This is different from omitting the field — omitting `assignee` entirely returns
400, because it's ambiguous whether the caller forgot the field or intended
to clear it.

**Type validation:**
`assignee` must be a string or null. Numbers, booleans, and objects are rejected
with 400 — they would silently store as non-string values which breaks any
downstream string operations (trim, display, search).

**Whitespace trimming:**
`"  Alice  "` is stored as `"Alice"`. Trailing/leading whitespace is almost
always a UI artifact, not intentional. Trimming prevents duplicate-looking
assignees that are actually the same person.

---

## What I'd Test Next With More Time

- Concurrent operations on the in-memory store — two simultaneous updates to
  the same task could produce inconsistent state
- Date edge cases — leap years, timezone offsets, DST boundaries in overdue
  calculation
- Pagination with very large datasets — array slicing is fine for hundreds of
  tasks but worth load testing
- Input length limits — what happens with a 10,000 character title or assignee name?
- The error handler middleware in `app.js` (lines 10–11, 17–18 are currently
  uncovered) — need to simulate a thrown error inside a route handler to hit it

---

## Anything That Surprised Me in the Codebase

Two things stood out.

First, `completeTask` silently overwrote `priority` with `'medium'` on every
completion. There's no scenario where marking something done should change its
urgency — this looked like an accidental leftover from a copy-paste, not
intentional design. It's dangerous because it degrades data silently.

Second, the README documents task status values as `pending | in-progress |
completed` but the actual code enforces `todo | in_progress | done`. These are
completely different strings. Any frontend built from the README would send
`status=pending` and get zero results back with no error — it would just look
like there are no tasks.

---

## Questions Before Shipping to Production

1. **Status enum mismatch** — the README says `pending | in-progress | completed`
   but the code uses `todo | in_progress | done`. Which is the intended contract?
   Any client built from the docs is currently broken.

2. **Persistence** — the in-memory store resets on every server restart. All
   task data is lost on every deploy. What is the intended database?

3. **Authentication and ownership** — anyone can update, delete, or reassign
   any task. Should `assign` be restricted to task owners or certain roles?
   Should `GET /tasks` be scoped to the authenticated user's tasks only?

4. **Pagination by default** — `GET /tasks` with no params returns every task
   with no limit. At scale this is a performance and payload problem. Should
   a default limit be enforced?

5. **Overdue definition** — currently a task is overdue if `dueDate < now` and
   `status !== done`. Should `in_progress` tasks past their due date be treated
   differently from `todo` tasks? The distinction might matter for reporting.
