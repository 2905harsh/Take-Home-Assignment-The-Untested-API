# My Submission

**Candidate:** Harsh Srivastav  
**Fork of:** rohit-ups/Take-Home-Assignment-The-Untested-API

## Where to find everything

All work is inside the `task-api/` folder:

| What | Where |
|------|-------|
| Source code | `task-api/src/` |
| Tests | `task-api/tests/` |
| Bug report | `task-api/BUG_REPORT.md` |
| Submission notes | `task-api/SUBMISSION_NOTES.md` |

## Summary

- **84 tests passing**, 2 test suites, **96.75% statement coverage**
- **3 bugs found** — documented in BUG_REPORT.md
- **Bug #2 fixed** (pagination offset) with 4 tests verifying the fix
- **Bugs #1 and #3 left unfixed** intentionally — marked with `it.failing()`
  in the test suite so broken behaviour is documented, not hidden
- **PATCH /tasks/:id/assign implemented** with full validation and tests

## Test results

\```
Test Suites: 2 passed, 2 total
Tests:       84 passed, 84 total
Coverage:    96.75% statements
\```