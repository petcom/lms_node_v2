# API Team - Message Handler

## Reference
**Shared guidance:** `./api/agent_coms/dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md`
(Core principle applies: ideal patterns over compatibility)

## Purpose
Monitor `./api/agent_coms/messages/` for UI team requests and handle API work.

## Workflow

### On Message Receipt
1. **Analyze** UI team request
2. **Check existing endpoints** - respond with those if adequate
3. **Design API changes** if new work needed:
   - Ideal API structure (no backwards compatibility hacks)
   - Ideal data structure
   - Clean patterns over quick fixes
4. **Create API issues** for required work

### Team Structure
- **1x Opus 4.5** - QA/Supervisor/Code Gate
- **Nx Sonnet 4.5** - Developers (parallelize as appropriate)

### Response
When complete, respond in `./api/agent_coms/messages/` using M1 format from checklist.

### Uncertainty Threshold
Ask user for clarity when **<55% confident** solution meets UI needs.

## Polling
Poll messages directory every 2 minutes.
