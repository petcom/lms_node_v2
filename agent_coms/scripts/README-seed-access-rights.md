# Seed Access Rights Script

## Overview

The `seed-access-rights.ts` script creates comprehensive access rights in the AccessRight collection. This script is **idempotent** - it can be run multiple times safely as it uses upsert operations to avoid duplicates.

## Purpose

This script implements **Phase 2, Task 2.2** from the Role System V2 implementation plan:
- Seeds all access rights to the AccessRight collection
- Organizes rights by domain (content, enrollment, staff, learner, reports, system, billing, audit, grades)
- Marks sensitive rights appropriately (FERPA, billing, PII, audit)
- Includes comprehensive access rights from spec sections 5.2 and 5.3

## Access Right Pattern

All access rights follow the pattern: `{domain}:{resource}:{action}`

### Domains

| Domain | Description | Examples |
|--------|-------------|----------|
| `content` | Courses, programs, lessons, SCORM | content:courses:read, content:lessons:manage |
| `enrollment` | Enrollments, class enrollments | enrollment:own:read, enrollment:department:manage |
| `staff` | Staff management | staff:department:manage, staff:roles:assign |
| `learner` | Learner management | learner:profile:read, learner:department:manage |
| `grades` | Grade management | grades:own:read, grades:own-classes:manage |
| `reports` | Analytics and reporting | reports:class:read, reports:financial:export |
| `system` | System settings and configuration | system:themes:manage, system:branding:manage |
| `billing` | Financial operations | billing:invoices:manage, billing:payments:read |
| `audit` | Audit logs | audit:logs:read, audit:security:read |

### Actions

Common actions include:
- `read` / `view` - Read access
- `create` - Create new records
- `update` / `edit` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD operations
- `export` - Export data

### Wildcard Rights

System administrators have wildcard rights for full domain access:
- `system:*` - Full system access (all permissions)
- `content:*` - Full content domain access
- `enrollment:*` - Full enrollment domain access
- `staff:*` - Full staff domain access
- `learner:*` - Full learner domain access
- `reports:*` - Full reports domain access
- `billing:*` - Full billing domain access
- `audit:*` - Full audit domain access
- `grades:*` - Full grades domain access

## Sensitive Rights

The script automatically marks sensitive rights with appropriate categories:

| Category | Description | Example Rights |
|----------|-------------|----------------|
| `ferpa` | FERPA-protected educational records | learner:grades:read, learner:transcripts:export |
| `billing` | Financial and payment information | billing:payments:read, billing:refunds:manage |
| `pii` | Personally Identifiable Information | learner:contact:read, learner:emergency:read |
| `audit` | Security and audit information | audit:logs:read, audit:security:read |

## Usage

### Basic Usage

```bash
# Using npm script (recommended)
npm run seed:access-rights

# Using ts-node directly
npx ts-node --transpile-only scripts/seed-access-rights.ts

# Using ts-node with tsconfig-paths
npx ts-node --transpile-only -r tsconfig-paths/register scripts/seed-access-rights.ts
```

### Environment Variables

The script uses the following environment variables (with defaults):

```bash
DB_URI=mongodb://localhost:27017/lms_mock    # Database connection string
MONGODB_URI=mongodb://localhost:27017/lms_mock  # Alternative variable name
```

## Script Features

### 1. Idempotent Operation

The script uses upsert operations to ensure it can be run multiple times safely:
- **Create**: New access rights are created
- **Update**: Existing rights are updated if description or sensitivity changed
- **Skip**: Unchanged rights are skipped

### 2. Comprehensive Access Rights

The script seeds **152 access rights** covering:
- 38 content rights (courses, lessons, exams, programs, SCORM, classes, templates)
- 17 enrollment rights (own, department, system, bulk, policies, class)
- 11 staff rights (profile, department, roles, system)
- 20 learner rights (profile, department, progress, certificates, PII, grades, transcripts)
- 8 grades rights (own, department, own-classes, system)
- 20 reports rights (own, class, department, content, enrollment, billing, financial, PII)
- 12 system rights (settings, themes, branding, emails, integrations, notifications)
- 20 billing rights (own, department, invoices, payments, refunds, system, policies)
- 6 audit rights (logs, security, compliance, system)

### 3. Role Analysis

The script includes a helper function `generateAccessRightsFromRoles()` that:
- Analyzes existing RoleDefinition documents
- Extracts all unique access rights referenced by roles
- Checks which rights exist in the AccessRight collection
- Reports any missing rights

This helps ensure all rights referenced by roles are properly defined.

### 4. Statistics

After seeding, the script displays detailed statistics:
- Access rights count by domain
- Sensitive rights count
- Breakdown by sensitive category
- Total active rights

## Output Example

```
╔══════════════════════════════════════════╗
║  LMS V2 - Seed Access Rights Script     ║
╚══════════════════════════════════════════╝

🔌 Connecting to database...
  ✓ Connected to mongodb://localhost:27017/lms_mock

📋 Seeding access rights...
  Processing regular access rights...
    ✓ Created: content:courses:read
    ✓ Created: content:courses:create
    ...

  Processing wildcard access rights...
    ✓ Created: system:*
    ✓ Created: content:*
    ...

  Summary:
    Created:  152
    Updated:  0
    Skipped:  0
    Errors:   0
    Total:    152

🔍 Analyzing role definitions...
  Found 12 active roles
  Total access rights in roles: 87
  Unique access rights: 52

  Checking AccessRight collection...

  Analysis complete:
    Existing in DB: 52
    Missing in DB:  0

📊 Access Rights Statistics:

  By Domain:
    audit           6 rights
    billing         20 rights
    content         38 rights
    enrollment      17 rights
    grades          8 rights
    learner         20 rights
    reports         20 rights
    staff           11 rights
    system          12 rights

  Sensitive Rights: 49

  By Sensitive Category:
    audit           7 rights
    billing         24 rights
    ferpa           13 rights
    pii             5 rights

  Total Active Rights: 152

╔══════════════════════════════════════════╗
║  Seed Complete!                          ║
╚══════════════════════════════════════════╝

🔌 Disconnected from database
```

