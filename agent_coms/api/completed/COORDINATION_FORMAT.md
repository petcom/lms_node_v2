# API Agent Coordination Format Proposal

## Overview

This document defines the message format and workflow for API ↔ UI agent coordination during debugging, testing, and feature implementation.

---

## Directory Structure

```
agent_coms/
├── api/                    # API agent's working folder
│   ├── COORDINATION_FORMAT.md  # This file (format proposal)
│   └── drafts/             # Work-in-progress messages
├── ui/                     # UI agent's working folder  
│   └── *.md               # UI-side documents
└── messages/               # Shared message queue (joint folder)
    ├── ACTIVE_THREADS.md  # Thread tracking index
    └── YYYY-MM-DD_HHmmss_<team>_<type>.md
```

---

## Message File Naming Convention

```
YYYY-MM-DD_HHmmss_<team>_<type>.md
```

**Examples:**
- `2026-01-12_143022_api_request.md`
- `2026-01-12_144530_ui_response.md`
- `2026-01-12_150000_api_complete.md`

**Team:** `api` | `ui`

**Type:**
| Type       | Description                                      |
|------------|--------------------------------------------------|
| `request`  | Requesting action or information from other team |
| `response` | Responding to a request                          |
| `complete` | Signaling task completion, ready for handoff     |
| `error`    | Reporting a blocking error                       |
| `info`     | FYI - no action required                         |
| `waiting`  | Blocked, waiting on other team                   |

---

## Message Template

```markdown
# [TYPE] - Brief Title

| Field       | Value                          |
|-------------|--------------------------------|
| From        | API Agent                      |
| To          | UI Agent                       |
| Timestamp   | YYYY-MM-DD HH:mm:ss            |
| Priority    | low / medium / high / critical |
| Status      | pending / in-progress / blocked / resolved |
| Thread ID   | THR-XXX                        |

---

## Context

<!-- Brief description of current debugging state, what led to this message -->

## Request / Information

<!-- What you need from the UI team OR what you're reporting -->

## API-Specific Details

### Endpoint(s) Affected
| Method | Endpoint              | Status |
|--------|-----------------------|--------|
| POST   | /api/v2/courses/:id   | 500    |
| GET    | /api/v2/users/me      | OK     |

### Request/Response Example
```json
// Request
{
  "field": "value"
}

// Response (actual)
{
  "error": "description"
}

// Response (expected)
{
  "data": {}
}
```

### Relevant Files Changed
- `src/controllers/example.controller.ts` - description
- `src/services/example.service.ts` - description
- `src/routes/example.routes.ts` - description

### Database/Model Changes (if applicable)
- Collection: `collectionName`
- Schema change: description

### Contract Changes (if applicable)
- `contracts/api/example.contract.ts` - added/modified/removed types

---

## Testing Status

| Test Type    | Status  | Notes                    |
|--------------|---------|--------------------------|
| Unit         | ✅ Pass  |                          |
| Integration  | ⚠️ Skip  | Waiting on UI            |
| E2E          | ❌ Fail  | Needs UI verification    |

---

## Action Required

- [ ] Specific task for UI team
- [ ] Another task

## Response Requested
<!-- Check what you need back -->
- [ ] Confirmation of receipt
- [ ] UI testing complete
- [ ] Error reproduction steps
- [ ] Contract review/approval
- [ ] Ready to continue testing

---

## Notes

<!-- Additional context, workarounds, assumptions made -->
```

---

## API Agent Workflow

### Starting a New Debug Session

1. Check `messages/` for unresolved threads or new `ui_*` messages
2. Review `messages/ACTIVE_THREADS.md` for context
3. Draft work in `api/drafts/` if needed
4. Post finalized message to `messages/`

### Initiating Request to UI

1. Create message with Thread ID (new or existing)
2. Include all relevant API context (endpoints, contracts, errors)
3. Post to `messages/` with filename: `YYYY-MM-DD_HHmmss_api_request.md`
4. Update `ACTIVE_THREADS.md`

### Responding to UI Request

1. Read the UI request thoroughly
2. Investigate and implement fixes
3. Post response: `YYYY-MM-DD_HHmmss_api_response.md`
4. Include verification steps for UI to confirm

### Signaling Ready for UI Testing

Use `_waiting.md` or `_complete.md`:

```markdown
# [WAITING] - API Fix Ready for UI Verification

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| To          | UI Agent           |
| Timestamp   | 2026-01-12 15:00:00|
| Thread ID   | THR-003            |
| Status      | blocked            |

## Changes Deployed
- Fixed validation in enrollment controller
- Added null check for session user

## Verification Steps for UI
1. Clear browser cache/session
2. Log in as test user
3. Navigate to course enrollment
4. Attempt enrollment
5. Verify success response

## Expected Behavior
- 200 OK with enrollment confirmation
- User appears in course roster

## Blocked Until
- [ ] UI confirms enrollment flow works
- [ ] UI reports any new errors

## Continue After
Once UI confirms, API will:
- Run full E2E test suite
- Close thread if passing
```

---

## Priority Levels

