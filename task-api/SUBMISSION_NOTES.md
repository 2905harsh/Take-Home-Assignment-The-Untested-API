# Submission Notes

**What I'd test next if I had more time:**
Given more time, I would test concurrent operations to ensure there's no race condition while updating tasks in the in-memory array. I would also add more comprehensive boundary testing for date formats (e.g. leap years, different time zones) and test pagination logic with massive amounts of tasks to see if array slicing impacts performance.

**Anything that surprised me in the codebase:**
I was surprised that the `completeTask` function forcefully overwrites the task `priority` to `'medium'`. The implicit assumption there seemed incorrect given the context of a general task system keeping priorities intact until explicitly changed. Also, using `.includes(status)` for filtering statuses unexpectedly treats sub-strings as matches (e.g. `status=do` would wrongly match `todo` and `done`).

**Any questions I'd ask before shipping this to production:**
1. What does our persistence and database schema look like, as the current in-memory store doesn't scale horizontally and restarts erase all user data?
2. Are there any intended authentication or authorization checks needed before any user can create, update, or assign tasks?
3. In case of massive response body sizes, should we implement pagination on the default `GET /tasks` request instead of returning everything?