## Integration with Other Scripts

### Recommended Seeding Order

1. **First**: Run `seed-admin.ts` to create master department and admin user
2. **Then**: Run `seed-access-rights.ts` to populate access rights
3. **Optional**: The `seed-admin.ts` script already seeds basic role definitions

### Relationship to Role Definitions

Access rights are referenced by RoleDefinition documents:
- Each role has an `accessRights` array containing access right names
- The AccessRight collection stores the definitions of these rights
- The `generateAccessRightsFromRoles()` function helps verify consistency

## Data Organization

### Access Rights by Role

The script defines access rights that map to the roles defined in the system:

#### Learner Roles
- **course-taker**: 10 rights (content read, own enrollment, own progress)
- **auditor**: 3 rights (view-only access)
- **learner-supervisor**: 9 rights (elevated learner + department visibility)

#### Staff Roles
- **instructor**: 10 rights (class management, grading)
- **content-admin**: 6 rights (course/program/content management)
- **department-admin**: 8 rights (department operations, staff, settings)
- **billing-admin**: 5 rights (department billing operations)

#### Global Admin Roles
- **system-admin**: 1 right (`system:*` - full access)
- **enrollment-admin**: 4 rights (enrollment system management)
- **course-admin**: 4 rights (course system management)
- **theme-admin**: 3 rights (themes, branding, emails)
- **financial-admin**: 6 rights (system-wide financial operations)

## Error Handling

The script includes comprehensive error handling:
- Database connection errors exit with code 1
- Individual right creation errors are logged but don't stop the script
- Error count is included in the summary
- The script always disconnects from the database on completion

## Maintenance

### Adding New Access Rights

To add new access rights:

1. Add the right definition to the `ACCESS_RIGHTS` array:
```typescript
{
  domain: 'content',
  resource: 'videos',
  action: 'upload',
  description: 'Upload video content',
  isSensitive: false
}
```

2. Run the script - new rights will be created automatically

3. Update RoleDefinition documents to include the new right if needed

### Updating Existing Rights

To update access rights:

1. Modify the description or sensitivity in the `ACCESS_RIGHTS` array
2. Run the script - changed rights will be updated automatically
3. The script compares existing values and only updates if different

### Adding New Domains

To add a new domain:

1. Update `ACCESS_RIGHT_DOMAINS` in `/src/models/AccessRight.model.ts`
2. Add rights for the new domain to the `ACCESS_RIGHTS` array
3. Optionally add a wildcard right to `WILDCARD_RIGHTS`
4. Run the script to seed the new rights

## Exported Functions

The script exports several functions for programmatic use:

```typescript
import {
  ACCESS_RIGHTS,
  WILDCARD_RIGHTS,
  upsertAccessRight,
  seedAccessRights,
  generateAccessRightsFromRoles
} from './scripts/seed-access-rights';

// Use in other scripts or tests
await seedAccessRights();
await generateAccessRightsFromRoles();
```

## References

- **Spec Reference**: `devdocs/Role_System_API_Model_Plan_V2.md` sections 4.8, 5.2, and 5.3
- **Model Definition**: `src/models/AccessRight.model.ts`
- **Role Definitions**: `src/models/RoleDefinition.model.ts`
- **Related Scripts**:
  - `scripts/seed-admin.ts` - Creates admin user and seeds role definitions
  - `scripts/seed-roles.ts` - Alternative role seeding (if exists)

## Troubleshooting

### Connection Errors

If you get database connection errors:
```bash
# Set the correct database URI
export DB_URI=mongodb://localhost:27017/lms_mock
npm run seed:access-rights
```

### Duplicate Key Errors

If you get duplicate key errors, the collection may have existing data with conflicts:
```bash
# Check existing rights
npx mongosh mongodb://localhost:27017/lms_mock --eval "db.accessrights.find().limit(5)"

# Optionally clear and reseed
npx mongosh mongodb://localhost:27017/lms_mock --eval "db.accessrights.deleteMany({})"
npm run seed:access-rights
```

### TypeScript Errors

The script uses `--transpile-only` flag to skip type checking. If you need full type checking:
```bash
# Run TypeScript compiler first
npm run type-check

# Then run the script
npm run seed:access-rights
```

## Testing

To verify the script worked correctly:

```bash
# Connect to MongoDB
npx mongosh mongodb://localhost:27017/lms_mock

# Check total count
db.accessrights.countDocuments()
# Expected: 152

# Check by domain
db.accessrights.aggregate([
  { $group: { _id: "$domain", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

# Check sensitive rights
db.accessrights.countDocuments({ isSensitive: true })
# Expected: 49

# Check specific right
db.accessrights.findOne({ name: "content:courses:read" })

# Check wildcard rights
db.accessrights.find({ resource: "*" })
# Expected: 9 documents
```

## License

Part of the LMS V2 project.
