# Prompt Naming Convention

## Format
```
{team}-{purpose}-{scope}.md
```

## Components

| Component | Values | Description |
|-----------|--------|-------------|
| team | `ui`, `api`, `shared` | Which team uses this prompt |
| purpose | `dev`, `review`, `handler`, `monitor` | What the prompt does |
| scope | `bugfix`, `feature`, `message`, `issue` | What it operates on |

## Examples

| Filename | Description |
|----------|-------------|
| `ui-dev-bugfix.md` | UI team development session for bug fixes |
| `ui-dev-feature.md` | UI team development session for new features |
| `api-handler-message.md` | API team handler for incoming messages |
| `shared-review-pr.md` | Shared prompt for PR reviews |

## Directory Structure
```
prompts/
  NAMING_CONVENTION.md
  ui-dev-bugfix.md
  ui-dev-feature.md
  api/
    api-handler-message.md
```