| Priority   | Response Time | Use Case                           |
|------------|---------------|------------------------------------|
| critical   | Immediate     | Production issue, system down      |
| high       | < 30 min      | Test suite blocked, demo prep      |
| medium     | < 2 hours     | Normal development flow            |
| low        | Next session  | Refactoring, documentation         |

---

## Thread ID Convention

Format: `THR-XXX` where XXX is sequential number

**Categories (optional prefix):**
- `THR-AUTH-XXX` - Authentication/authorization issues
- `THR-ENRL-XXX` - Enrollment issues
- `THR-CRSE-XXX` - Course management issues
- `THR-USER-XXX` - User management issues
- `THR-DATA-XXX` - Data/contract sync issues

---

## Contract Sync Protocol

When API changes require UI updates:

```markdown
# [REQUEST] - Contract Update Required

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| To          | UI Agent           |
| Timestamp   | 2026-01-12 16:00:00|
| Priority    | high               |
| Thread ID   | THR-DATA-001       |

## Contract Changes

### File: `contracts/api/courses.contract.ts`

#### Added Types
```typescript
export interface CourseEnrollmentStatus {
  enrolled: boolean;
  enrollmentDate?: string;
  completionPercentage: number;
}
```

#### Modified Types
```typescript
// Before
export interface Course {
  id: string;
  name: string;
}

// After
export interface Course {
  id: string;
  name: string;
  enrollmentStatus?: CourseEnrollmentStatus; // NEW
}
```

#### Removed Types
- `OldTypeName` - replaced by `NewTypeName`

## Breaking Changes
- [ ] Yes - requires UI code changes
- [x] No - backward compatible

## Migration Steps
1. Update shared contracts: `npm run sync:contracts`
2. Update UI types from contract
3. Handle optional `enrollmentStatus` field

## Action Required
- [ ] UI acknowledges contract change
- [ ] UI implements required updates
- [ ] UI confirms tests passing
```

---

## Error Reporting Template

For detailed error handoff:

```markdown
# [ERROR] - Error Title

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| To          | UI Agent           |
| Timestamp   | 2026-01-12 17:00:00|
| Priority    | critical           |
| Thread ID   | THR-XXX            |

## Error Summary
Brief one-line description

## Environment
- Node version: 18.x
- Database: MongoDB 6.x
- Branch: `feature/xyz`
- Last working commit: `abc1234`

## Full Error
```
Error: Detailed error message
    at Function.xyz (/path/to/file.ts:123:45)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
```

## Reproduction Steps (API side)
1. Step one
2. Step two
3. Error occurs

## What UI Should Check
- [ ] Request payload format
- [ ] Auth token presence/validity
- [ ] Specific UI state that triggers this

## API Investigation Done
- [x] Checked database connection
- [x] Validated middleware chain
- [ ] Needs UI request sample

## Suspected Cause
My hypothesis is...

## Temporary Workaround
If applicable, describe workaround
```

---

## API Agent Checklist

Before posting any message:
- [ ] Thread ID assigned/referenced
- [ ] All affected endpoints listed
- [ ] Contract file paths included (if relevant)
- [ ] Clear action items with checkboxes
- [ ] Response type requested specified
- [ ] Timestamp in filename matches content

When responding to UI:
- [ ] Referenced their Thread ID
- [ ] Addressed all their action items
- [ ] Included verification steps
- [ ] Specified what signals completion

---

## Integration with Testing Workflow

### Pre-Test Coordination
```markdown
# [INFO] - Starting E2E Test Suite

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| To          | UI Agent           |
| Timestamp   | 2026-01-12 10:00:00|
| Priority    | medium             |

## Test Plan
Running full E2E suite against endpoints:
- POST /api/v2/auth/login
- GET /api/v2/users/me
- POST /api/v2/courses/:id/enroll

## UI State Required
- Test user credentials: test@example.com / password
- Expected UI state: logged out, clean session

## Will Report
- Pass/fail status
- Any failures requiring UI investigation
```

### Post-Test Report
```markdown
# [COMPLETE] - E2E Test Results

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| Timestamp   | 2026-01-12 11:00:00|
| Thread ID   | THR-TEST-001       |

## Results Summary
- Total: 25 tests
- Passed: 23
- Failed: 2
- Skipped: 0

## Failed Tests
1. `enrollment.e2e.spec.ts` - Line 45
   - Error: Expected 200, got 401
   - Needs: UI to verify token refresh
   
2. `courses.e2e.spec.ts` - Line 89
   - Error: Timeout waiting for response
   - Needs: Investigation

## Action Required
- [ ] UI investigate token refresh
- [ ] API will debug timeout issue

## Next Steps
Will re-run suite after fixes confirmed
```

---

## Notes for API Agent

- Always check `messages/` folder before starting new work
- Use `grep` or file search to find related Thread IDs
- Keep contract changes synchronized - UI depends on them
- When blocked, post a `_waiting.md` and pause until UI responds
- Include runnable curl commands when helpful for UI testing
- Reference specific line numbers in error traces
- Update `ACTIVE_THREADS.md` when opening/closing threads
