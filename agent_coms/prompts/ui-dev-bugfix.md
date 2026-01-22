# UI Team - Bug Fixing Development Session

## Reference
**Read first:** `./api/agent_coms/dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md`

## Team Configuration
- **Code Reviewer/QA Gate**: Opus 4.5
- **Developers/Bug Fixers**: Sonnet 4.5

## Workflow

1. **Pre-Development** (per checklist P1-P3, A1-A2, D1)
   - Verify contracts exist before coding
   - Check `./api/agent_coms/contracts` for existing endpoints
   - If missing, create message in `./api/agent_coms/messages/` (M1 format)
   - Stay in project directory (D1)

2. **API Coordination**
   - API team monitors `./api/agent_coms/messages/`
   - Poll messages every 3 minutes for responses
   - Wait for confirmation before building against new endpoints (A2)

3. **Development** (per checklist T1-T2, F1, S1, E1)
   - Follow FSD structure (F1)
   - Use correct state management (S1)
   - Apply error handling patterns (E1)
   - Write tests at end of each issue (T1)

4. **Code Review Gate**
   - Submit to QA/Lead (Opus 4.5)
   - Only mark complete if passing review

5. **Version Control** (per checklist C1)
   - Commit after every issue
   - Push when all issues completed

## Issues
[List specific issues here]

## Created
2026-01-20
